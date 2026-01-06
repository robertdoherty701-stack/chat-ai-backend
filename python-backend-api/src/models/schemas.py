from pydantic import BaseModel
from typing import List, Optional

class MessageSchema(BaseModel):
    user_id: str
    content: str
    timestamp: str

class ChatSchema(BaseModel):
    chat_id: str
    messages: List[MessageSchema]
    created_at: str
    updated_at: Optional[str] = None

class UserSchema(BaseModel):
    user_id: str
    username: str
    email: str
    created_at: str
    updated_at: Optional[str] = None