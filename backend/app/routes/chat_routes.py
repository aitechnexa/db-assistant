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
import json
import asyncio

router = APIRouter(prefix="/api/chat", tags=["chat"])


class Message(BaseModel):
    role: str
    content: str
    metadata: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    messages: List[Message]
    connection_id: int
    conversation_id: Optional[int] = None
    use_deep_think: bool = False


GREETINGS = {
    "hi": "Hello! I'm your AI database assistant. Ask me questions about your data like 'Show me top 10 customers' or 'What are the sales trends?'",
    "hello": "Hi there! I'm ready to help you explore your database. What would you like to know?",
    "hey": "Hey! Ready to analyze your data. What can I help you with?",
    "thanks": "You're welcome! Let me know if you need anything else.",
    "thank you": "My pleasure! Feel free to ask more questions.",
    "bye": "Goodbye! Come back anytime!",
}


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream chat responses via SSE with agentic DB exploration and quota enforcement."""

    await QuotaService.enforce_quota(db, current_user.id)

    async def generate():
        assistant_response = ""
        sql_query = ""
        results = None

        try:
            user_messages = [m for m in request.messages if m.role == "user"]
            if not user_messages:
                yield f"data: {json.dumps({'type': 'error', 'content': 'No user message found'})}\n\n"
                return

            last_message = user_messages[-1].content

            if request.conversation_id:
                await ChatHistoryService.add_message(
                    db=db,
                    conversation_id=request.conversation_id,
                    user_id=current_user.id,
                    role="user",
                    content=last_message,
                )

            # Short-circuit greetings
            if last_message.lower().strip() in GREETINGS:
                reply = GREETINGS[last_message.lower().strip()]
                if request.conversation_id:
                    await ChatHistoryService.add_message(
                        db=db, conversation_id=request.conversation_id,
                        user_id=current_user.id, role="assistant", content=reply,
                        metadata={"greeting": True},
                    )
                yield f"data: {json.dumps({'type': 'answer', 'content': reply})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

            # Get DB connection details
            try:
                connection = await DatabaseService.get_connection(db, current_user.id, request.connection_id)
                if not connection:
                    yield f"data: {json.dumps({'type': 'error', 'content': 'Database connection not found'})}\n\n"
                    return
                db_type = connection.type
                db_name = connection.database or ""
                engine = DatabaseService._get_engine(db, current_user.id, request.connection_id)
                if engine is None:
                    yield f"data: {json.dumps({'type': 'error', 'content': 'Could not connect to database'})}\n\n"
                    return
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'content': f'Database connection error: {str(e)}'})}\n\n"
                return

            # Build conversation history (exclude last user message)
            conversation_history = [
                {"role": m.role, "content": m.content}
                for m in request.messages[:-1]
            ]

            yield f"data: {json.dumps({'type': 'thinking', 'content': 'Exploring your database...'})}\n\n"

            # Run agent with step streaming via queue
            step_queue: asyncio.Queue = asyncio.Queue()
            agent_result: dict = {}

            async def run_agent():
                result = await LangGraphService.run_agent(
                    question=last_message,
                    engine=engine,
                    db_type=db_type,
                    db_name=db_name,
                    conversation_history=conversation_history,
                    step_queue=step_queue,
                )
                agent_result.update(result)
                await step_queue.put(None)  # signal done

            agent_task = asyncio.create_task(run_agent())

            # Stream agent steps as they arrive
            try:
                while True:
                    item = await asyncio.wait_for(step_queue.get(), timeout=180.0)
                    if item is None:
                        break
                    yield f"data: {json.dumps(item)}\n\n"
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type': 'error', 'content': 'Agent timed out after 3 minutes'})}\n\n"
                agent_task.cancel()
                return

            await agent_task

            sql_query = agent_result.get("sql", "")
            results = agent_result.get("results")
            agent_error = agent_result.get("error", "")
            final_message = agent_result.get("final_message", "")

            if agent_error and not results:
                yield f"data: {json.dumps({'type': 'error', 'content': agent_error})}\n\n"
                return

            # Stream SQL
            if sql_query:
                yield f"data: {json.dumps({'type': 'sql', 'content': sql_query})}\n\n"

            # Stream results
            if results:
                yield f"data: {json.dumps({'type': 'results', 'content': results})}\n\n"

                # Generate answer
                answer = await LangGraphService.generate_answer(
                    question=last_message,
                    results=results,
                    sql_query=sql_query,
                )
                assistant_response = answer
                yield f"data: {json.dumps({'type': 'answer', 'content': answer})}\n\n"

                # Generate summary
                summary = await LangGraphService.generate_summary(
                    question=last_message,
                    results=results,
                )
                if summary:
                    yield f"data: {json.dumps({'type': 'summary', 'content': summary})}\n\n"
            else:
                # Use the agent's own final response if available, otherwise a generic fallback
                assistant_response = final_message or "I could not retrieve query results. Please try rephrasing your question."
                yield f"data: {json.dumps({'type': 'answer', 'content': assistant_response})}\n\n"

            # Persist assistant message
            if request.conversation_id and assistant_response:
                await ChatHistoryService.add_message(
                    db=db,
                    conversation_id=request.conversation_id,
                    user_id=current_user.id,
                    role="assistant",
                    content=assistant_response,
                    metadata={
                        "sql": sql_query or None,
                        "row_count": results.get("row_count") if results else None,
                    },
                )

            await QuotaService.increment_usage(db, current_user.id)
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/query")
async def chat_query(
    request: ChatRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Non-streaming chat endpoint for programmatic use."""
    try:
        await QuotaService.enforce_quota(db, current_user.id)

        user_messages = [m for m in request.messages if m.role == "user"]
        if not user_messages:
            raise HTTPException(status_code=400, detail="No user message found")

        last_message = user_messages[-1].content

        connection = await DatabaseService.get_connection(db, current_user.id, request.connection_id)
        if not connection:
            raise HTTPException(status_code=404, detail="Database connection not found")

        engine = DatabaseService._get_engine(db, current_user.id, request.connection_id)
        db_type = connection.type
        db_name = connection.database or ""

        conversation_history = [
            {"role": m.role, "content": m.content} for m in request.messages[:-1]
        ]

        agent_result = await LangGraphService.run_agent(
            question=last_message,
            engine=engine,
            db_type=db_type,
            db_name=db_name,
            conversation_history=conversation_history,
        )

        sql_query = agent_result.get("sql", "")
        results = agent_result.get("results") or {}

        answer = await LangGraphService.generate_answer(
            question=last_message, results=results, sql_query=sql_query
        )

        if request.conversation_id:
            await ChatHistoryService.add_message(
                db=db, conversation_id=request.conversation_id,
                user_id=current_user.id, role="assistant", content=answer,
                metadata={"sql": sql_query, "row_count": results.get("row_count")},
            )

        await QuotaService.increment_usage(db, current_user.id)

        return {
            "sql_query": sql_query,
            "results": results,
            "answer": answer,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
