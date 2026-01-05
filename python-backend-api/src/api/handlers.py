from fastapi import HTTPException


async def handle_message(message: str):
    """Handle incoming chat message"""
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    return {"reply": message}


async def handle_file_upload(file: bytes):
    """Handle file upload"""
    if not file:
        raise HTTPException(status_code=400, detail="File content is empty")
    return {"status": "received", "size": len(file)}