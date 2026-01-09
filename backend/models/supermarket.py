from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Supermarket(Base):
    __tablename__ = "supermarkets"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Dados básicos
    nome = Column(String(100), nullable=False)
    cnpj = Column(String(18), unique=True, nullable=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    telefone = Column(String(20), nullable=False)
    
    # Endereço
    cep = Column(String(9), nullable=False)
    endereco = Column(String(200), nullable=False)
    numero = Column(String(10), nullable=False)
    complemento = Column(String(100), nullable=True)
    bairro = Column(String(100), nullable=False)
    cidade = Column(String(100), nullable=False)
    estado = Column(String(2), nullable=False)
    
    # Dados operacionais
    horario_funcionamento = Column(JSON, nullable=True)  # {"segunda": "08:00-18:00", ...}
    metodos_pagamento = Column(JSON, nullable=True)  # ["dinheiro", "cartao", "pix"]
    categorias_produtos = Column(JSON, nullable=True)  # ["alimenticios", "limpeza", ...]
    capacidade_estocagem = Column(Integer, nullable=True)  # em m²
    
    # Dados de gestão
    responsavel = Column(String(100), nullable=True)
    valor_mensal = Column(Float, nullable=True)  # valor em reais
    dia_vencimento = Column(Integer, nullable=True)  # dia do mês (1-31)
    
    # Logo e mídia
    logo_url = Column(String, nullable=True)
    
    # Sistema
    plano = Column(String, default="basico")
    ativo = Column(Boolean, default=True)
    custom_token = Column(String, nullable=True)  # Token manual para API
    whatsapp_instance_token = Column(String, nullable=True)  # Token da instância do WhatsApp
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    users = relationship("User", back_populates="supermarket")
    pedidos = relationship("Pedido", back_populates="supermarket")
    clientes = relationship("Cliente", back_populates="supermarket")
    historico_alteracoes = relationship("SupermarketHistory", back_populates="supermarket", cascade="all, delete-orphan")

class SupermarketHistory(Base):
    __tablename__ = "supermarket_history"
    
    id = Column(Integer, primary_key=True, index=True)
    supermarket_id = Column(Integer, ForeignKey("supermarkets.id", ondelete="CASCADE"), nullable=False, index=True)
    campo_alterado = Column(String(50), nullable=False)
    valor_anterior = Column(Text, nullable=True)
    valor_novo = Column(Text, nullable=True)
    usuario_alteracao = Column(String, nullable=False)
    data_alteracao = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamento
    supermarket = relationship("Supermarket", back_populates="historico_alteracoes")