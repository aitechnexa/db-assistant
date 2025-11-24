from typing import TypedDict
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from ..config.settings import settings
import re


SQL_SYSTEM_PROMPT = """You are DBAssistant, an assistant that reads a provided database schema and produces precise, auditable actions to satisfy user questions. Always follow these rules:

1) Output only valid JSON with the keys exactly as specified below. Do not include extra text.
2) Keys:
   - "action": one of ["SQL", "TOOL_SEARCH", "ANSWER", "CLARIFY"]
   - "sql": string (present if action == "SQL")
   - "tools": list of tool calls (present if action == "TOOL_SEARCH")
   - "answer": string (present if action == "ANSWER")
   - "clarify": string (present if action == "CLARIFY")
   - "explain": short string explaining reasoning in 1-2 sentences.
3) When returning SQL:
   - Use only tables and columns listed in the schema below.
   - Limit rows using `LIMIT 100` unless the question explicitly asks for full export.
   - Avoid `DELETE`, `UPDATE`, `DROP` — only `SELECT` is allowed.
4) When uncertain about user intent or ambiguous fields produce action "CLARIFY" and ask a single simple question.
5) If the question can be answered from metadata alone (counts, column names), use "ANSWER".
6) Keep SQL and tool calls minimal and auditable.

**CURRENT DATE/TIME CONTEXT:**
- Today's date: {current_date}
- Current year: {current_year}
- Current month: {current_month}

**CRITICAL - Temporal Reasoning (BE DECISIVE, NOT CAUTIOUS):**
When users mention time periods, ALWAYS use reasonable defaults. DO NOT ask for clarification unless truly impossible to infer:

**Month without year mentioned:**
- "in October", "October sales", "how much in October" → Use October {current_year}
- If it's currently November 2025 and user says "in October" → Use October 2025 (just last month)
- If it's currently March 2025 and user says "in December" → Use December 2024 (most recent)

**Time references:**
- "last month" → Calculate based on {current_date} automatically
- "this month" → Use {current_month} {current_year}
- "this year" → Use {current_year}
- "recent" / "recently" → Default to last 30 days from {current_date}

**When to use CLARIFY (RARELY):**
- ONLY if time period is genuinely ambiguous like: "a while ago", "some time back", "in the past"
- DO NOT CLARIFY for: "in October", "last month", "recent", "this year" - JUST USE REASONABLE DEFAULTS

**Rule:** Prefer generating SQL with reasonable date assumptions over asking for clarification.


**CRITICAL - Business Terminology Understanding**:
Pay special attention to the ROLE of people mentioned in queries:

**When someone SELLS/SOLD something:**
- They are the SELLER/SALESPERSON/EMPLOYEE/USER who made the sale
- Look for columns like: salesperson_name, employee_name, user_name, seller_name, sales_rep, created_by, sold_by

**When someone BUYS/BOUGHT/PURCHASED something:**
- They are the CUSTOMER/BUYER who purchased
- Look for columns like: customer_name, buyer_name, client_name

**CRITICAL - DATETIME vs DATE Handling:**
When comparing DATE values with DATETIME columns (e.g., invoice_date, created_at, order_date):
- ❌ WRONG: `WHERE invoice_date = '2025-11-22'` (fails because DATETIME includes time)
- ✅ CORRECT Option 1: `WHERE DATE(invoice_date) = '2025-11-22'` (extract date part)
- ✅ CORRECT Option 2: `WHERE invoice_date >= '2025-11-22' AND invoice_date < '2025-11-23'` (use range)

**For "today", "yesterday", "specific date" queries:**
- Use DATE() function or date ranges when column is DATETIME type
- Example: "sales for yesterday" → `WHERE DATE(invoice_date) = '2025-11-22'`
- Example: "sales on Nov 22" → `WHERE DATE(created_at) = '2025-11-22'`

**CRITICAL - Revenue vs Expenses:**
- "how much X makes/made/earned" → REVENUE/SALES/INCOME → Use Invoices, Sales, Orders, Revenue tables
- "how much X spent/spend" → EXPENSES/COSTS → Use Expenses, Costs, Purchases tables

**CRITICAL - Fuzzy Matching (Database Type: {db_type})**:
When searching for names, products, or text values using partial matches:

**For PostgreSQL databases:**
- Use ILIKE for case-insensitive matching
- Example: WHERE name ILIKE '%azka%'

**For MySQL databases:**
- Use LIKE for pattern matching (case-insensitive by default in MySQL)
- Example: WHERE name LIKE '%azka%'

**For SQLite databases:**
- Use LIKE for pattern matching
- Example: WHERE name LIKE '%azka%'

**CRITICAL - Subquery Handling:**
- ✅ CORRECT: `WHERE user_id IN (SELECT user_id FROM Users WHERE name LIKE '%azka%')`
- ❌ WRONG: `WHERE user_id = (SELECT user_id FROM Users WHERE name LIKE '%azka%')`

Database Schema:
{schema}
"""

class AgentState(TypedDict):
    question: str
    schema: str
    sql_query: str
    results: dict
    answer: str
    summary: str
    error: str
    use_deep_think: bool
    refined_question: str
    reasoning: str
    conversation_history: list  # List of previous messages for context
    db_type: str  # Database type: 'postgresql', 'mysql', or 'sqlite'
    needs_clarification: bool  # Whether query is ambiguous
    clarification_options: list  # List of clarification choices

class LangGraphService:
    """Service for LangGraph AI operations"""
    
    _llm = None
    _deep_think_llm = None
    _graph = None
    
    @staticmethod
    def _parse_json_response(response_text: str) -> dict:
        """Safely parse JSON response from LLM"""
        try:
            # Try to parse as JSON
            import json
            return json.loads(response_text)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            import re
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group(1))
                except json.JSONDecodeError:
                    pass
            
            # If still fails, try to find any JSON object in the text
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group(0))
                except json.JSONDecodeError:
                    pass
            
            # Return error structure
            return {
                "action": "SQL",
                "sql": "",
                "explain": f"Failed to parse JSON response: {response_text[:100]}...",
                "error": "JSON parsing failed"
            }
    
    @classmethod
    def _initialize(cls):
        """Initialize LangGraph components"""
        if cls._llm is None:
            cls._llm = ChatOpenAI(
                model=settings.OPENAI_MODEL,
                temperature=0,
                api_key=settings.OPENAI_API_KEY
            )
            cls._deep_think_llm = ChatOpenAI(
                model=settings.OPENAI_REASONING_MODEL,
                temperature=1,
                api_key=settings.OPENAI_API_KEY
            )
            cls._graph = cls._build_graph()
    
    @classmethod
    def _build_graph(cls) -> StateGraph:
        """Build LangGraph workflow"""
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("deep_think", cls._deep_think_node)
        workflow.add_node("generate_sql", cls._generate_sql_node)
        workflow.add_node("generate_answer", cls._generate_answer_node)
        workflow.add_node("generate_summary", cls._generate_summary_node)
        
        # Add conditional edges
        workflow.set_entry_point("deep_think")
        workflow.add_edge("deep_think", "generate_sql")
        workflow.add_edge("generate_sql", "generate_answer")
        workflow.add_edge("generate_answer", "generate_summary")
        workflow.add_edge("generate_summary", END)
        
        return workflow.compile()
    
    @classmethod
    def _deep_think_node(cls, state: AgentState) -> AgentState:
        """Deep thinking preprocessing to understand user intent and database structure"""
        if not state.get("use_deep_think", False):
            # Skip deep thinking if not enabled
            state["refined_question"] = state["question"]
            return state
        
        # Format conversation history
        history_text = ""
        if state.get("conversation_history"):
            history_text = "\n\nConversation History:\n"
            for msg in state["conversation_history"][-6:]:  # Last 3 exchanges (6 messages)
                role = msg.get("role", "user")
                content = msg.get("content", "")
                history_text += f"{role.upper()}: {content}\n"
        
        # Note: o1 models don't support system messages, only user messages
        prompt = ChatPromptTemplate.from_messages([
            ("user", """You are an expert database analyst with deep understanding of business terminology and database structures.

Your task is to analyze the user's natural language question and the database schema to:
1. Review the conversation history to understand the context of follow-up questions
2. Understand what the user REALLY wants (they may not know exact column names or technical terms)
3. **CRITICAL - Understand Business Roles and Context**:
   - When someone "sells" or "sold" something → they are the SALESPERSON/SELLER/EMPLOYEE (NOT the customer)
   - When someone "buys" or "bought" something → they are the CUSTOMER/BUYER (NOT the salesperson)
   - "how much did X sell?" → X is likely a salesperson, look for employee/salesperson/user columns
   - "what did X buy?" → X is likely a customer, look for customer columns
   - "top sellers" → sales staff who made sales
   - "top customers" → buyers who purchased
   
   **CRITICAL - Revenue vs Expenses:**
   - "how much X makes/made/earned" → REVENUE/SALES → Use Invoices, Sales, Orders tables (money IN)
   - "how much X spent/spend" → EXPENSES/COSTS → Use Expenses, Costs tables (money OUT)
   - "earnings", "revenue", "sales" = Invoices/Sales tables
   - "expenses", "costs", "spending" = Expenses tables
   - Example: "how much azka makes in october?" → Use Invoices/Sales table to find azka's sales revenue
4. Map business/casual terms to actual database columns and tables
5. Identify relationships between tables that might be needed
6. **Handle partial/fuzzy name searches**: When user mentions a partial name (e.g., "azka", "john"), identify that this likely needs fuzzy matching in the query, not exact matching
7. Clarify any ambiguities in the question
8. Reformulate the question with precise technical terms that match the schema

For example:
- "how much did azka sell?" → Find SALESPERSON/USER named 'azka' (NOT customer), calculate their sales
- "sales person" might map to "salesperson_name" or "employee" table  
- "profit" might need calculation from "revenue - cost" columns
- "this month" needs to be translated to date filters
- "product ABC" might be in "product_name" or "product_code" column
- "who is the second?" in context of previous "top salesperson" question means "second highest salesperson"
- **"john's sales"** should match any SALESPERSON name containing "john" (fuzzy match needed)

Database Schema:
{schema}
{history}
Original Question: {question}

**IMPORTANT - Ambiguity Detection:**
If the question is ambiguous or could be interpreted multiple ways, respond ONLY with:
"CLARIFICATION_NEEDED: [option1] | [option2] | [option3]"

Ambiguous scenarios include:
- Multiple tables could match (e.g., "sales" could be sales_2023, sales_archive, sales_summary)
- Time period unclear ("recent", "this period", "lately" without context)
- Aggregation method ambiguous (should we SUM, AVG, COUNT, MAX?)
- Multiple similar column names exist

Otherwise, provide a refined, technically precise question that uses exact column and table names from the schema.
When partial names are mentioned, explicitly note that fuzzy matching is needed.
Only output the refined question or clarification request, nothing else.""")
        ])
        
        try:
            print(f"🧠 Deep thinking about: {state['question']}")
            
            response = cls._deep_think_llm.invoke(
                prompt.format_messages(
                    schema=state["schema"],
                    question=state["question"],
                    history=history_text
                )
            )
            
            refined_question = response.content.strip()
            print(f"💡 Refined question:  {refined_question}")
            
            # Check if clarification is needed
            if refined_question.startswith("CLARIFICATION_NEEDED:"):
                # Parse clarification options
                options_text = refined_question.replace("CLARIFICATION_NEEDED:", "").strip()
                options = [opt.strip() for opt in options_text.split("|") if opt.strip()]
                
                print(f"❓ Clarification needed - {len(options)} options provided")
                state["needs_clarification"] = True
                state["clarification_options"] = options
                state["refined_question"] = state["question"]  # Keep original
                return state
            
            # Extract reasoning/thinking process from response metadata if available
            reasoning = ""
            if hasattr(response, 'response_metadata'):
                # o1 models may include reasoning in response metadata or usage stats
                metadata = response.response_metadata
                if 'reasoning' in metadata:
                    reasoning = metadata['reasoning']
                elif 'usage' in metadata and 'completion_tokens_details' in metadata['usage']:
                    # o1 models show reasoning tokens
                    details = metadata['usage']['completion_tokens_details']
                    if 'reasoning_tokens' in details and details['reasoning_tokens'] > 0:
                        reasoning = f"🧠 Reasoning tokens used: {details['reasoning_tokens']}\n\nThe AI performed deep chain-of-thought reasoning to understand your question and map it to the database schema."
            
            state["refined_question"] = refined_question
            state["reasoning"] = reasoning
            state["error"] = ""
            
        except Exception as e:
            print(f"⚠️  Deep thinking failed, using original question: {str(e)}")
            state["refined_question"] = state["question"]
            state["reasoning"] = f"⚠️ Reasoning model unavailable: {str(e)}\n\nUsing standard model instead."
            state["error"] = ""
        
        return state
    
    @classmethod
    def _generate_sql_node(cls, state: AgentState) -> AgentState:
        """Generate SQL query from natural language question"""
        # Format conversation history for context
        history_text = ""
        if state.get("conversation_history"):
            history_text = "\n\nConversation History (for context):\n"
            for msg in state["conversation_history"][-6:]:  # Last 3 exchanges
                role = msg.get("role", "user")
                content = msg.get("content", "")
                history_text += f"{role.upper()}: {content}\n"
            history_text += "\n"
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", SQL_SYSTEM_PROMPT),
            ("human", "{history}Question: {question}\n\nProvide your response as valid JSON:")
        ])
        
        try:
            # Use refined question if available (from deep thinking), otherwise use original
            question_to_use = state.get("refined_question", state["question"])
            print(f"🤖 Generating SQL for: {question_to_use}")
            print(f"📋 Schema length: {len(state['schema'])} chars")
            
            # Get database type for formatting
            db_type = state.get("db_type", "mysql").upper()
            
            # Get current date context
            from datetime import datetime
            now = datetime.now()
            current_date = now.strftime("%Y-%m-%d")
            current_year = now.year
            current_month = now.strftime("%B")  # Full month name
            
            print(f"📅 Current context: {current_date} ({current_month} {current_year})")
            
            response = cls._llm.invoke(
                prompt.format_messages(
                    schema=state["schema"],
                    question=question_to_use,
                    history=history_text,
                    db_type=db_type,
                    current_date=current_date,
                    current_year=current_year,
                    current_month=current_month
                )
            )
            
            # Parse JSON response
            response_text = response.content.strip()
            print(f"📄 Raw response: {response_text[:200]}...")
            
            json_response = cls._parse_json_response(response_text)
            
            action = json_response.get("action", "SQL")
            explain = json_response.get("explain", "")
            
            print(f"✅ Action: {action}")
            if explain:
                print(f"💡 Explanation: {explain}")
                # Append explanation to existing reasoning if present
                current_reasoning = state.get("reasoning", "")
                if current_reasoning:
                    state["reasoning"] = f"{current_reasoning}\n\n**SQL Generation Reasoning:**\n{explain}"
                else:
                    state["reasoning"] = explain
            
            # Handle different action types
            if action == "SQL":
                sql_query = json_response.get("sql", "")
                if sql_query:
                    print(f"✅ Generated SQL: {sql_query}")
                    state["sql_query"] = sql_query
                    state["error"] = ""
                else:
                    state["error"] = "No SQL query returned in response"
                    state["sql_query"] = ""
                    
            elif action == "CLARIFY":
                clarify_text = json_response.get("clarify", "")
                print(f"❓ Clarification needed: {clarify_text}")
                state["needs_clarification"] = True
                state["clarification_options"] = [clarify_text]
                state["sql_query"] = ""
                state["error"] = ""
                
            elif action == "ANSWER":
                answer_text = json_response.get("answer", "")
                print(f"💬 Direct answer: {answer_text}")
                # Set answer directly and skip SQL execution
                state["answer"] = answer_text
                state["sql_query"] = ""
                state["error"] = ""
                
            else:
                state["error"] = f"Unknown action type: {action}"
                state["sql_query"] = ""
            
        except Exception as e:
            state["error"] = f"SQL generation error: {str(e)}"
            state["sql_query"] = ""
        
        return state
    
    @classmethod
    def _generate_answer_node(cls, state: AgentState) -> AgentState:
        """Generate natural language answer from query results"""
        if state.get("error"):
            state["answer"] = f"Error: {state['error']}"
            return state
        
        results = state.get("results", {})
        data = results.get("data", [])
        
        if not data:
            state["answer"] = "No results found for your query."
            return state
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful data analyst assistant.
Given a question, the SQL query used, and query results, provide a clear, concise natural language answer.

Rules:
1. Be direct and specific
2. Include relevant numbers and data points
3. Keep it conversational
4. If multiple rows, summarize appropriately
5. Use Malaysian Ringgit (RM) for currency values, not $ or USD
6. IMPORTANT: Look at the SQL query to understand what filters were applied (e.g., specific user, date range) and mention them in your answer
7. If the SQL filters by a user (e.g., WHERE name LIKE '%azka%'), mention that user by name in your answer"""),
            ("human", """Question: {question}

SQL Query: {sql_query}

Results: {results}

Provide a natural language answer:""")
        ])
        
        try:
            # Format results for LLM
            results_text = "\n".join([str(row) for row in data[:5]])  # First 5 rows
            
            response = cls._llm.invoke(
                prompt.format_messages(
                    question=state["question"],
                    sql_query=state.get("sql_query", ""),
                    results=results_text
                )
            )
            
            state["answer"] = response.content.strip()
            
        except Exception as e:
            state["answer"] = f"Answer generation error: {str(e)}"
        
        return state
    
    @classmethod
    def _generate_summary_node(cls, state: AgentState) -> AgentState:
        """Generate data summarization and insights"""
        if state.get("error"):
            state["summary"] = ""
            return state
        
        results = state.get("results", {})
        data = results.get("data", [])
        
        if not data:
            state["summary"] = "No data to summarize."
            return state
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a data analyst providing insights and summarization.
Given a question and query results, provide:
1. Key insights and patterns
2. Statistical summary (totals, averages, trends)
3. Notable observations
4. Actionable takeaways

Be concise but informative. Use bullet points for clarity.
Use Malaysian Ringgit (RM) for all currency values, not $ or USD."""),
            ("human", """Question: {question}

Results: {results}
Row Count: {row_count}

Provide a comprehensive summary with insights:""")
        ])
        
        try:
            # Format results for LLM (include more rows for better analysis)
            results_text = "\n".join([str(row) for row in data[:20]])  # First 20 rows
            
            response = cls._llm.invoke(
                prompt.format_messages(
                    question=state["question"],
                    results=results_text,
                    row_count=len(data)
                )
            )
            
            state["summary"] = response.content.strip()
            
        except Exception as e:
            state["summary"] = f"Summary generation error: {str(e)}"
        
        return state
    
    @classmethod
    async def generate_sql(cls, question: str, schema: str, use_deep_think: bool = False, conversation_history: list = None, db_type: str = "mysql") -> dict:
        """Generate SQL query from natural language"""
        cls._initialize()
        
        initial_state = {
            "question": question,
            "schema": schema,
            "sql_query": "",
            "results": {},
            "answer": "",
            "summary": "",
            "error": "",
            "use_deep_think": use_deep_think,
            "refined_question": "",
            "reasoning": "",
            "conversation_history": conversation_history or [],
            "db_type": db_type,
            "needs_clarification": False,
            "clarification_options": []
        }
        
        # Run deep thinking if enabled, then SQL generation
        state = cls._deep_think_node(initial_state)
        
        # If clarification is needed, return early with clarification info
        if state.get("needs_clarification"):
            return {
                "sql_query": "",
                "error": "",
                "reasoning": "",
                "needs_clarification": True,
                "clarification_options": state.get("clarification_options", []),
                "direct_answer": None
            }
        
        state = cls._generate_sql_node(state)
        
        # Check if we got a direct answer (ANSWER action type)
        direct_answer = state.get("answer", "")
        
        return {
            "sql_query": state["sql_query"],
            "error": state.get("error", ""),
            "reasoning": state.get("reasoning", ""),
            "needs_clarification": False,
            "clarification_options": [],
            "direct_answer": direct_answer if direct_answer else None
        }
    
    @classmethod
    async def generate_answer(cls, question: str, results: dict, sql_query: str = "") -> dict:
        """Generate natural language answer and summary from results"""
        cls._initialize()
        
        state = {
            "question": question,
            "schema": "",
            "sql_query": sql_query,
            "results": results,
            "answer": "",
            "summary": "",
            "error": ""
        }
        
        # Run answer generation
        state = cls._generate_answer_node(state)
        
        # Run summary generation
        state = cls._generate_summary_node(state)
        
        return {
            "answer": state["answer"],
            "summary": state["summary"],
            "error": state.get("error", "")
        }
