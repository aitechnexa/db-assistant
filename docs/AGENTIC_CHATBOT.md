# Agentic Chatbot Feature

## Overview

The Database Assistant now includes a powerful **Agentic Chatbot** interface that provides an interactive, conversational way to query and analyze your database. The chatbot uses LangGraph for multi-step reasoning and tool execution.

## Features

### 🎯 Split-Layout Interface
- **Left Panel**: Live results, visualizations, and insights
- **Right Panel**: Chat interface with conversation history
- Real-time streaming responses
- Automatic data visualization

### 🤖 Agentic Capabilities

The chatbot acts as an intelligent agent with the following capabilities:

1. **Deep Thinking Mode** (Optional)
   - Uses advanced reasoning models (o1-preview/o1-mini)
   - Understands casual business language
   - Maps business terms to database schema
   - Perfect for non-technical users

2. **Multi-Step Reasoning**
   - Analyzes your question
   - Generates optimized SQL queries
   - Executes queries safely
   - Provides natural language answers
   - Generates insights and summaries

3. **Tool Execution**
   - `generate_sql`: Converts natural language to SQL
   - `execute_query`: Runs SQL queries on your database
   - `generate_insights`: Creates summaries and actionable insights

4. **Real-Time Streaming**
   - See the AI's thought process in real-time
   - Watch as it generates SQL, executes queries, and analyzes results
   - Transparent tool usage display

## How to Use

### 1. Switch to Chat Mode

Click the **Chat** button in the header to switch from Classic view to Chat view.

### 2. Select a Database

Choose a database connection from the list. The chatbot will use this database for all queries.

### 3. Ask Questions

Type natural language questions like:
- "Show me top 10 customers by revenue"
- "What are the sales trends this month?"
- "Which products are most profitable?"
- "How much did we make from product ABC?"

### 4. Enable Deep Think (Optional)

Toggle **Deep Think** mode for:
- Complex or ambiguous questions
- When you don't know exact column names
- Business terminology that needs translation
- Better understanding of casual queries

### 5. View Results

Results appear in the left panel with:
- **Data Visualization**: Automatic charts for numeric data
- **Insights & Summary**: AI-generated analysis
- **Query Results**: Full data table

## Architecture

### Backend (FastAPI + LangGraph)

```
/api/chat/stream (POST)
├── Thinking Phase
├── Deep Reasoning (if enabled)
├── SQL Generation
├── Query Execution
├── Answer Generation
└── Insights Generation
```

**LangGraph Workflow:**
```
deep_think_node → generate_sql_node → generate_answer_node → generate_summary_node
```

### Frontend (React)

**Components:**
- `AgenticChatbot.jsx`: Main chatbot interface
- `ChatMessage`: Individual message rendering
- `ResultsDisplay`: Left panel with charts and tables

**Features:**
- Server-Sent Events (SSE) for streaming
- Real-time message updates
- Markdown rendering for rich text
- Code syntax highlighting for SQL

## API Endpoints

### POST /api/chat/stream

Stream chat responses with agentic capabilities.

**Request:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Show me top 10 customers"
    }
  ],
  "connection_id": "database-id",
  "use_deep_think": false
}
```

**Response (SSE):**
```
data: {"type": "thinking", "content": "Analyzing your question..."}
data: {"type": "tool_call", "tool": "generate_sql", "status": "running"}
data: {"type": "sql", "content": "SELECT * FROM customers..."}
data: {"type": "results", "content": {...}}
data: {"type": "answer", "content": "Here are the top 10 customers..."}
data: {"type": "summary", "content": "### Key Insights\n..."}
data: {"type": "done"}
```

### POST /api/chat/query

Non-streaming version for simple queries.

## Configuration

### Environment Variables

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-...

# Models
OPENAI_MODEL=gpt-4-turbo-preview  # For SQL generation and answers
OPENAI_REASONING_MODEL=o1-preview  # For deep thinking (optional)
```

### Deep Think Models

Supported reasoning models:
- `o1-preview`: Most capable, slower
- `o1-mini`: Faster, good for most cases
- Falls back to standard model if unavailable

## Example Conversations

### Example 1: Simple Query
```
User: "Show me all products"
AI: 🤖 Generating SQL...
    SELECT * FROM products LIMIT 200
    ✅ Found 150 products
    Here are all the products in your database...
```

### Example 2: Complex Analysis with Deep Think
```
User: "Which salesperson made the most money last quarter?"
AI: 🧠 Deep reasoning mode activated...
    💡 Mapping "salesperson" to employee table, "money" to revenue...
    🤖 Generating SQL...
    SELECT employee_name, SUM(revenue) as total
    FROM sales s
    JOIN employees e ON s.employee_id = e.id
    WHERE date >= '2024-07-01' AND date < '2024-10-01'
    GROUP BY employee_name
    ORDER BY total DESC
    LIMIT 1
    
    ✅ John Smith generated RM 1,250,000 in Q3 2024
    
    ### Key Insights
    - Top performer: John Smith with RM 1.25M
    - 45% above team average
    - Consistent high performance across all months
```

## Best Practices

1. **Use Deep Think for:**
   - Ambiguous questions
   - Business terminology
   - Complex multi-table queries
   - When you're unsure of schema

2. **Use Standard Mode for:**
   - Simple queries
   - When you know exact table/column names
   - Faster responses needed

3. **Conversation Tips:**
   - Be specific about time ranges
   - Mention relevant entities (products, customers, etc.)
   - Ask follow-up questions to refine results
   - Request specific formats (charts, summaries, etc.)

## Troubleshooting

### No Results Displayed
- Check database connection status
- Verify the query returned data
- Check browser console for errors

### Slow Responses
- Deep Think mode is slower (uses reasoning models)
- Large result sets take longer to analyze
- Consider using standard mode for simple queries

### SQL Generation Errors
- Enable Deep Think for better understanding
- Provide more context in your question
- Check database schema is accessible

## Future Enhancements

- [ ] Multi-turn conversations with context
- [ ] Query history and favorites
- [ ] Export chat transcripts
- [ ] Custom visualization preferences
- [ ] Voice input support
- [ ] Collaborative chat sessions
- [ ] Query optimization suggestions
- [ ] Automated report generation

## Technical Details

### Streaming Implementation

Uses Server-Sent Events (SSE) for real-time updates:
- Each step of the agentic workflow streams updates
- Client receives incremental results
- Non-blocking, responsive UI

### Security

- All queries use parameterized execution
- User authentication required
- Database credentials encrypted
- Rate limiting on API endpoints

### Performance

- Lazy loading for large result sets
- Chart rendering optimized for 1000+ data points
- Debounced input for better UX
- Efficient state management

## Contributing

To extend the agentic capabilities:

1. Add new nodes to `LangGraphService._build_graph()`
2. Implement node functions in `langgraph_service.py`
3. Update streaming logic in `chat_routes.py`
4. Add UI components in `AgenticChatbot.jsx`

## License

Same as the main project.
