from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class User(BaseModel):
    id: int
    username: str
    created_at: datetime

class Message(BaseModel):
    id: int
    user_id: int
    content: str
    timestamp: datetime

class ChatSession(BaseModel):
    id: int
    user_id: int
    messages: List[Message]
    created_at: datetime
    updated_at: datetime

class ChatResponse(BaseModel):
    session_id: int
    response: str
    timestamp: datetime