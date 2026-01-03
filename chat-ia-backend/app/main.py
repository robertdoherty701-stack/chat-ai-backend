from fastapi import FastAPI
from app.api.routes import router as api_router
from app.config import settings

app = FastAPI(title="Chat IA Backend", version="1.0")

@app.on_event("startup")
async def startup_event():
    # Initialize resources if needed
    pass

@app.on_event("shutdown")
async def shutdown_event():
    # Clean up resources if needed
    pass

app.include_router(api_router, prefix=settings.API_PREFIX)