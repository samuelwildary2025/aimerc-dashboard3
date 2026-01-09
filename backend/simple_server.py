from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from datetime import datetime, timedelta
import jwt

app = FastAPI(
    title="Supermercado Queiroz - API Simples",
    description="Sistema SaaS de Gestão de Pedidos para Supermercados (Versão Simplificada)",
    version="1.0.0"
)

# Servir arquivos estáticos
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:4173", "http://localhost:4175", "http://192.168.0.6:4175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic
class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = None
    senha: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class Supermarket(BaseModel):
    id: Optional[int] = None
    name: str
    email: str
    phone: str
    plan: str
    status: str
    created_at: Optional[str] = None
    # Campos adicionais para gestão completa
    cnpj: Optional[str] = None
    address: Optional[str] = None
    responsible: Optional[str] = None
    monthly_value: Optional[float] = None
    due_day: Optional[int] = None
    next_due_date: Optional[str] = None
    tenant_id: Optional[int] = None
    logo_url: Optional[str] = None
    password_init: Optional[str] = None

class OrderItem(BaseModel):
    id: Optional[int] = None
    product_name: str
    quantity: int
    unit_price: float

class Order(BaseModel):
    id: Optional[int] = None
    client_name: str
    total: float
    status: str
    created_at: Optional[str] = None
    items: List[OrderItem] = []
    # Novos campos para informações completas do pedido
    phone: Optional[str] = None
    address: Optional[str] = None
    payment_method: Optional[str] = None
    observacoes: Optional[str] = None

class Client(BaseModel):
  id: Optional[int] = None
  name: str
  email: str
  phone: str
  status: str
  created_at: Optional[str] = None

# Dados em memória (simulando banco de dados)
users_db = [
    {
        "id": 1,
        "email": "admin@admin.com",
        "password": "admin123",  # Em produção, seria hash
        "name": "Administrador",
        "role": "admin"
    },
    {
        "id": 2,
        "email": "central@exemplo.com",
        "password": "admin123",
        "name": "Supermercado Central",
        "role": "cliente",
        "supermarket_id": 1
    }
]

supermarkets_db = [
    {
        "id": 1,
        "name": "Supermercado Central",
        "email": "central@exemplo.com",
        "phone": "(11) 99999-9999",
        "plan": "Premium",
        "status": "Ativo",
        "created_at": "2024-01-15T10:00:00",
        "monthly_value": 240.05,
        "due_day": 10,
        "next_due_date": "2024-12-10T00:00:00",
        "tenant_id": 1
    },
    {
        "id": 2,
        "name": "Mercado do Bairro",
        "email": "bairro@exemplo.com",
        "phone": "(11) 88888-8888",
        "plan": "Básico",
        "status": "Ativo",
        "created_at": "2024-02-01T14:30:00",
        "monthly_value": 120.0,
        "due_day": 5,
        "next_due_date": "2024-12-05T00:00:00",
        "tenant_id": 2
    }
]

orders_db = [
    {
        "id": 1,
        "client_name": "João Silva",
        "total": 150.75,
        "status": "pendente",
        "created_at": "2024-12-15T10:30:00",
        "supermarket_id": 1,
        "phone": "859999887766",
        "address": "Rua das Palmeiras, 120 - Centro, Caucaia/CE",
        "payment_method": "Cartão de crédito",
        "observacoes": "Teste com data sem timezone.",
        "items": [
            {"id": 1, "product_name": "Arroz 5kg", "quantity": 2, "unit_price": 25.50},
            {"id": 2, "product_name": "Feijão 1kg", "quantity": 3, "unit_price": 8.90},
            {"id": 3, "product_name": "Óleo de Soja", "quantity": 1, "unit_price": 6.75}
        ]
    },
    {
        "id": 2,
        "client_name": "Maria da Silva",
        "total": 28.50,
        "status": "faturado",
        "created_at": "2024-12-14T15:45:00",
        "supermarket_id": 1,
        "phone": "859999887766",
        "address": "Rua das Palmeiras, 120 - Centro, Caucaia/CE",
        "payment_method": "Cartão de crédito",
        "observacoes": "Teste com data sem timezone.",
        "items": [
            {"id": 4, "product_name": "Coca-Cola 2L", "quantity": 3, "unit_price": 0.0}
        ]
    }
]

SECRET_KEY = "sua_chave_secreta_aqui"

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

@app.get("/")
def read_root():
    return {"message": "Supermercado Queiroz - API Simples funcionando!"}

@app.post("/api/auth/login", response_model=LoginResponse)
def login(login_data: LoginRequest):
    pwd = login_data.password or login_data.senha or ""
    user = next((u for u in users_db if u["email"] == login_data.email and u["password"] == pwd), None)
    
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Clientes: token de longa duração (~10 anos). Outros: padrão (24h)
    if (user.get("role") or "").lower() == "cliente":
        access_token = create_access_token(data={"sub": user["email"], "role": user["role"]}, expires_delta=timedelta(days=3650))
    else:
        access_token = create_access_token(data={"sub": user["email"], "role": user["role"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "supermarket_id": user.get("supermarket_id")
        }
    }

@app.get("/api/supermarkets")
def get_supermarkets():
    return supermarkets_db

@app.post("/api/supermarkets")
def create_supermarket(supermarket: Supermarket):
    new_id = max([s["id"] for s in supermarkets_db]) + 1 if supermarkets_db else 1
    new_supermarket = supermarket.dict()
    new_supermarket["id"] = new_id
    new_supermarket["created_at"] = datetime.now().isoformat()
    # gerar tenant_id
    new_supermarket["tenant_id"] = new_id
    # calcular próxima data de vencimento se due_day informado
    if new_supermarket.get("due_day"):
        today = datetime.now()
        day = int(new_supermarket["due_day"])
        month = today.month
        year = today.year
        # se o dia já passou este mês, usar próximo mês
        if today.day > day:
            month += 1
            if month > 12:
                month = 1
                year += 1
        next_due = datetime(year, month, min(day, 28))  # simplificado para evitar meses com menos dias
        new_supermarket["next_due_date"] = next_due.isoformat()
    supermarkets_db.append(new_supermarket)
    
    # criar usuário principal vinculado
    if new_supermarket.get("email"):
        users_db.append({
            "id": max([u["id"] for u in users_db]) + 1 if users_db else 1,
            "email": new_supermarket["email"],
            "password": new_supermarket.get("password_init") or "admin123",
            "name": new_supermarket["name"],
            "role": "cliente",
            "supermarket_id": new_id
        })
    return new_supermarket

@app.put("/api/supermarkets/{supermarket_id}")
def update_supermarket(supermarket_id: int, supermarket: Supermarket):
    for i, s in enumerate(supermarkets_db):
        if s["id"] == supermarket_id:
            updated_supermarket = supermarket.dict()
            updated_supermarket["id"] = supermarket_id
            updated_supermarket["created_at"] = s["created_at"]
            supermarkets_db[i] = updated_supermarket
            return updated_supermarket
    raise HTTPException(status_code=404, detail="Supermercado não encontrado")

@app.delete("/api/supermarkets/{supermarket_id}")
def delete_supermarket(supermarket_id: int):
    for i, s in enumerate(supermarkets_db):
        if s["id"] == supermarket_id:
            del supermarkets_db[i]
            return {"message": "Supermercado deletado com sucesso"}
    raise HTTPException(status_code=404, detail="Supermercado não encontrado")

@app.get("/api/pedidos")
def get_orders(supermarket_id: int | None = None, status: str | None = None):
    # filtra por tenant quando informado
    result = orders_db
    if supermarket_id is not None:
        result = [o for o in result if o.get("supermarket_id") == supermarket_id]
    if status is not None:
        result = [o for o in result if (o.get("status") == status)]
    return result

@app.post("/api/pedidos")
def create_order(order: Order):
    new_id = max([o["id"] for o in orders_db]) + 1 if orders_db else 1
    new_order = order.dict()
    new_order["id"] = new_id
    new_order["created_at"] = datetime.now().isoformat()
    # se vier supermarket_id no payload, usa; caso contrário mantém existente ou 1
    if new_order.get("supermarket_id") is None:
        new_order["supermarket_id"] = 1
    orders_db.append(new_order)
    return new_order

@app.put("/api/pedidos/{order_id}")
def update_order(order_id: int, order: Order):
    for i, o in enumerate(orders_db):
        if o["id"] == order_id:
            updated_order = order.dict()
            updated_order["id"] = order_id
            updated_order["created_at"] = o["created_at"]
            updated_order["supermarket_id"] = o.get("supermarket_id", 1)
            orders_db[i] = updated_order
            return updated_order
    raise HTTPException(status_code=404, detail="Pedido não encontrado")

@app.delete("/api/pedidos/{order_id}")
def delete_order(order_id: int):
    for i, o in enumerate(orders_db):
        if o["id"] == order_id:
            del orders_db[i]
            return {"message": "Pedido deletado com sucesso"}
    raise HTTPException(status_code=404, detail="Pedido não encontrado")

@app.post("/api/supermarkets/{supermarket_id}/upload-logo")
async def upload_logo(supermarket_id: int, file: UploadFile = File(...)):
    # Validar tipo de arquivo
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido. Use JPEG, PNG, GIF ou WebP.")
    
    # Validar tamanho do arquivo (máximo 5MB)
    file_size = 0
    content = await file.read()
    file_size = len(content)
    
    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Tamanho máximo: 5MB.")
    
    # Verificar se o supermercado existe
    supermarket = None
    for s in supermarkets_db:
        if s["id"] == supermarket_id:
            supermarket = s
            break
    
    if not supermarket:
        raise HTTPException(status_code=404, detail="Supermercado não encontrado")
    
    # Criar diretório se não existir
    os.makedirs("uploads/logos", exist_ok=True)
    
    # Gerar nome único para o arquivo
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"logo_{supermarket_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
    file_path = f"uploads/logos/{filename}"
    
    # Salvar arquivo
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Atualizar URL do logo no banco de dados
    supermarket["logo_url"] = f"/uploads/logos/{filename}"
    
    return {
        "message": "Logo enviado com sucesso",
        "logo_url": supermarket["logo_url"]
    }

@app.get("/api/clients")
def get_clients():
  return clients_db

@app.post("/api/clients")
def create_client(client: Client):
  new_id = max([c["id"] for c in clients_db]) + 1 if clients_db else 1
  new_client = client.dict()
  new_client["id"] = new_id
  new_client["created_at"] = datetime.now().isoformat()
  clients_db.append(new_client)
  return new_client

@app.put("/api/clients/{client_id}")
def update_client(client_id: int, client: Client):
  idx = next((i for i, c in enumerate(clients_db) if c["id"] == client_id), None)
  if idx is None:
    raise HTTPException(status_code=404, detail="Cliente não encontrado")
  updated = clients_db[idx]
  for k, v in client.dict().items():
    if v is not None:
      updated[k] = v
  clients_db[idx] = updated
  return updated

@app.delete("/api/clients/{client_id}")
def delete_client(client_id: int):
  idx = next((i for i, c in enumerate(clients_db) if c["id"] == client_id), None)
  if idx is None:
    raise HTTPException(status_code=404, detail="Cliente não encontrado")
  removed = clients_db.pop(idx)
  return {"deleted": True, "client": removed}

clients_db = [
  {
    "id": 1,
    "name": "João Pedro",
    "email": "joao.pedro@exemplo.com",
    "phone": "(11) 91234-5678",
    "status": "Ativo",
    "created_at": "2024-03-10T09:15:00"
  },
  {
    "id": 2,
    "name": "Mariana Lima",
    "email": "mariana.lima@exemplo.com",
    "phone": "(21) 99876-5432",
    "status": "Inativo",
    "created_at": "2024-05-22T13:40:00"
  }
]

@app.put("/api/clients/{client_id}")
def update_client(client_id: int, client: Client):
  idx = next((i for i, c in enumerate(clients_db) if c["id"] == client_id), None)
  if idx is None:
    raise HTTPException(status_code=404, detail="Cliente não encontrado")
  updated = clients_db[idx]
  for k, v in client.dict().items():
    if v is not None:
      updated[k] = v
  clients_db[idx] = updated
  return updated

@app.delete("/api/clients/{client_id}")
def delete_client(client_id: int):
  idx = next((i for i, c in enumerate(clients_db) if c["id"] == client_id), None)
  if idx is None:
    raise HTTPException(status_code=404, detail="Cliente não encontrado")
  removed = clients_db.pop(idx)
  return {"deleted": True, "client": removed}

@app.get("/api/admin/financeiro/{tenant_id}")
def get_financeiro(tenant_id: int):
    invoices = [i for i in invoices_db if i["tenant_id"] == tenant_id]
    return {"tenant_id": tenant_id, "invoices": invoices}

@app.post("/api/admin/financeiro/{tenant_id}/fatura")
def gerar_fatura(tenant_id: int):
    # encontrar supermercado para valor mensal
    market = next((s for s in supermarkets_db if s.get("tenant_id") == tenant_id), None)
    value = market.get("monthly_value") if market else 0.0
    new_id = max([i["id"] for i in invoices_db]) + 1 if invoices_db else 1
    invoice = {
        "id": new_id,
        "tenant_id": tenant_id,
        "valor": value or 0.0,
        "mes_referencia": datetime.now().strftime("%Y-%m"),
        "status": "Pendente",
        "data_vencimento": market.get("next_due_date") if market else None,
        "data_pagamento": None
    }
    invoices_db.append(invoice)
    return invoice

@app.post("/api/email/boasvindas")
def email_boas_vindas(payload: dict):
    # Endpoint fictício: apenas retorna sucesso
    return {"sent": True, "to": payload.get("email"), "name": payload.get("name")}

# Faturas (financeiro) em memória
invoices_db = [
    {
        "id": 1,
        "tenant_id": 1,
        "valor": 240.05,
        "mes_referencia": "2024-11",
        "status": "Pago",
        "data_vencimento": "2024-11-10T00:00:00",
        "data_pagamento": "2024-11-09T12:00:00"
    },
    {
        "id": 2,
        "tenant_id": 1,
        "valor": 240.05,
        "mes_referencia": "2024-12",
        "status": "Pendente",
        "data_vencimento": "2024-12-10T00:00:00",
        "data_pagamento": None
    },
    {
        "id": 3,
        "tenant_id": 2,
        "valor": 120.0,
        "mes_referencia": "2024-12",
        "status": "Vencido",
        "data_vencimento": "2024-12-05T00:00:00",
        "data_pagamento": None
    }
]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)