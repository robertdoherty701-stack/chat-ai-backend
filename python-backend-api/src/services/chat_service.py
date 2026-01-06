from fastapi import HTTPException
from typing import List, Dict

class ChatService:
    def __init__(self):
        self.messages = []

    def send_message(self, user_id: str, message: str) -> Dict[str, str]:
        if not message:
            raise HTTPException(status_code=400, detail="Message cannot be empty.")
        
        chat_message = {
            "user_id": user_id,
            "message": message
        }
        self.messages.append(chat_message)
        return chat_message

    def get_messages(self) -> List[Dict[str, str]]:
        return self.messages

    def clear_messages(self) -> None:
        self.messages.clear()