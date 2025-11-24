# Quick Start: Agentic Chatbot

## 🚀 Getting Started in 3 Steps

### Step 1: Start the Backend (if not running)

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 2: Start the Frontend (if not running)

```bash
cd frontend
npm run dev
```

### Step 3: Access the Application

Open your browser to: http://localhost:5173

## 🎯 Using the Agentic Chatbot

### 1. Login
- Username: `admin`
- Password: `admin123`

### 2. Add a Database Connection (if needed)
- Click "Add Database" in the header
- Fill in your database credentials
- Test the connection
- Save

### 3. Switch to Chat Mode
- Click the **"Chat"** button in the header (next to "Classic")
- Select a database from the list

### 4. Start Chatting!

Try these example questions:

**Simple Queries:**
```
Show me all customers
List the top 10 products by sales
What are today's orders?
```

**Analysis Queries:**
```
Which product generated the most revenue this month?
Show me sales trends for the last 7 days
Who are my best customers?
```

**Complex Queries (use Deep Think):**
```
How much profit did we make from product ABC?
Which salesperson performed best last quarter?
What's the average order value by region?
```

### 5. Enable Deep Think Mode

Toggle the **"Deep Think"** checkbox for:
- Questions with casual business language
- When you don't know exact table/column names
- Complex multi-table analysis
- Better understanding of ambiguous queries

## 📊 What You'll See

### Left Panel - Results & Insights
- **Charts**: Automatic visualization of numeric data
- **Insights**: AI-generated analysis and patterns
- **Data Table**: Full query results

### Right Panel - Chat Interface
- **Your Questions**: In blue bubbles
- **AI Responses**: With step-by-step reasoning
- **SQL Queries**: Generated code (copyable)
- **Tool Execution**: See what the AI is doing

## 🎨 Features to Try

### 1. Real-Time Streaming
Watch as the AI:
- Thinks about your question
- Generates SQL
- Executes the query
- Analyzes results
- Provides insights

### 2. Copy SQL Queries
- Click the copy icon on any SQL query
- Use it in your own tools
- Learn SQL from AI examples

### 3. Dark Mode
- Toggle with the moon/sun icon
- Persists across sessions

### 4. Example Questions
- Click any example to auto-fill
- Modify and send
- Learn by example

## 💡 Pro Tips

1. **Be Specific**: "Show me sales for Product X in January 2024" is better than "show sales"

2. **Use Deep Think for Business Language**: 
   - ❌ "SELECT * FROM emp WHERE dept = 'sales'"
   - ✅ "Show me all salespeople" (with Deep Think)

3. **Ask Follow-ups**: The chatbot maintains context within a session

4. **Check the SQL**: Learn from the generated queries

5. **Export Results**: Use the Classic view to export data as CSV/XLSX

## 🔧 Troubleshooting

### "No database selected"
- Go back and select a database from the list
- Or switch to Classic view to add a new connection

### "Connection failed"
- Check your database credentials
- Ensure the database server is running
- Verify network connectivity

### Slow responses
- Deep Think mode uses advanced models (slower but smarter)
- Large datasets take longer to analyze
- Try standard mode for faster responses

### No charts showing
- Charts require numeric data
- Try queries that return numbers (sales, counts, etc.)

## 🎓 Learning Path

### Beginner
1. Start with simple "Show me..." queries
2. Observe the generated SQL
3. Try modifying your questions
4. Explore different tables

### Intermediate
1. Enable Deep Think mode
2. Ask analytical questions
3. Request specific time ranges
4. Compare different metrics

### Advanced
1. Ask complex multi-table queries
2. Request specific aggregations
3. Combine filters and groupings
4. Use the insights for decision-making

## 📝 Example Session

```
You: Show me all products
AI: [Generates SQL, shows 150 products in table]

You: Which one sold the most?
AI: [Analyzes sales data, shows top product with chart]

You: How much revenue did it generate?
AI: [Calculates total revenue, shows RM 125,000]

You: Compare that to the second best product
AI: [Shows comparison chart and analysis]
```

## 🌟 Next Steps

- Explore your own data
- Try different question formats
- Enable Deep Think for complex queries
- Check out the full documentation in AGENTIC_CHATBOT.md

## 🆘 Need Help?

- Check the browser console for errors
- Review the backend logs
- Ensure OpenAI API key is configured
- Verify database connections are active

---

**Enjoy your AI-powered database assistant! 🚀**
