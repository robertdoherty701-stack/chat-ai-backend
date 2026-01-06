from fastapi import UploadFile, File
import os

class FileService:
    def __init__(self, upload_directory: str):
        self.upload_directory = upload_directory
        os.makedirs(self.upload_directory, exist_ok=True)

    def save_file(self, file: UploadFile):
        file_location = os.path.join(self.upload_directory, file.filename)
        with open(file_location, "wb+") as file_object:
            file_object.write(file.file.read())
        return file_location

    def validate_file(self, file: UploadFile):
        allowed_extensions = ['.xlsx', '.xls', '.csv']
        if not any(file.filename.endswith(ext) for ext in allowed_extensions):
            raise ValueError("Invalid file type. Only .xlsx, .xls, and .csv files are allowed.")
        return True

    def process_file(self, file: UploadFile):
        self.validate_file(file)
        file_path = self.save_file(file)
        # Add further processing logic here if needed
        return file_path