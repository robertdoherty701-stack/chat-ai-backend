import os

class Config:
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key')
    AI_API_URL = os.getenv('AI_API_URL', 'https://api.example.com/ai')
    AI_API_KEY = os.getenv('AI_API_KEY', 'your_api_key')
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', './uploads')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16 MB
    ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}