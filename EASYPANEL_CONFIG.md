# Configuração para EasyPanel (Produção)

## 🗄️ Banco de Dados PostgreSQL

Para usar o banco PostgreSQL no EasyPanel, configure as seguintes variáveis de ambiente:

### Variáveis de Ambiente Necessárias:

```env
DATABASE_URL=postgresql://postgres:Theo2023.@wildhub_db_sistema_super_mercado:5432/wildhub?sslmode=disable
SECRET_KEY=your-super-secret-key-change-in-production-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## 🚀 Deploy no EasyPanel

1. **Fazer push das alterações para o GitHub**
2. **No EasyPanel, configurar as variáveis de ambiente acima**
3. **Fazer rebuild do container**
4. **O sistema automaticamente usará PostgreSQL em produção**

## 🔧 Configuração Automática

O sistema está configurado para:
- **Desenvolvimento Local**: SQLite (`supermercado.db`)
- **Produção (EasyPanel)**: PostgreSQL (via `DATABASE_URL`)

## 📋 Dependências Incluídas

O `requirements.txt` já inclui:
- `psycopg2-binary==2.9.9` (driver PostgreSQL)
- `httpx==0.28.1` (requisições HTTP)
- `email-validator==2.3.0` (validação de email)

## 🔍 Diagnóstico de Problemas

Se as tabelas não forem criadas automaticamente:

### 1. Verificar Logs do Container
No EasyPanel, verifique os logs do container para mensagens como:
- `🏗️ Criando tabelas no banco de dados...`
- `✅ Tabelas criadas com sucesso!`
- `🔌 Testando conexão com banco de dados...`
- `✅ PostgreSQL conectado:`

### 2. Executar Script de Diagnóstico
Use o script `test_db_connection.py` para diagnosticar:
```bash
python test_db_connection.py
```

### 3. Verificar Variáveis de Ambiente
Certifique-se de que:
- `DATABASE_URL` está configurada corretamente
- Não há espaços extras nas variáveis
- A string de conexão está no formato correto

### 4. Problemas Comuns

**Erro de Conexão:**
- Verificar se o serviço PostgreSQL está rodando
- Confirmar credenciais e host do banco

**Tabelas não criadas:**
- Verificar se há erros nos logs de startup
- Confirmar se todos os modelos estão sendo importados

**Permissões:**
- Verificar se o usuário PostgreSQL tem permissões para criar tabelas

## ✅ Status

- ✅ Código atualizado no GitHub
- ✅ Dependências corrigidas
- ✅ Configuração híbrida (SQLite local / PostgreSQL produção)
- ✅ Logging melhorado para diagnóstico
- ✅ Script de teste de conexão incluído
- ✅ Pronto para deploy no EasyPanel