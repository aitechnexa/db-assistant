from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List
from ..models.chat import ConversationCreate, ConversationUpdate, ConversationResponse, Conversation
from ..models.db_models import User
from ..services.chat_history_service import ChatHistoryService
from ..database import get_db
from .auth_routes import get_current_user

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

@router.post("/", response_model=Conversation)
async def create_conversation(
    data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new conversation"""
    conversation = await ChatHistoryService.create_conversation(
        db=db,
        user_id=current_user.id,
        title=data.title,
        connection_id=int(data.connection_id) if data.connection_id else None
    )
    return conversation

@router.get("/", response_model=List[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all conversations for the current user"""
    conversations = await ChatHistoryService.list_conversations(db, current_user.id)
    return conversations

@router.get("/{conversation_id}", response_model=Conversation)
async def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific conversation with all messages"""
    conversation = await ChatHistoryService.get_conversation(db, current_user.id, conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation

@router.patch("/{conversation_id}", response_model=Conversation)
async def update_conversation(
    conversation_id: int,
    data: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update conversation metadata"""
    conversation = await ChatHistoryService.update_conversation(
        db=db,
        user_id=current_user.id,
        conversation_id=conversation_id,
        title=data.title,
        connection_id=int(data.connection_id) if data.connection_id else None
    )
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation

@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a conversation"""
    success = await ChatHistoryService.delete_conversation(db, current_user.id, conversation_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {"message": "Conversation deleted successfully"}

@router.delete("/{conversation_id}/messages")
async def clear_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear all messages from a conversation"""
    conversation = await ChatHistoryService.clear_messages(db, current_user.id, conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {"message": "Messages cleared successfully"}
