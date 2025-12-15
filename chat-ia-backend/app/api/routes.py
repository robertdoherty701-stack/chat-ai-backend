from fastapi import APIRouter
from app.api.handlers import send_message, upload_file, get_chat_history

router = APIRouter()

@router.post("/send-message")
async def send_message_route(message: str):
    return await send_message(message)

@router.post("/upload-file")
async def upload_file_route(file: bytes):
    return await upload_file(file)

@router.get("/chat-history")
async def chat_history_route():
    return await get_chat_history()