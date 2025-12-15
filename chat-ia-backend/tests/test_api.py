from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api.routes import router

app = FastAPI()
app.include_router(router)

client = TestClient(app)

def test_get_chat_response():
    response = client.post("/api/chat", json={"message": "Hello, AI!"})
    assert response.status_code == 200
    assert "response" in response.json()

def test_invalid_chat_request():
    response = client.post("/api/chat", json={"invalid_key": "Hello, AI!"})
    assert response.status_code == 422

def test_file_upload():
    with open("tests/test_file.txt", "w") as f:
        f.write("Test file content")
    
    with open("tests/test_file.txt", "rb") as f:
        response = client.post("/api/upload", files={"file": f})
        assert response.status_code == 200
        assert "filename" in response.json()

def test_invalid_file_upload():
    response = client.post("/api/upload", files={"file": ("test.txt", b"content", "text/plain")})
    assert response.status_code == 400  # Assuming the endpoint validates file types

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}