def generate_response(message):
    # Função para gerar uma resposta padrão para mensagens
    return {
        "status": "success",
        "message": message
    }

def format_message(user, text):
    # Função para formatar uma mensagem de chat
    return {
        "user": user,
        "text": text,
        "timestamp": datetime.utcnow().isoformat()
    }

def log_error(error_message):
    # Função para registrar erros em um log
    with open("error.log", "a") as log_file:
        log_file.write(f"{datetime.utcnow().isoformat()} - ERROR: {error_message}\n")