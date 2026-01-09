FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema (PostgreSQL e compilação)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependências Python
COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir psycopg2-binary==2.9.9 \
 && pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .

# Variáveis de ambiente básicas
ENV PYTHONUNBUFFERED=1 \
    PORT=80

# Expor porta 80 (padrão HTTP)
EXPOSE 80

# Rodar servidor FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]
