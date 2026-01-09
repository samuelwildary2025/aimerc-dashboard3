# Sistema de Supermercado

Sistema completo de gestão de supermercados com autenticação híbrida (JWT + tokens manuais) para integração com sistemas externos.

## 🚀 Funcionalidades

### Autenticação Híbrida
- **JWT Tokens**: Para autenticação web tradicional
- **Tokens Manuais**: Para integração com sistemas externos (ERPs, PDVs, etc.)
- Middleware inteligente que valida ambos os tipos de token

### Gestão de Supermercados
- Cadastro e gerenciamento de supermercados
- Configuração de tokens manuais personalizados
- Interface web para administração

### Sistema de Pedidos
- Criação de pedidos via API
- Suporte a múltiplos itens por pedido
- Validação automática de tenant (supermercado)

### Dashboard Administrativo
- Painel de controle completo
- Visualização de pedidos em tempo real
- Gestão de supermercados cadastrados

## 🛠️ Tecnologias

### Backend
- **FastAPI**: Framework web moderno e rápido
- **SQLite**: Banco de dados leve e eficiente
- **Pydantic**: Validação de dados
- **JWT**: Autenticação segura

### Frontend
- **React**: Biblioteca para interfaces de usuário
- **Vite**: Build tool rápido
- **Tailwind CSS**: Framework CSS utilitário
- **Axios**: Cliente HTTP

## 📦 Instalação

### Pré-requisitos
- Python 3.8+
- Node.js 16+
- npm ou yarn

## 🚀 Instalação e Execução

### Opção 1: Docker Compose (Recomendado)

1. **Clone o repositório:**
```bash
git clone <url-do-repositorio>
cd sistema-supermercado
```

2. **Execute com Docker Compose:**
```bash
docker-compose up --build
```

3. **Acesse as aplicações:**
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Documentação da API:** http://localhost:8000/docs
- **pgAdmin:** http://localhost:5050 (opcional)

### Opção 2: Desenvolvimento Local

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Banco de dados
```bash
# Execute PostgreSQL via Docker
docker run --name postgres-supermercado \
  -e POSTGRES_DB=supermercado_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -p 5432:5432 \
  -d postgres:15-alpine
```

## 🔐 Credenciais de Acesso

### Usuário Administrador
- **Email:** admin@admin.com
- **Senha:** admin123

### Usuários de Teste (Supermercados)
- **Email:** central@exemplo.com | **Senha:** admin123
- **Email:** bairro@exemplo.com | **Senha:** admin123
- **Email:** atacado@exemplo.com | **Senha:** admin123

## 📊 Estrutura do Projeto

```
sistema-supermercado/
├── backend/
│   ├── auth/                 # Autenticação e middleware
│   ├── models/              # Modelos do banco de dados
│   ├── routes/              # Rotas da API
│   ├── schemas/             # Schemas Pydantic
│   ├── database.py          # Configuração do banco
│   ├── main.py              # Aplicação principal
│   ├── requirements.txt     # Dependências Python
│   └── Dockerfile           # Container do backend
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── services/        # Serviços de API
│   │   ├── App.jsx          # Componente principal
│   │   └── main.jsx         # Ponto de entrada
│   ├── package.json         # Dependências Node.js
│   ├── Dockerfile           # Container do frontend
│   └── nginx.conf           # Configuração Nginx
├── docker-compose.yml       # Orquestração dos containers
├── init.sql                 # Script de inicialização do DB
└── README.md               # Este arquivo
```

## 🔧 Configuração

### Variáveis de Ambiente

#### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/supermercado_db
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### Frontend
```env
REACT_APP_API_URL=http://localhost:8000
```

## 📚 API Endpoints

### Autenticação
- `POST /auth/register` - Registrar novo usuário
- `POST /auth/login` - Login de usuário

### Supermercados (Admin apenas)
- `GET /supermarkets/` - Listar supermercados
- `POST /supermarkets/` - Criar supermercado
- `GET /supermarkets/{id}` - Obter supermercado
- `PUT /supermarkets/{id}` - Atualizar supermercado
- `DELETE /supermarkets/{id}` - Excluir supermercado

### Pedidos (Multi-tenant)
- `GET /pedidos/` - Listar pedidos do tenant
- `POST /pedidos/` - Criar pedido
- `GET /pedidos/{id}` - Obter pedido
- `PUT /pedidos/{id}` - Atualizar pedido
- `DELETE /pedidos/{id}` - Excluir pedido

## 🎨 Interface do Usuário

### Tema Escuro
- Paleta de cores moderna e profissional
- Componentes responsivos para desktop e mobile
- Ícones da biblioteca Lucide React
- Animações suaves e feedback visual

### Componentes Principais
- **Sidebar:** Navegação lateral com menu dinâmico
- **Header:** Cabeçalho com busca e notificações
- **Cards:** Exibição de pedidos e estatísticas
- **Gráficos:** Visualização de dados com Recharts
- **Modais:** Formulários para CRUD operations

## 🔒 Segurança

- **Autenticação JWT** com tokens seguros
- **Middleware multi-tenant** para isolamento de dados
- **Validação de entrada** em todas as rotas
- **Headers de segurança** configurados no Nginx
- **Senhas hasheadas** com bcrypt

## 📈 Monitoramento

### Logs
- Logs estruturados no backend
- Tratamento de erros centralizado
- Monitoramento de performance

### Métricas
- Dashboard com estatísticas em tempo real
- Gráficos de vendas e pedidos
- Análise de performance por supermercado

## 🚀 Deploy em Produção

### Docker Compose
```bash
# Para produção, use:
docker-compose -f docker-compose.prod.yml up -d
```

### Configurações de Produção
1. Altere as senhas padrão
2. Configure SSL/TLS
3. Use um banco PostgreSQL dedicado
4. Configure backup automático
5. Monitore logs e métricas

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o sistema:

- **Email:** suporte@supermercadoqueiroz.com
- **Documentação da API:** http://localhost:8000/docs
- **Issues:** Abra uma issue no repositório

## 🔄 Atualizações

### Versão 1.0.0
- ✅ Sistema de autenticação multi-tenant
- ✅ CRUD completo de supermercados e pedidos
- ✅ Dashboard administrativo
- ✅ Analytics com gráficos
- ✅ Interface responsiva com tema escuro
- ✅ Containerização com Docker

### Próximas Versões
- 🔄 Sistema de notificações em tempo real
- 🔄 Relatórios em PDF
- 🔄 Integração com sistemas de pagamento
- 🔄 App mobile React Native
- 🔄 Sistema de backup automático