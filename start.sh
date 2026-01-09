#!/bin/bash

# ===================================
# SCRIPT DE INICIALIZAÇÃO UNIFICADO
# Backend (FastAPI) + Frontend (Nginx)
# ===================================

set -e

echo "🚀 Iniciando container unificado..."
echo "📁 Diretório atual: $(pwd)"
echo "🐍 Versão Python: $(python --version)"
echo "🌐 Versão Nginx: $(nginx -v 2>&1)"

# ===================================
# Preparar ambiente
# ===================================
echo "🔧 Preparando ambiente..."

# Criar diretórios de log se não existirem
mkdir -p /var/log/nginx
mkdir -p /var/log/app

# Testar configuração do nginx
echo "🔍 Testando configuração do Nginx..."
nginx -t

# ===================================
# Função para cleanup ao sair
# ===================================
cleanup() {
    echo "🛑 Parando serviços..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$NGINX_PID" ]; then
        kill $NGINX_PID 2>/dev/null || true
    fi
    exit 0
}

# Capturar sinais para cleanup
trap cleanup SIGTERM SIGINT

# ===================================
# Iniciar Backend (FastAPI)
# ===================================
echo "🐍 Iniciando backend FastAPI..."
cd /app
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --log-level info > /var/log/app/backend.log 2>&1 &
BACKEND_PID=$!

echo "✅ Backend iniciado com PID: $BACKEND_PID"

# Aguardar backend estar pronto
echo "⏳ Aguardando backend estar pronto..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:8000/health > /dev/null 2>&1; then
        echo "✅ Backend está respondendo!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend não respondeu em 30 segundos"
        exit 1
    fi
    sleep 1
done

# ===================================
# Iniciar Nginx
# ===================================
echo "🌐 Iniciando Nginx..."
nginx > /var/log/app/nginx.log 2>&1 &
NGINX_PID=$!

echo "✅ Nginx iniciado com PID: $NGINX_PID"

# ===================================
# Monitoramento dos processos
# ===================================
echo "👀 Monitorando processos..."
echo "🔗 Aplicação disponível em: http://localhost"
echo "📊 Health check: http://localhost/health"
echo "🔧 API: http://localhost/api/"

# Loop de monitoramento
while true; do
    # Verificar se backend ainda está rodando
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend parou! Reiniciando..."
        cd /app
        uvicorn backend.main:app --host 127.0.0.1 --port 8000 --log-level info > /var/log/app/backend.log 2>&1 &
        BACKEND_PID=$!
        echo "🔄 Backend reiniciado com PID: $BACKEND_PID"
    fi

    # Verificar se nginx ainda está rodando
    if ! kill -0 $NGINX_PID 2>/dev/null; then
        echo "❌ Nginx parou! Reiniciando..."
        nginx > /var/log/app/nginx.log 2>&1 &
        NGINX_PID=$!
        echo "🔄 Nginx reiniciado com PID: $NGINX_PID"
    fi

    sleep 10
done