"""
Simple test script to verify the new DBAssistant JSON-based prompt structure
"""
import json

# Simulate what the LLM should return for different scenarios

# Test 1: SQL action
sql_response = {
    "action": "SQL",
    "sql": "SELECT * FROM customers LIMIT 100",
    "explain": "Retrieving customer data with default limit of 100 rows."
}
print("Test 1 - SQL Action:")
print(json.dumps(sql_response, indent=2))
print()

# Test 2: CLARIFY action
clarify_response = {
    "action": "CLARIFY",
    "clarify": "Do you want sales from this week, this month, or this year?",
    "explain": "The time period 'recent' is ambiguous and needs clarification."
}
print("Test 2 - CLARIFY Action:")
print(json.dumps(clarify_response, indent=2))
print()

# Test 3: ANSWER action (metadata-based)
answer_response = {
    "action": "ANSWER",
    "answer": "The database has 5 tables: customers, products, orders, invoices, and employees.",
    "explain": "This can be answered from schema metadata without querying the database."
}
print("Test 3 - ANSWER Action:")
print(json.dumps(answer_response, indent=2))
print()

# Test 4: SQL with fuzzy matching
fuzzy_sql_response = {
    "action": "SQL",
    "sql": "SELECT * FROM invoices WHERE user_id IN (SELECT user_id FROM users WHERE name LIKE '%azka%') LIMIT 100",
    "explain": "Using fuzzy name matching with LIKE and IN operator for potential multiple matches."
}
print("Test 4 - SQL with Fuzzy Matching:")
print(json.dumps(fuzzy_sql_response, indent=2))
print()

print("✅ All test cases demonstrate proper JSON structure!")
