FROM python:3.11-slim

WORKDIR /app

# Instalar dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Criar diretórios
RUN mkdir -p data/uploads data/exports

# Expor porta
EXPOSE 8000

# Comando
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
