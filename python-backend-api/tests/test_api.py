import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Chat API!"}

def test_some_api_endpoint():
    response = client.post("/api/some-endpoint", json={"key": "value"})
    assert response.status_code == 200
    assert "result" in response.json()