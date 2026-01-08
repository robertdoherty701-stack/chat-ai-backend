# Usar imagem com pandas já incluído
FROM continuumio/miniconda3:latest

WORKDIR /app

# Instalar pandas via conda (pré-compilado)
RUN conda install -y pandas=2.1.4 openpyxl

# Copiar requirements (sem pandas)
COPY requirements.txt .

# Instalar resto das dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Criar diretórios
RUN mkdir -p data/uploads data/exports

# Expor porta
EXPOSE 8000

# Comando
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
