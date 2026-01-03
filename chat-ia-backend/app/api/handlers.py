from fastapi import APIRouter, HTTPException
from app.services.chat_service import ChatService
from app.models.chat_models import Message

router = APIRouter()

@router.post("/send-message")
async def send_message(message: Message):
    try:
        response = await ChatService.process_message(message)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_chat_history():
    try:
        history = await ChatService.get_history()
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))