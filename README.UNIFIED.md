# 🐳 Container Unificado - Wildhub

Este projeto foi configurado para rodar **Frontend (React/Vite)** e **Backend (FastAPI)** em um **único container Docker**.

## 📋 Arquivos Criados

- `Dockerfile.unified` - Dockerfile multi-stage para build unificado
- `nginx.conf` - Configuração do Nginx com proxy para API
- `start.sh` - Script alternativo de inicialização
- `docker-compose.unified.yml` - Compose para facilitar o deploy
- `README.UNIFIED.md` - Esta documentação

## 🚀 Como Usar

### Opção 1: Docker Compose (Recomendado)

```bash
# Build e start do container
docker-compose -f docker-compose.unified.yml up --build

# Em background
docker-compose -f docker-compose.unified.yml up --build -d

# Parar
docker-compose -f docker-compose.unified.yml down
```

### Opção 2: Docker Build Manual

```bash
# Build da imagem
docker build -f Dockerfile.unified -t wildhub-unified .

# Executar container
docker run -p 80:80 --name wildhub-unified wildhub-unified

# Com logs
docker run -p 80:80 --name wildhub-unified -v $(pwd)/logs:/var/log/app wildhub-unified
```

## 🌐 Acesso

- **Aplicação:** http://localhost
- **Health Check:** http://localhost/health
- **API:** http://localhost/api/

## 📁 Estrutura do Container

```
/app/
├── backend/          # Código do FastAPI
└── /usr/share/nginx/html/  # Build do React (frontend)
```

## 🔧 Configuração

### Nginx
- Serve arquivos estáticos do frontend
- Proxy `/api/*` para `http://127.0.0.1:8000`
- Headers de segurança
- Compressão GZIP
- Cache otimizado

### Backend
- FastAPI rodando na porta 8000 (interna)
- Uvicorn como servidor ASGI
- Logs em `/var/log/app/backend.log`

### Frontend
- Build do Vite servido pelo Nginx
- API configurada para usar `/api` como base URL
- Roteamento SPA com fallback

## 🔍 Monitoramento

### Logs
```bash
# Logs do container
docker logs wildhub-unified

# Logs específicos (se usando volume)
tail -f logs/backend.log
tail -f logs/nginx.log
```

### Health Check
```bash
curl http://localhost/health
```

## 🚨 Troubleshooting

### Container não inicia
1. Verifique se as portas estão livres: `lsof -i :80`
2. Verifique logs: `docker logs wildhub-unified`
3. Teste build: `docker build -f Dockerfile.unified -t test .`

### API não responde
1. Verifique se backend está rodando: `curl http://localhost/health`
2. Teste proxy: `curl http://localhost/api/`
3. Verifique logs do backend

### Frontend não carrega
1. Verifique se build foi criado corretamente
2. Teste Nginx: `docker exec wildhub-unified nginx -t`
3. Verifique permissões dos arquivos

## 📦 Deploy no EasyPanel

1. Faça upload dos arquivos para seu projeto
2. Configure as variáveis de ambiente necessárias
3. Use o `Dockerfile.unified` como Dockerfile principal
4. Configure a porta 80 como porta de exposição
5. Deploy!

## 🔄 Desenvolvimento

Para desenvolvimento local, você ainda pode usar os containers separados:
- Frontend: `cd frontend && npm run dev`
- Backend: `cd backend && uvicorn main:app --reload`

O container unificado é ideal para **produção** e **staging**.

## 📝 Notas Importantes

- O container usa **Supervisor** para gerenciar múltiplos processos
- Nginx serve na porta 80 (externa)
- FastAPI roda na porta 8000 (interna)
- Logs são centralizados em `/var/log/`
- Health check disponível em `/health`