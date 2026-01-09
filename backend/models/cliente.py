from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Cliente(Base):
    __tablename__ = "clientes"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    telefone = Column(String(20), nullable=False)
    cpf = Column(String(14), unique=True, nullable=True)
    endereco = Column(String(200), nullable=True)
    numero = Column(String(10), nullable=True)
    complemento = Column(String(100), nullable=True)
    bairro = Column(String(100), nullable=True)
    cidade = Column(String(100), nullable=True)
    estado = Column(String(2), nullable=True)
    cep = Column(String(9), nullable=True)
    ativo = Column(Boolean, default=True)
    tenant_id = Column(Integer, ForeignKey("supermarkets.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento com supermercado
    supermarket = relationship("Supermarket", back_populates="clientes")
    
    # Relacionamento com pedidos
    pedidos = relationship("Pedido", back_populates="cliente")