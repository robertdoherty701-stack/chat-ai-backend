def validate_message(message):
    if not isinstance(message, str):
        raise ValueError("A mensagem deve ser uma string.")
    if len(message) == 0:
        raise ValueError("A mensagem não pode estar vazia.")
    if len(message) > 500:
        raise ValueError("A mensagem não pode exceder 500 caracteres.")
    return True

def validate_file(file):
    if not file:
        raise ValueError("Nenhum arquivo foi enviado.")
    if not file.filename:
        raise ValueError("O arquivo deve ter um nome.")
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise ValueError("O arquivo deve ser do tipo .xlsx, .xls ou .csv.")
    return True