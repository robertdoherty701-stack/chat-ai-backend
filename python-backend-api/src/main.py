from fastapi import FastAPI
from src.api.routes import router as api_router
from src.config import settings

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Chat API"}

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)