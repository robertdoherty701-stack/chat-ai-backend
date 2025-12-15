def format_response(data, status_code=200):
    return {
        "status": "success" if status_code < 400 else "error",
        "data": data,
        "status_code": status_code
    }

def handle_exception(e):
    return format_response({"message": str(e)}, status_code=500)

def validate_request_data(data, required_fields):
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")