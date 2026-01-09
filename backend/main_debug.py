from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

print("🚀 Iniciando main_debug.py...")

app = FastAPI(
    title="Supermercado Queiroz - API DEBUG",
    description="Sistema SaaS de Gestão de Pedidos para Supermercados - DEBUG",
    version="1.0.0"
)

print("✅ FastAPI app criado")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas as origens para teste
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("✅ CORS configurado")

@app.get("/")
def read_root():
    return {"message": "Supermercado Queiroz - API DEBUG funcionando!"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "API está funcionando"}

print("✅ Rotas básicas configuradas")

# Tentar importar e incluir as rotas uma por uma
try:
    print("🔄 Tentando importar rotas de auth...")
    from routes.auth import router as auth_router
    app.include_router(auth_router)
    print("✅ Rotas de auth incluídas")
except Exception as e:
    print(f"❌ ERRO ao importar rotas de auth: {e}")

try:
    print("🔄 Tentando importar rotas de supermarkets...")
    from routes.supermarkets import router as supermarkets_router
    app.include_router(supermarkets_router)
    print("✅ Rotas de supermarkets incluídas")
except Exception as e:
    print(f"❌ ERRO ao importar rotas de supermarkets: {e}")

try:
    print("🔄 Tentando importar rotas de pedidos...")
    from routes.pedidos import router as pedidos_router
    app.include_router(pedidos_router)
    print("✅ Rotas de pedidos incluídas")
except Exception as e:
    print(f"❌ ERRO ao importar rotas de pedidos: {e}")

print("🎯 main_debug.py carregado completamente!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)