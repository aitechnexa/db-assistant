from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: Optional[datetime] = None
    metadata: Optional[dict] = None

class Conversation(BaseModel):
    id: str
    user_id: str
    title: str
    connection_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessage] = []

class ConversationCreate(BaseModel):
    title: str
    connection_id: Optional[str] = None

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    connection_id: Optional[str] = None

class ConversationResponse(BaseModel):
    id: str
    title: str
    connection_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: int
    last_message: Optional[str] = None
