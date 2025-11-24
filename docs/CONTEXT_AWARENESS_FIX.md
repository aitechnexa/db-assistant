# Context Awareness Fix

## Problem
The AI assistant was not maintaining conversation context between messages. When users asked follow-up questions like "who is the second?" after asking "who makes the most sales?", the system didn't understand the context and couldn't provide relevant answers.

## Root Cause
The conversation history was being sent from the frontend to the backend, but the backend's LangGraph service was not using this history when generating SQL queries or answers. The system only looked at the current question in isolation.

## Solution
Modified the system to include conversation history in the LLM prompts:

### Backend Changes

1. **`langgraph_service.py`**:
   - Added `conversation_history` field to `AgentState` TypedDict
   - Updated `SQL_SYSTEM_PROMPT` to mention reviewing conversation history
   - Modified `_deep_think_node()` to include conversation history in the prompt (last 6 messages / 3 exchanges)
   - Modified `_generate_sql_node()` to include conversation history in the prompt
   - Updated `generate_sql()` method signature to accept `conversation_history` parameter

2. **`chat_routes.py`**:
   - Updated both streaming (`/stream`) and non-streaming (`/query`) endpoints
   - Added code to extract conversation history from request.messages (excluding current message)
   - Pass conversation history to `LangGraphService.generate_sql()`

### How It Works
1. Frontend sends all messages in the conversation to the backend
2. Backend extracts the conversation history (all messages except the current one)
3. LangGraph service formats the last 6 messages (3 user-assistant exchanges) as context
4. This context is included in the prompt sent to the LLM
5. LLM can now understand follow-up questions in context

### Example
**Before Fix:**
- User: "who makes the most sales?"
- AI: "Azka Afiq with RM 3,376,859.34"
- User: "who is the second?"
- AI: ❌ Confused - doesn't know what "second" refers to

**After Fix:**
- User: "who makes the most sales?"
- AI: "Azka Afiq with RM 3,376,859.34"
- User: "who is the second?"
- AI: ✅ Understands context - returns the second highest salesperson

## Files Modified
- `/backend/app/services/langgraph_service.py`
- `/backend/app/routes/chat_routes.py`

## Testing
To test the fix:
1. Start a new conversation
2. Ask: "who makes the most sales?"
3. Follow up with: "who is the second?"
4. The AI should now understand you're asking about the second highest salesperson

## Notes
- The system keeps the last 6 messages (3 exchanges) to balance context and token usage
- This works for both regular and Deep Think modes
- Conversation history is stored in the database and loaded when resuming conversations
