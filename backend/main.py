from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
# 🔧 Removido o ProxyHeadersMiddleware (incompatível nas versões atuais)
from sqlalchemy.orm import Session
from database import engine, get_db
from sqlalchemy import text
from models import User, Supermarket, Pedido, ItemPedido
from models.user import User as UserModel
from models.supermarket import SupermarketHistory
from models.cliente import Cliente
from routes import auth_router, auth_alias_router, supermarkets_router, pedidos_router
from routes.financeiro import router as financeiro_router
from routes.clientes import router as clientes_router
from auth.jwt_handler import get_password_hash


# ==========================================
# 🔨 Criação automática das tabelas no banco
# ==========================================
try:
    print("🏗️  Criando tabelas no banco de dados...")
    UserModel.metadata.create_all(bind=engine)
    Supermarket.metadata.create_all(bind=engine)
    Pedido.metadata.create_all(bind=engine)
    ItemPedido.metadata.create_all(bind=engine)
    SupermarketHistory.metadata.create_all(bind=engine)
    Cliente.metadata.create_all(bind=engine)
    print("✅ Tabelas criadas com sucesso!")
except Exception as e:
    print(f"❌ ERRO ao criar tabelas: {e}")
    import traceback
    traceback.print_exc()


# ==========================================
# 🚀 Inicialização do FastAPI
# ==========================================
app = FastAPI(
    title="Supermercado Queiroz - API",
    description="Sistema SaaS de Gestão de Pedidos para Supermercados",
    version="1.0.0"
)


# ==========================================
# 🌐 CORS (liberação de domínios do frontend)
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "https://wildhub-frontend-sistema-super-mercado.5mos1l.easypanel.host",
        "http://wildhub-frontend-sistema-super-mercado.5mos1l.easypanel.host",
        "https://wildhub-sistema-supermercado.5mos1l.easypanel.host",
        "http://wildhub-sistema-supermercado.5mos1l.easypanel.host",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# 🧩 Registro das rotas
# ==========================================
app.include_router(auth_router)
app.include_router(auth_alias_router)
app.include_router(supermarkets_router)
app.include_router(pedidos_router)
app.include_router(financeiro_router)
app.include_router(clientes_router)


# ==========================================
# 🔍 Rotas de debug e verificação
# ==========================================
@app.get("/")
def read_root():
    return {"message": "Supermercado Queiroz API - Sistema SaaS de Gestão de Pedidos"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/debug/info")
def debug_info():
    import os
    return {
        "status": "running",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "database_connected": True,
        "cors_enabled": True,
    }

@app.get("/debug/routes")
def debug_routes():
    return {
        "total_routes": len(app.routes),
        "route_paths": [route.path for route in app.routes]
    }


# ==========================================
# ⚙️ Evento de inicialização (startup)
# ==========================================
@app.on_event("startup")
async def startup_event():
    print("🚀 API iniciada com sucesso!")
    import os

    admin_email = os.getenv("ADMIN_EMAIL", "admin@admin.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    admin_name = os.getenv("ADMIN_NAME", "Administrador")

    try:
        db = next(get_db())
        admin_user = db.query(UserModel).filter(UserModel.email == admin_email).first()

        if not admin_user:
            print(f"👤 Criando usuário admin: {admin_email}")
            admin_user = UserModel(
                nome=admin_name,
                email=admin_email,
                senha_hash=get_password_hash(admin_password),
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            print(f"✅ Usuário admin criado: {admin_email}")
        else:
            print(f"👤 Usuário admin já existe: {admin_email}")
    except Exception as e:
        print(f"❌ Erro ao criar usuário admin: {e}")
    finally:
        db.close()

    print("📊 Rotas disponíveis:")
    for route in app.routes:
        print(f"  {route.methods} {route.path}")


# ==========================================
# 🔥 Execução local (modo standalone)
# ==========================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=80)
