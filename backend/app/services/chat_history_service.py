from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..models.chat import Conversation as PydanticConversation, ChatMessage as PydanticMessage, ConversationResponse
from ..models.db_models import Conversation as DBConversation, Message as DBMessage
import json

class ChatHistoryService:
    """Service for managing chat history and conversations (PostgreSQL-backed)"""
    
    @classmethod
    def _db_to_pydantic_message(cls, db_msg: DBMessage) -> PydanticMessage:
        """Convert DB message to Pydantic message"""
        return PydanticMessage(
            role=db_msg.role,
            content=db_msg.content,
            timestamp=db_msg.created_at,
            metadata=db_msg.message_metadata
        )

    @classmethod
    def _db_to_pydantic_conversation(cls, db_conv: DBConversation) -> PydanticConversation:
        """Convert DB conversation to Pydantic conversation"""
        messages = [cls._db_to_pydantic_message(msg) for msg in db_conv.messages]
        return PydanticConversation(
            id=str(db_conv.id),
            user_id=str(db_conv.user_id),
            title=db_conv.title,
            connection_id=str(db_conv.connection_id) if db_conv.connection_id else None,
            created_at=db_conv.created_at,
            updated_at=db_conv.updated_at,
            messages=messages
        )
    
    @classmethod
    async def create_conversation(cls, db: Session, user_id: int, title: str, connection_id: Optional[int] = None) -> PydanticConversation:
        """Create a new conversation"""
        db_conv = DBConversation(
            user_id=user_id,
            title=title,
            connection_id=connection_id
        )
        
        db.add(db_conv)
        db.commit()
        db.refresh(db_conv)
        
        return cls._db_to_pydantic_conversation(db_conv)
    
    @classmethod
    async def get_conversation(cls, db: Session, user_id: int, conversation_id: int) -> Optional[PydanticConversation]:
        """Get a specific conversation"""
        db_conv = db.query(DBConversation).filter(
            DBConversation.id == conversation_id,
            DBConversation.user_id == user_id
        ).first()
        
        if not db_conv:
            return None
        
        return cls._db_to_pydantic_conversation(db_conv)
    
    @classmethod
    async def list_conversations(cls, db: Session, user_id: int) -> List[ConversationResponse]:
        """List all conversations for a user"""
        db_conversations = db.query(DBConversation).filter(
            DBConversation.user_id == user_id
        ).order_by(desc(DBConversation.updated_at)).all()
        
        responses = []
        for conv in db_conversations:
            # Get last message content efficiently
            last_message = None
            if conv.messages:
                # Assuming messages are ordered by creation time implicitly or we might need to sort
                # In SQLAlchemy relationship, we can define order_by, but here we rely on list order
                # Ideally we should query last message separately if list is huge, but for now this is fine
                last_msg = conv.messages[-1]
                last_message = last_msg.content[:100]
            
            responses.append(ConversationResponse(
                id=str(conv.id),
                title=conv.title,
                connection_id=str(conv.connection_id) if conv.connection_id else None,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                message_count=len(conv.messages),
                last_message=last_message
            ))
        
        return responses
    
    @classmethod
    async def update_conversation(cls, db: Session, user_id: int, conversation_id: int, title: Optional[str] = None, connection_id: Optional[int] = None) -> Optional[PydanticConversation]:
        """Update conversation metadata"""
        db_conv = db.query(DBConversation).filter(
            DBConversation.id == conversation_id,
            DBConversation.user_id == user_id
        ).first()
        
        if not db_conv:
            return None
        
        if title is not None:
            db_conv.title = title
        if connection_id is not None:
            db_conv.connection_id = connection_id
        
        # Update updated_at explicitly if needed, though onupdate=func.now() handles it on DB side
        # But SQLAlchemy object might need refresh to show it
        db.commit()
        db.refresh(db_conv)
        
        return cls._db_to_pydantic_conversation(db_conv)
    
    @classmethod
    async def delete_conversation(cls, db: Session, user_id: int, conversation_id: int) -> bool:
        """Delete a conversation"""
        db_conv = db.query(DBConversation).filter(
            DBConversation.id == conversation_id,
            DBConversation.user_id == user_id
        ).first()
        
        if not db_conv:
            return False
        
        db.delete(db_conv)
        db.commit()
        
        return True
    
    @classmethod
    async def add_message(cls, db: Session, user_id: int, conversation_id: int, role: str, content: str, metadata: Optional[dict] = None) -> Optional[PydanticConversation]:
        """Add a message to a conversation"""
        # Verify conversation exists and belongs to user
        db_conv = db.query(DBConversation).filter(
            DBConversation.id == conversation_id,
            DBConversation.user_id == user_id
        ).first()
        
        if not db_conv:
            return None
        
        db_msg = DBMessage(
            conversation_id=conversation_id,
            role=role,
            content=content,
            message_metadata=metadata
        )
        
        db.add(db_msg)
        # Update conversation updated_at
        db_conv.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_conv)
        
        return cls._db_to_pydantic_conversation(db_conv)
    
    @classmethod
    async def get_messages(cls, db: Session, user_id: int, conversation_id: int, limit: Optional[int] = None) -> List[PydanticMessage]:
        """Get messages from a conversation"""
        # Verify conversation ownership
        db_conv = db.query(DBConversation).filter(
            DBConversation.id == conversation_id,
            DBConversation.user_id == user_id
        ).first()
        
        if not db_conv:
            return []
        
        query = db.query(DBMessage).filter(
            DBMessage.conversation_id == conversation_id
        ).order_by(DBMessage.created_at)
        
        if limit:
            # This is a bit tricky with SQLAlchemy to get "last N" efficiently without subquery
            # For simplicity, let's get all and slice, or count and offset
            # Or order by desc, limit, then reverse
            # Let's try the python slicing for now as it matches previous logic, 
            # but for performance on large chats we should optimize later
            messages = query.all()
            messages = messages[-limit:]
        else:
            messages = query.all()
            
        return [cls._db_to_pydantic_message(msg) for msg in messages]
    
    @classmethod
    async def clear_messages(cls, db: Session, user_id: int, conversation_id: int) -> Optional[PydanticConversation]:
        """Clear all messages from a conversation"""
        db_conv = db.query(DBConversation).filter(
            DBConversation.id == conversation_id,
            DBConversation.user_id == user_id
        ).first()
        
        if not db_conv:
            return None
        
        # Delete messages
        db.query(DBMessage).filter(DBMessage.conversation_id == conversation_id).delete()
        
        db_conv.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_conv)
        
        return cls._db_to_pydantic_conversation(db_conv)
    
    @classmethod
    async def generate_title(cls, first_message: str) -> str:
        """Generate a title from the first message"""
        # Simple title generation - take first 50 chars
        title = first_message[:50].strip()
        if len(first_message) > 50:
            title += "..."
        return title or "New Conversation"
