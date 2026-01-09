from fastapi import FastAPI

app = FastAPI(
    title="Teste Simples - API",
    description="Teste para verificar se as rotas funcionam",
    version="1.0.0"
)

@app.get("/")
def read_root():
    return {"message": "Teste simples funcionando!"}

@app.get("/test")
def test_route():
    return {"message": "Rota de teste funcionando!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)