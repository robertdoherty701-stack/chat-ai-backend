# Chat IA Backend

Este projeto é um sistema de chat que integra uma inteligência artificial para interagir com os usuários. O backend é desenvolvido em Python e utiliza uma arquitetura modular para facilitar a manutenção e a escalabilidade.

## Estrutura do Projeto

```
chat-ia-backend
├── app
│   ├── __init__.py
│   ├── main.py
│   ├── api
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   └── handlers.py
│   ├── services
│   │   ├── __init__.py
│   │   ├── chat_service.py
│   │   ├── file_service.py
│   │   └── ai_service.py
│   ├── models
│   │   ├── __init__.py
│   │   └── chat_models.py
│   ├── utils
│   │   ├── __init__.py
│   │   ├── validators.py
│   │   └── helpers.py
│   └── config.py
├── tests
│   ├── __init__.py
│   ├── test_api.py
│   └── test_services.py
├── requirements.txt
├── .env.example
└── README.md
```

## Instalação

1. Clone o repositório:
   ```
   git clone <URL_DO_REPOSITORIO>
   cd chat-ia-backend
   ```

2. Crie um ambiente virtual:
   ```
   python -m venv venv
   ```

3. Ative o ambiente virtual:
   - No Windows:
     ```
     venv\Scripts\activate
     ```
   - No macOS/Linux:
     ```
     source venv/bin/activate
     ```

4. Instale as dependências:
   ```
   pip install -r requirements.txt
   ```

5. Configure as variáveis de ambiente. Renomeie o arquivo `.env.example` para `.env` e ajuste as configurações conforme necessário.

## Uso

Para iniciar o servidor, execute o seguinte comando:

```
python app/main.py
```

O servidor estará disponível em `http://localhost:5000`.

## Testes

Os testes podem ser executados com o seguinte comando:

```
pytest
```

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir um pull request ou relatar problemas.

## Licença

Este projeto está licenciado sob a MIT License. Veja o arquivo LICENSE para mais detalhes.