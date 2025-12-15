import pytest
from app.services.chat_service import ChatService
from app.services.ai_service import AIService

@pytest.fixture
def chat_service():
    return ChatService()

@pytest.fixture
def ai_service():
    return AIService()

def test_send_message(chat_service):
    response = chat_service.send_message("Hello, AI!")
    assert response is not None
    assert "response" in response

def test_receive_message(ai_service):
    response = ai_service.get_response("What is the weather today?")
    assert response is not None
    assert "weather" in response.lower() or "forecast" in response.lower()

def test_chat_service_integration(chat_service, ai_service):
    user_message = "Tell me a joke."
    chat_service.send_message(user_message)
    response = ai_service.get_response(user_message)
    assert response is not None
    assert "joke" in response.lower() or "funny" in response.lower()