from fastapi import APIRouter
from .handlers import handle_message, handle_file_upload

router = APIRouter()

@router.post("/chat/message")
async def send_message(message: str):
    return await handle_message(message)

@router.post("/chat/upload")
async def upload_file(file: bytes):
    return await handle_file_upload(file)