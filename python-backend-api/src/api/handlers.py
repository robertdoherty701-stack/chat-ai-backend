from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter()

class Message(BaseModel):
    user_id: str
    content: str

@router.post("/messages/", response_model=Message)
async def create_message(message: Message):
    # Logic to process the message and save it
    return message

@router.get("/messages/", response_model=List[Message])
async def get_messages():
    # Logic to retrieve messages
    return []  # Return an empty list for now

@router.delete("/messages/{message_id}", response_model=dict)
async def delete_message(message_id: str):
    # Logic to delete a message by ID
    return {"message": "Message deleted successfully"}