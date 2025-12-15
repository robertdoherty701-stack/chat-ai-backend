from flask import jsonify, request
from app.services.ai_service import AIService
from app.models.chat_models import Message

class ChatService:
    def __init__(self):
        self.ai_service = AIService()

    def send_message(self, user_id, content):
        # Create a message object
        message = Message(user_id=user_id, content=content)
        
        # Process the message with AI
        response = self.ai_service.process_message(message)
        
        # Return the response
        return jsonify({
            'user_message': message.content,
            'ai_response': response
        })

    def get_chat_history(self, user_id):
        # This method should retrieve chat history for the user
        # Placeholder for chat history retrieval logic
        return jsonify({
            'user_id': user_id,
            'history': []  # Replace with actual history data
        })