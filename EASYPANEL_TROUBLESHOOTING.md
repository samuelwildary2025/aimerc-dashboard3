# 🔧 Troubleshooting - EasyPanel

## Problema Identificado

O EasyPanel está executando uma versão antiga ou diferente do código. Evidências:

1. **API Title Incorreto**: O OpenAPI schema mostra "Wild Merc Backend" em vez de "Supermercado Queiroz - API"
2. **Rotas Ausentes**: Apenas `/` e `/health` estão disponíveis, faltam todas as rotas de `/api/auth`, `/api/supermarkets`, etc.
3. **Mensagem Diferente**: A rota `/` retorna uma mensagem diferente da esperada

## Soluções para Tentar

### 1. Rebuild Completo do Container

No EasyPanel:
1. Vá para o seu serviço
2. Clique em "Rebuild" ou "Redeploy"
3. Aguarde o build completo (pode demorar alguns minutos)

### 2. Verificar Configuração do Build

Certifique-se de que:
- **Source**: Aponta para o repositório correto (`samuelwildary2025/wildhub-sistemasupermercado`)
- **Branch**: Está configurado para `master`
- **Build Context**: Está configurado para `backend/` (se aplicável)
- **Dockerfile**: Está usando `backend/Dockerfile`

### 3. Limpar Cache do Docker

No EasyPanel, tente:
1. Parar o serviço
2. Deletar o serviço
3. Recriar o serviço do zero

### 4. Verificar Logs do Container

1. Acesse os logs do container no EasyPanel
2. Procure por mensagens como:
   ```
   🏗️  Criando tabelas no banco de dados...
   ✅ Tabelas criadas com sucesso!
   🚀 Iniciando aplicação...
   ```

Se não vir essas mensagens, o container não está executando o código correto.

### 5. Testar com Dockerfile de Debug

Temporariamente, você pode alterar o Dockerfile para usar o `main_debug.py`:

```dockerfile
# No final do Dockerfile, altere:
CMD ["uvicorn", "main_debug:app", "--host", "0.0.0.0", "--port", "8000"]
```

Isso mostrará logs detalhados sobre quais rotas estão sendo carregadas.

### 6. Verificar Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas no EasyPanel:

```
DATABASE_URL=postgresql://postgres:Theo2023.@wildhub_db_sistema_super_mercado:5432/wildhub?sslmode=disable
SECRET_KEY=your-super-secret-key-change-in-production-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=false
```

## Como Verificar se o Problema Foi Resolvido

Após fazer as mudanças, teste:

1. **Verificar API Title**:
   ```bash
   curl -X GET "http://SEU_IP:8000/openapi.json" | grep "title"
   ```
   Deve retornar: `"title": "Supermercado Queiroz - API"`

2. **Testar Login**:
   ```bash
   curl -X POST "http://SEU_IP:8000/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@admin.com", "senha": "admin123"}'
   ```
   Deve retornar um token JWT ou erro de credenciais (não "Not Found")

3. **Verificar Rotas Disponíveis**:
   Acesse `http://SEU_IP:8000/docs` e verifique se todas as rotas estão listadas:
   - `/api/auth/login`
   - `/api/auth/register`
   - `/api/supermarkets`
   - `/api/pedidos`
   - etc.

## Arquivos de Debug Criados

Para ajudar no diagnóstico, foram criados:

- `backend/main_debug.py`: Versão com logs detalhados
- `backend/test_simple.py`: Teste básico do FastAPI
- `backend/Dockerfile.debug`: Dockerfile para usar o main_debug.py

## Próximos Passos

1. Tente o rebuild completo primeiro
2. Se não funcionar, verifique a configuração do build
3. Use os arquivos de debug se necessário
4. Verifique os logs do container para identificar o problema exato

## Contato

Se o problema persistir, forneça:
1. Screenshots da configuração do EasyPanel
2. Logs completos do container
3. Resultado dos comandos de teste acima