from typing import Optional
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import text
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from .llm_provider import get_llm
import asyncio
import re


DANGEROUS_KEYWORDS = {
    "DROP", "DELETE", "UPDATE", "INSERT", "ALTER",
    "TRUNCATE", "CREATE", "REPLACE", "MERGE", "EXEC", "EXECUTE"
}

TOOL_ICONS = {
    "list_tables": "📋",
    "describe_table": "🔍",
    "sample_rows": "📄",
    "get_foreign_keys": "🔗",
    "get_table_relationships": "🗺️",
    "get_indexes": "⚡",
    "get_column_stats": "📊",
    "get_distinct_values": "🏷️",
    "get_date_range": "📅",
    "search_values": "🔎",
    "count_rows": "🔢",
    "explain_query": "🧐",
    "run_sql": "▶️",
}


def _build_agent_system_prompt() -> str:
    today = date.today()
    return f"""You are DBAssistant, an expert AI database analyst. You have tools to explore any database and answer questions about its data.

GOAL: Always call run_sql() to retrieve data and answer the user's question. Do not stop before executing a query.

TOOL USAGE STRATEGY:
1. Call list_tables() to see available tables
2. Call describe_table() on the relevant table(s) to get column names and types
3. If JOINs are needed, call get_foreign_keys() to understand relationships
4. Write the SQL query and call run_sql() — do this as soon as you have enough information
5. If run_sql() fails, analyze the error and retry with a corrected query (up to 3 attempts)
6. Only use other exploration tools (get_distinct_values, get_date_range, search_values, count_rows) when strictly necessary for filters

CRITICAL RULES:
- ALWAYS call run_sql() — never return an answer without executing a query for data questions
- Only SELECT queries are allowed
- Always use LIMIT 100 unless user explicitly asks for all data
- For PostgreSQL: use ILIKE for case-insensitive text matching
- For MySQL: use LIKE (case-insensitive by default)
- For SQLite: use LIKE
- When joining tables, always use explicit column aliases to avoid ambiguity
- For DATETIME columns: use DATE(col) = 'YYYY-MM-DD' or range comparisons

DATE CONTEXT:
- Current date: {today.isoformat()}
- Current month: {today.strftime('%B %Y')}
- Current year: {today.year}

Once you have query results, summarize the answer clearly for the user."""


def _convert_value(value):
    """Convert DB values to JSON-serializable types."""
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value


def _is_safe_query(query: str) -> bool:
    """Return True only for SELECT/WITH/EXPLAIN queries with no dangerous keywords."""
    q = query.strip().upper()
    if not (q.startswith("SELECT") or q.startswith("WITH") or q.startswith("EXPLAIN")):
        return False
    for kw in DANGEROUS_KEYWORDS:
        if re.search(rf"\b{kw}\b", q):
            return False
    return True


def _is_safe_where(clause: str) -> bool:
    """Return True if WHERE clause contains no dangerous keywords."""
    c = clause.upper()
    for kw in list(DANGEROUS_KEYWORDS) + [";"]:
        if kw in c:
            return False
    return True


def _quote_ident(name: str, db_type: str) -> str:
    """Quote an identifier appropriately for the DB type."""
    if db_type == "mysql":
        return f"`{name.replace('`', '``')}`"
    return f'"{name.replace(chr(34), chr(34) * 2)}"'


def build_tools(engine, db_type: str, db_name: str = ""):
    """Build all 13 LangChain tools for DB exploration. Returns (tools_list, results_store)."""

    results_store = {"sql": "", "results": None, "error": ""}

    def qi(name: str) -> str:
        return _quote_ident(name, db_type)

    # ── Tool 1 ────────────────────────────────────────────────────────────────
    @tool
    def list_tables() -> str:
        """List all tables in the connected database. Always call this first."""
        try:
            with engine.connect() as conn:
                if db_type == "postgresql":
                    q = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
                elif db_type == "mysql":
                    q = f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{db_name}' AND table_type = 'BASE TABLE' ORDER BY table_name"
                else:
                    q = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
                rows = conn.execute(text(q)).fetchall()
                tables = [r[0] for r in rows]
                return f"Tables ({len(tables)}):\n" + "\n".join(f"  - {t}" for t in tables)
        except Exception as e:
            return f"Error listing tables: {e}"

    # ── Tool 2 ────────────────────────────────────────────────────────────────
    @tool
    def describe_table(table_name: str) -> str:
        """Get column names and data types for a specific table."""
        try:
            with engine.connect() as conn:
                if db_type == "postgresql":
                    q = text("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = :t ORDER BY ordinal_position")
                    rows = conn.execute(q, {"t": table_name}).fetchall()
                    lines = [f"  {r[0]} ({r[1]}) {'NULL' if r[2] == 'YES' else 'NOT NULL'}" for r in rows]
                elif db_type == "mysql":
                    q = text("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = :db AND table_name = :t ORDER BY ordinal_position")
                    rows = conn.execute(q, {"db": db_name, "t": table_name}).fetchall()
                    lines = [f"  {r[0]} ({r[1]}) {'NULL' if r[2] == 'YES' else 'NOT NULL'}" for r in rows]
                else:
                    rows = conn.execute(text(f"PRAGMA table_info({qi(table_name)})")).fetchall()
                    lines = [f"  {r[1]} ({r[2]}) {'NULL' if not r[3] else 'NOT NULL'}" for r in rows]
                if not lines:
                    return f"Table '{table_name}' not found or has no columns."
                return f"Columns of '{table_name}':\n" + "\n".join(lines)
        except Exception as e:
            return f"Error describing table '{table_name}': {e}"

    # ── Tool 3 ────────────────────────────────────────────────────────────────
    @tool
    def sample_rows(table_name: str, limit: int = 5) -> str:
        """Get sample rows from a table to understand data patterns and formats."""
        try:
            safe_limit = min(max(1, limit), 10)
            with engine.connect() as conn:
                rows = conn.execute(text(f"SELECT * FROM {qi(table_name)} LIMIT {safe_limit}")).fetchall()
                if not rows:
                    return f"Table '{table_name}' is empty."
                keys = list(conn.execute(text(f"SELECT * FROM {qi(table_name)} LIMIT 0")).keys())
                lines = []
                for i, row in enumerate(rows, 1):
                    pairs = ", ".join(f"{k}={str(v)[:40]}" for k, v in zip(keys, row))
                    lines.append(f"  Row {i}: {pairs}")
                return f"Sample rows from '{table_name}':\n" + "\n".join(lines)
        except Exception as e:
            return f"Error sampling '{table_name}': {e}"

    # ── Tool 4 ────────────────────────────────────────────────────────────────
    @tool
    def get_foreign_keys(table_name: str) -> str:
        """Get foreign key relationships for a table. Use this to understand how to JOIN tables."""
        try:
            with engine.connect() as conn:
                if db_type == "postgresql":
                    q = text("""
                        SELECT kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_col
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                        JOIN information_schema.constraint_column_usage ccu
                          ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
                        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name = :t
                    """)
                    rows = conn.execute(q, {"t": table_name}).fetchall()
                    lines = [f"  {table_name}.{r[0]} -> {r[1]}.{r[2]}" for r in rows]
                elif db_type == "mysql":
                    q = text("SELECT column_name, referenced_table_name, referenced_column_name FROM information_schema.key_column_usage WHERE table_schema = :db AND table_name = :t AND referenced_table_name IS NOT NULL")
                    rows = conn.execute(q, {"db": db_name, "t": table_name}).fetchall()
                    lines = [f"  {table_name}.{r[0]} -> {r[1]}.{r[2]}" for r in rows]
                else:
                    rows = conn.execute(text(f"PRAGMA foreign_key_list({qi(table_name)})")).fetchall()
                    lines = [f"  {table_name}.{r[3]} -> {r[2]}.{r[4]}" for r in rows]
                if not lines:
                    return f"No foreign keys found on '{table_name}'."
                return f"Foreign keys for '{table_name}':\n" + "\n".join(lines)
        except Exception as e:
            return f"Error getting foreign keys for '{table_name}': {e}"

    # ── Tool 5 ────────────────────────────────────────────────────────────────
    @tool
    def get_table_relationships() -> str:
        """Get ALL foreign key relationships in the database. Use for multi-table queries."""
        try:
            with engine.connect() as conn:
                if db_type == "postgresql":
                    q = text("""
                        SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_col
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                        JOIN information_schema.constraint_column_usage ccu
                          ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
                        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
                        ORDER BY tc.table_name
                    """)
                    rows = conn.execute(q).fetchall()
                    lines = [f"  {r[0]}.{r[1]} -> {r[2]}.{r[3]}" for r in rows]
                elif db_type == "mysql":
                    q = text("SELECT table_name, column_name, referenced_table_name, referenced_column_name FROM information_schema.key_column_usage WHERE table_schema = :db AND referenced_table_name IS NOT NULL ORDER BY table_name")
                    rows = conn.execute(q, {"db": db_name}).fetchall()
                    lines = [f"  {r[0]}.{r[1]} -> {r[2]}.{r[3]}" for r in rows]
                else:
                    tables_q = "SELECT name FROM sqlite_master WHERE type='table'"
                    tables = [r[0] for r in conn.execute(text(tables_q)).fetchall()]
                    lines = []
                    for t in tables:
                        try:
                            fks = conn.execute(text(f"PRAGMA foreign_key_list({qi(t)})")).fetchall()
                            for fk in fks:
                                lines.append(f"  {t}.{fk[3]} -> {fk[2]}.{fk[4]}")
                        except Exception:
                            pass
                if not lines:
                    return "No foreign key relationships found in this database."
                return f"Database relationships ({len(lines)}):\n" + "\n".join(lines)
        except Exception as e:
            return f"Error getting relationships: {e}"

    # ── Tool 6 ────────────────────────────────────────────────────────────────
    @tool
    def get_indexes(table_name: str) -> str:
        """Get indexes defined on a table. Helps write efficient WHERE and ORDER BY clauses."""
        try:
            with engine.connect() as conn:
                if db_type == "postgresql":
                    q = text("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = :t AND schemaname = 'public'")
                    rows = conn.execute(q, {"t": table_name}).fetchall()
                    lines = [f"  {r[0]}: {r[1]}" for r in rows]
                elif db_type == "mysql":
                    rows = conn.execute(text(f"SHOW INDEX FROM {qi(table_name)}")).fetchall()
                    lines = [f"  {r[2]} on ({r[4]})" for r in rows]
                else:
                    idx_rows = conn.execute(text(f"PRAGMA index_list({qi(table_name)})")).fetchall()
                    lines = []
                    for idx in idx_rows:
                        info = conn.execute(text(f"PRAGMA index_info('{idx[1]}')")).fetchall()
                        cols = ", ".join(i[2] for i in info)
                        lines.append(f"  {idx[1]} ({cols})")
                if not lines:
                    return f"No indexes found on '{table_name}'."
                return f"Indexes on '{table_name}':\n" + "\n".join(lines)
        except Exception as e:
            return f"Error getting indexes for '{table_name}': {e}"

    # ── Tool 7 ────────────────────────────────────────────────────────────────
    @tool
    def get_column_stats(table_name: str, column_name: str) -> str:
        """Get statistics for a column: min, max, count, distinct count, null percentage."""
        try:
            with engine.connect() as conn:
                col = qi(column_name)
                tbl = qi(table_name)
                q = text(f"SELECT COUNT(*) as total, COUNT(DISTINCT {col}) as distinct_count, COUNT(*) - COUNT({col}) as null_count, MIN({col}) as min_val, MAX({col}) as max_val FROM {tbl}")
                row = conn.execute(q).fetchone()
                if not row or row[0] == 0:
                    return f"Table '{table_name}' is empty."
                null_pct = round((row[2] / row[0]) * 100, 2) if row[0] > 0 else 0
                return (
                    f"Stats for {table_name}.{column_name}:\n"
                    f"  total rows: {row[0]}\n"
                    f"  distinct values: {row[1]}\n"
                    f"  null count: {row[2]} ({null_pct}%)\n"
                    f"  min: {row[3]}\n"
                    f"  max: {row[4]}"
                )
        except Exception as e:
            return f"Error getting stats for '{table_name}.{column_name}': {e}"

    # ── Tool 8 ────────────────────────────────────────────────────────────────
    @tool
    def get_distinct_values(table_name: str, column_name: str) -> str:
        """Get distinct values with frequency for categorical columns (status, type, category, etc.). Always use before writing categorical WHERE clauses."""
        try:
            with engine.connect() as conn:
                col = qi(column_name)
                tbl = qi(table_name)
                q = text(f"SELECT {col}, COUNT(*) as freq FROM {tbl} GROUP BY {col} ORDER BY freq DESC LIMIT 30")
                rows = conn.execute(q).fetchall()
                if not rows:
                    return f"No data found in '{table_name}.{column_name}'."
                lines = [f"  '{r[0]}' -> {r[1]} rows" for r in rows]
                return f"Distinct values for {table_name}.{column_name} ({len(rows)} shown):\n" + "\n".join(lines)
        except Exception as e:
            return f"Error getting distinct values for '{table_name}.{column_name}': {e}"

    # ── Tool 9 ────────────────────────────────────────────────────────────────
    @tool
    def get_date_range(table_name: str, column_name: str) -> str:
        """Get the earliest and latest date in a date/datetime column. Always use before writing date filters."""
        try:
            with engine.connect() as conn:
                col = qi(column_name)
                tbl = qi(table_name)
                q = text(f"SELECT MIN({col}), MAX({col}) FROM {tbl}")
                row = conn.execute(q).fetchone()
                if not row or row[0] is None:
                    return f"No date data found in '{table_name}.{column_name}'."
                return (
                    f"Date range for {table_name}.{column_name}:\n"
                    f"  earliest: {row[0]}\n"
                    f"  latest:   {row[1]}"
                )
        except Exception as e:
            return f"Error getting date range for '{table_name}.{column_name}': {e}"

    # ── Tool 10 ───────────────────────────────────────────────────────────────
    @tool
    def search_values(table_name: str, column_name: str, keyword: str) -> str:
        """Search for values matching a keyword in a column. Always use before writing WHERE clauses with partial names or strings."""
        try:
            safe_keyword = keyword.replace("%", r"\%").replace("_", r"\_")
            pattern = f"%{safe_keyword}%"
            with engine.connect() as conn:
                col = qi(column_name)
                tbl = qi(table_name)
                if db_type == "postgresql":
                    q = text(f"SELECT DISTINCT {col}::text FROM {tbl} WHERE {col}::text ILIKE :kw LIMIT 10")
                else:
                    q = text(f"SELECT DISTINCT {col} FROM {tbl} WHERE {col} LIKE :kw LIMIT 10")
                rows = conn.execute(q, {"kw": pattern}).fetchall()
                if not rows:
                    return f"No values matching '{keyword}' found in {table_name}.{column_name}."
                lines = [f"  '{r[0]}'" for r in rows]
                return f"Values matching '{keyword}' in {table_name}.{column_name}:\n" + "\n".join(lines)
        except Exception as e:
            return f"Error searching values in '{table_name}.{column_name}': {e}"

    # ── Tool 11 ───────────────────────────────────────────────────────────────
    @tool
    def count_rows(table_name: str, where_clause: str = "") -> str:
        """Count rows in a table, optionally with a WHERE clause. Use before large fetches."""
        try:
            if where_clause and not _is_safe_where(where_clause):
                return "Error: WHERE clause contains unsafe keywords."
            with engine.connect() as conn:
                tbl = qi(table_name)
                sql = f"SELECT COUNT(*) FROM {tbl}"
                if where_clause.strip():
                    sql += f" WHERE {where_clause}"
                count = conn.execute(text(sql)).scalar()
                ctx = f" WHERE {where_clause}" if where_clause.strip() else ""
                return f"Row count for {table_name}{ctx}: {count:,} rows"
        except Exception as e:
            return f"Error counting rows in '{table_name}': {e}"

    # ── Tool 12 ───────────────────────────────────────────────────────────────
    @tool
    def explain_query(sql: str) -> str:
        """Get the query execution plan to check if a query will be slow before running it."""
        try:
            if not _is_safe_query(sql):
                return "Error: Only SELECT queries can be explained."
            with engine.connect() as conn:
                if db_type == "postgresql":
                    rows = conn.execute(text(f"EXPLAIN {sql}")).fetchall()
                elif db_type == "mysql":
                    rows = conn.execute(text(f"EXPLAIN {sql}")).fetchall()
                else:
                    rows = conn.execute(text(f"EXPLAIN QUERY PLAN {sql}")).fetchall()
                plan_text = "\n".join("  " + " | ".join(str(c) for c in r) for r in rows)
                warning = ""
                plan_upper = plan_text.upper()
                if "SEQ SCAN" in plan_upper or "ALL" in plan_upper or "SCAN TABLE" in plan_upper:
                    warning = "\n  ⚠️  WARNING: Full table scan detected. Consider adding LIMIT or using an indexed column."
                return f"Query plan:\n{plan_text}{warning}"
        except Exception as e:
            return f"Error explaining query: {e}"

    # ── Tool 13 ───────────────────────────────────────────────────────────────
    @tool
    def run_sql(query: str) -> str:
        """Execute a SELECT SQL query and return results. Only SELECT queries are allowed. Stores results for the caller."""
        if not _is_safe_query(query):
            err = "Error: Only SELECT queries are allowed. Destructive operations are blocked."
            results_store["error"] = err
            return err
        try:
            with engine.connect() as conn:
                result = conn.execute(text(query))
                columns = list(result.keys())
                rows = result.fetchmany(1000)
                data = []
                for row in rows:
                    data.append({col: _convert_value(val) for col, val in zip(columns, row)})

                results_store["sql"] = query
                results_store["results"] = {"columns": columns, "data": data, "row_count": len(data)}
                results_store["error"] = ""

                if not data:
                    return "Query executed successfully. No rows returned."
                preview = data[:3]
                lines = [f"  Row {i+1}: {row}" for i, row in enumerate(preview)]
                suffix = f"\n  ... and {len(data) - 3} more rows" if len(data) > 3 else ""
                return f"Query returned {len(data)} rows.\nColumns: {', '.join(columns)}\n" + "\n".join(lines) + suffix
        except Exception as e:
            err = f"SQL Error: {str(e)}"
            results_store["error"] = err
            return err

    all_tools = [
        list_tables, describe_table, sample_rows,
        get_foreign_keys, get_table_relationships, get_indexes,
        get_column_stats, get_distinct_values, get_date_range,
        search_values, count_rows, explain_query, run_sql,
    ]
    return all_tools, results_store


class LangGraphService:
    """Agentic database assistant using a ReAct loop with 13 DB exploration tools."""

    @classmethod
    async def run_agent(
        cls,
        question: str,
        engine,
        db_type: str,
        db_name: str,
        conversation_history: list,
        step_queue: Optional[asyncio.Queue] = None,
    ) -> dict:
        """Run the ReAct agent. Streams agent steps to step_queue if provided."""
        llm = get_llm()
        tools, results_store = build_tools(engine, db_type, db_name)
        system_prompt = _build_agent_system_prompt()

        agent = create_react_agent(model=llm, tools=tools, state_modifier=system_prompt)

        messages = []
        for msg in (conversation_history or [])[-10:]:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))
        messages.append(HumanMessage(content=question))

        final_ai_message = ""
        try:
            async for chunk in agent.astream(
                {"messages": messages},
                stream_mode="updates",
                config={"recursion_limit": 25},
            ):
                if step_queue and "tools" in chunk:
                    for msg in chunk["tools"].get("messages", []):
                        tool_name = getattr(msg, "name", "") or ""
                        if tool_name:
                            icon = TOOL_ICONS.get(tool_name, "🔧")
                            label = tool_name.replace("_", " ").title()
                            await step_queue.put({"type": "agent_step", "content": f"{icon} {label}..."})
                if "agent" in chunk:
                    for msg in chunk["agent"].get("messages", []):
                        content = getattr(msg, "content", "") or ""
                        if content and isinstance(content, str):
                            final_ai_message = content
        except Exception as e:
            if step_queue:
                await step_queue.put({"type": "agent_step", "content": f"⚠️ Agent error: {str(e)[:120]}"})
            results_store["error"] = str(e)

        return {
            "sql": results_store["sql"],
            "results": results_store["results"],
            "error": results_store["error"],
            "final_message": final_ai_message,
        }

    @classmethod
    async def generate_answer(cls, question: str, results: dict, sql_query: str = "") -> str:
        """Generate a natural language answer from query results."""
        data = results.get("data", []) if results else []
        columns = results.get("columns", []) if results else []
        row_count = results.get("row_count", 0) if results else 0

        if not data:
            return "No results were found for your query."

        llm = get_llm()
        preview = data[:20]
        results_text = f"Columns: {', '.join(columns)}\nRows ({row_count} total):\n"
        results_text += "\n".join(str(row) for row in preview)
        if row_count > 20:
            results_text += f"\n... ({row_count - 20} more rows)"

        prompt = f"""Based on the following database query results, provide a clear and concise answer to the user's question.

Question: {question}

SQL Query: {sql_query}

Results:
{results_text}

Provide a direct, helpful answer. Use numbers and specifics from the data. Format nicely with markdown if helpful."""

        try:
            from langchain_core.messages import HumanMessage as HM
            response = await llm.ainvoke([HM(content=prompt)])
            return response.content
        except Exception as e:
            return f"Results retrieved successfully. {row_count} rows returned. (Answer generation failed: {e})"

    @classmethod
    async def generate_summary(cls, question: str, results: dict) -> str:
        """Generate a brief one-line summary of the results."""
        data = results.get("data", []) if results else []
        row_count = results.get("row_count", 0) if results else 0

        if not data:
            return "No results found."

        llm = get_llm()
        prompt = f"""Summarize in one sentence (max 20 words): 
Question: {question}
Results: {row_count} rows returned. First row: {data[0] if data else 'none'}"""

        try:
            from langchain_core.messages import HumanMessage as HM
            response = await llm.ainvoke([HM(content=prompt)])
            return response.content.strip()
        except Exception:
            return f"Found {row_count} result(s) for your query."
