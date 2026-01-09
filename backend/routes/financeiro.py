from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
from models.user import User
from auth.middleware import require_admin
from models.supermarket import Supermarket

router = APIRouter(prefix="/api/admin/financeiro", tags=["financeiro"])

# Dados fictícios de faturas em memória (para demonstração)
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
    }
]

@router.get("/{tenant_id}")
def get_financeiro(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Obter informações financeiras de um cliente"""
    # Verificar se o supermercado existe
    supermarket = db.query(Supermarket).filter(Supermarket.id == tenant_id).first()
    if not supermarket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    # Filtrar faturas do cliente
    invoices = [i for i in invoices_db if i["tenant_id"] == tenant_id]
    
    return {
        "tenant_id": tenant_id,
        "invoices": invoices,
        "cliente": {
            "id": supermarket.id,
            "nome": supermarket.nome,
            "email": supermarket.email,
            "plano": supermarket.plano,
            "valor_mensal": supermarket.valor_mensal,
            "dia_vencimento": supermarket.dia_vencimento
        }
    }

@router.post("/{tenant_id}/fatura")
def gerar_fatura(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Gerar nova fatura para um cliente"""
    # Verificar se o supermercado existe
    supermarket = db.query(Supermarket).filter(Supermarket.id == tenant_id).first()
    if not supermarket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    # Definir valores por plano
    valores_plano = {
        "basico": 99.90,
        "premium": 199.90,
        "enterprise": 399.90
    }

    # Preferir valor_mensal configurado no supermercado; caso contrário, usar tabela por plano
    valor = supermarket.valor_mensal if supermarket.valor_mensal is not None else valores_plano.get(supermarket.plano, 99.90)
    
    # Gerar novo ID
    new_id = max([i["id"] for i in invoices_db], default=0) + 1
    
    # Criar nova fatura
    invoice = {
        "id": new_id,
        "tenant_id": tenant_id,
        "valor": valor,
        "mes_referencia": datetime.now().strftime("%Y-%m"),
        "status": "Pendente",
        "data_vencimento": datetime.now().strftime("%Y-%m-%dT00:00:00"),
        "data_pagamento": None
    }
    
    invoices_db.append(invoice)
    
    return invoice