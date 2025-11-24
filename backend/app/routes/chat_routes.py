from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.database import get_db
from app.services.langgraph_service import LangGraphService
from app.services.database_service import DatabaseService
from app.services.chat_history_service import ChatHistoryService
from app.services.quota_service import QuotaService
from app.routes.auth_routes import get_current_user
from app.models.db_models import User
import json
import asyncio

router = APIRouter(prefix="/api/chat", tags=["chat"])

class Message(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    metadata: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    messages: List[Message]
    connection_id: int
    conversation_id: Optional[int] = None
    use_deep_think: bool = False

class ToolCall(BaseModel):
    name: str
    arguments: Dict[str, Any]
    result: Optional[Any] = None

@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Stream chat responses with agentic capabilities and quota enforcement"""
    
    # Check quota before processing
    await QuotaService.enforce_quota(db, current_user.id)
    
    async def generate():
        assistant_response = ""
        try:
            # Get the last user message
            user_messages = [msg for msg in request.messages if msg.role == "user"]
            if not user_messages:
                yield f"data: {json.dumps({'type': 'error', 'content': 'No user message found'})}\n\n"
                return
            
            last_message = user_messages[-1].content
            
            # Save user message to conversation history if conversation_id provided
            if request.conversation_id:
                await ChatHistoryService.add_message(
                    db=db,
                    conversation_id=request.conversation_id,
                    user_id=current_user.id,
                    role="user",
                    content=last_message
                )
            
            # Check if it's a simple greeting (exact match, not part of a query)
            simple_greetings = ['hi', 'hello', 'hey', 'thanks', 'thank you', 'bye']
            message_lower = last_message.lower().strip()
            
            # Only treat as greeting if it's EXACTLY one of these words (not part of a longer query)
            is_simple_greeting = message_lower in simple_greetings
            
            if is_simple_greeting:
                # Handle simple greetings without database query
                greeting_responses = {
                    'hi': "Hello! I'm your AI database assistant. Ask me questions about your data like 'Show me top 10 customers' or 'What are the sales trends?'",
                    'hello': "Hi there! I'm ready to help you explore your database. What would you like to know?",
                    'hey': "Hey! Ready to analyze your data. What can I help you with?",
                    'thanks': "You're welcome! Let me know if you need anything else!",
                    'thank you': "My pleasure! Feel free to ask more questions.",
                    'bye': "Goodbye! Come back anytime!"
                }
                
                response_text = greeting_responses.get(message_lower, "Hello! How can I help you with your data today?")
                
                # Save greeting response to history
                if request.conversation_id:
                    await ChatHistoryService.add_message(
                        db=db,
                        conversation_id=request.conversation_id,
                        user_id=current_user.id,
                        role="assistant",
                        content=response_text,
                        metadata={"greeting": True}
                    )
                
                yield f"data: {json.dumps({'type': 'answer', 'content': response_text})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return
            
            # Step 1: Thinking phase
            yield f"data: {json.dumps({'type': 'thinking', 'content': 'Analyzing your question...'})}\n\n"
            await asyncio.sleep(0.1)
            
            # Get database schema
            try:
                schema_text = await DatabaseService.get_schema_info(db, current_user.id, request.connection_id)
                # Get database type for SQL generation
                connection = await DatabaseService.get_connection(db, current_user.id, request.connection_id)
                db_type = connection.type if connection else "mysql"  # Default to mysql
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'content': f'Failed to get database schema: {str(e)}'})}\n\n"
                return
            
            # Step 2: Deep thinking (if enabled)
            reasoning = ""
            if request.use_deep_think:
                yield f"data: {json.dumps({'type': 'thinking', 'content': '🧠 Deep reasoning mode activated...'})}\n\n"
                await asyncio.sleep(0.1)
            
            # Step 3: Generate SQL
            yield f"data: {json.dumps({'type': 'tool_call', 'tool': 'generate_sql', 'status': 'running'})}\n\n"
            
            # Prepare conversation history (exclude the current message)
            conversation_history = []
            for msg in request.messages[:-1]:  # Exclude the last message (current question)
                conversation_history.append({
                    "role": msg.role,
                    "content": msg.content
                })
            
            sql_result = await LangGraphService.generate_sql(
                question=last_message,
                schema=schema_text,
                use_deep_think=request.use_deep_think,
                conversation_history=conversation_history,
                db_type=db_type
            )
            
            # Check if clarification is needed
            if sql_result.get("needs_clarification"):
                options = sql_result.get("clarification_options", [])
                yield f"data: {json.dumps({'type': 'clarification', 'options': options, 'original_question': last_message})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return
            
            if sql_result.get("error"):
                yield f"data: {json.dumps({'type': 'error', 'content': sql_result['error']})}\n\n"
                return
            
            sql_query = sql_result["sql_query"]
            reasoning = sql_result.get("reasoning", "")
            
            # Check if we have a direct answer (ANSWER action type)
            # In this case, the LLM determined the question can be answered without SQL
            if sql_result.get("direct_answer"):
                # Send direct answer
                assistant_response = sql_result["direct_answer"]
                yield f"data: {json.dumps({'type': 'answer', 'content': assistant_response})}\n\n"
                
                if reasoning:
                    yield f"data: {json.dumps({'type': 'reasoning', 'content': reasoning})}\n\n"
                
                # Save assistant response to conversation history (for direct answers)
                if request.conversation_id and assistant_response:
                    await ChatHistoryService.add_message(
                        db=db,
                        conversation_id=request.conversation_id,
                        user_id=current_user.id,
                        role="assistant",
                        content=assistant_response,
                        metadata={
                            "reasoning": reasoning if reasoning else None,
                            "direct_answer": True
                        }
                    )
                
                # Increment usage after successful response
                await QuotaService.increment_usage(db, current_user.id)
                
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return
            
            # Send SQL query if we have one
            if sql_query:
                yield f"data: {json.dumps({'type': 'sql', 'content': sql_query})}\n\n"
            
            if reasoning:
                yield f"data: {json.dumps({'type': 'reasoning', 'content': reasoning})}\n\n"
            
            # Step 4: Execute SQL (only if we have a query)
            if not sql_query:
                yield f"data: {json.dumps({'type': 'error', 'content': 'No SQL query generated'})}\n\n"
                return
                
            yield f"data: {json.dumps({'type': 'tool_call', 'tool': 'execute_query', 'status': 'running'})}\n\n"
            
            try:
                results = await DatabaseService.execute_query(
                    db=db,
                    user_id=current_user.id,
                    connection_id=request.connection_id,
                    query=sql_query
                )
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'content': f'Query execution failed: {str(e)}'})}\n\n"
                return
            
            # Send results
            yield f"data: {json.dumps({'type': 'results', 'content': results})}\n\n"
            
            # Step 5: Generate answer and insights
            yield f"data: {json.dumps({'type': 'tool_call', 'tool': 'generate_insights', 'status': 'running'})}\n\n"
            
            answer_result = await LangGraphService.generate_answer(
                question=last_message,
                results=results,
                sql_query=sql_query
            )
            
            # Send answer
            if answer_result.get("answer"):
                assistant_response = answer_result['answer']
                yield f"data: {json.dumps({'type': 'answer', 'content': assistant_response})}\n\n"
            
            # Send summary/insights
            if answer_result.get("summary"):
                yield f"data: {json.dumps({'type': 'summary', 'content': answer_result['summary']})}\n\n"
            
            # Save assistant response to conversation history
            if request.conversation_id and assistant_response:
                await ChatHistoryService.add_message(
                    db=db,
                    conversation_id=request.conversation_id,
                    user_id=current_user.id,
                    role="assistant",
                    content=assistant_response,
                    metadata={
                        "sql": sql_query if 'sql_query' in locals() else None,
                        "summary": answer_result.get("summary"),
                        "results": results if 'results' in locals() else None,
                        "reasoning": reasoning if reasoning else None
                    }
                )
            
            # Increment usage after successful response
            await QuotaService.increment_usage(db, current_user.id)
            
            # Step 6: Complete
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/query")
async def chat_query(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Non-streaming chat endpoint"""
    try:
        # Check quota
        await QuotaService.enforce_quota(db, current_user.id)
        
        # Get the last user message
        user_messages = [msg for msg in request.messages if msg.role == "user"]
        if not user_messages:
            raise HTTPException(status_code=400, detail="No user message found")
        
        last_message = user_messages[-1].content
        
        # Save user message to conversation history if conversation_id provided
        if request.conversation_id:
            await ChatHistoryService.add_message(
                db=db,
                conversation_id=request.conversation_id,
                user_id=current_user.id,
                role="user",
                content=last_message
            )
        
        # Get database schema
        schema_text = await DatabaseService.get_schema_info(db, current_user.id, request.connection_id)
        
        # Get database type
        connection = await DatabaseService.get_connection(db, current_user.id, request.connection_id)
        db_type = connection.type if connection else "mysql"
        
        # Prepare conversation history (exclude the current message)
        conversation_history = []
        for msg in request.messages[:-1]:  # Exclude the last message (current question)
            conversation_history.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Generate SQL
        sql_result = await LangGraphService.generate_sql(
            question=last_message,
            schema=schema_text,
            use_deep_think=request.use_deep_think,
            conversation_history=conversation_history,
            db_type=db_type
        )
        
        if sql_result.get("error"):
            raise HTTPException(status_code=400, detail=sql_result["error"])
        
        sql_query = sql_result["sql_query"]
        reasoning = sql_result.get("reasoning", "")
        
        # Execute query
        results = await DatabaseService.execute_query(
            db=db,
            user_id=current_user.id,
            connection_id=request.connection_id,
            query=sql_query
        )
        
        # Generate answer and insights
        answer_result = await LangGraphService.generate_answer(
            question=last_message,
            results=results,
            sql_query=sql_query
        )
        
        # Save assistant response to conversation history
        assistant_response = answer_result.get("answer", "")
        if request.conversation_id and assistant_response:
            await ChatHistoryService.add_message(
                db=db,
                conversation_id=request.conversation_id,
                user_id=current_user.id,
                role="assistant",
                content=assistant_response,
                metadata={
                    "sql": sql_query,
                    "summary": answer_result.get("summary"),
                    "results": results,
                    "reasoning": reasoning
                }
            )
        
        # Increment usage
        await QuotaService.increment_usage(db, current_user.id)
        
        return {
            "sql_query": sql_query,
            "results": results,
            "answer": assistant_response,
            "summary": answer_result.get("summary", ""),
            "reasoning": reasoning
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
