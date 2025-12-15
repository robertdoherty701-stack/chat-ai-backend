from fastapi import HTTPException
import requests
import os

class AIService:
    def __init__(self):
        self.api_url = os.getenv("AI_API_URL")
        self.api_key = os.getenv("AI_API_KEY")

    def query_ai(self, user_input: str):
        if not self.api_url or not self.api_key:
            raise HTTPException(status_code=500, detail="AI API configuration is missing.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "input": user_input
        }

        try:
            response = requests.post(self.api_url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise HTTPException(status_code=500, detail=f"Error querying AI: {str(e)}")