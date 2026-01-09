from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from zoneinfo import ZoneInfo
from database import Base


def _now_brt_naive() -> datetime:
    """Retorna a hora atual em America/Sao_Paulo sem tzinfo para compatibilidade."""
    return datetime.now(ZoneInfo("America/Sao_Paulo")).replace(tzinfo=None)


class Pedido(Base):
    __tablename__ = "pedidos"
    __table_args__ = (
        UniqueConstraint("tenant_id", "numero_pedido", name="uq_pedidos_tenant_numero"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("supermarkets.id"), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)  # Novo campo para cliente
    nome_cliente = Column(String, nullable=False)  # Mantido para compatibilidade
    valor_total = Column(Float, nullable=False, default=0.0)
    status = Column(String, default="pendente")  # pendente, faturado
    data_pedido = Column(DateTime, default=_now_brt_naive)
    numero_pedido = Column(Integer, nullable=False, default=0)
    
    # Campos opcionais
    forma = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    observacao = Column(String, nullable=True)
    telefone = Column(String, nullable=True)
    comprovante_pix = Column(String, nullable=True)  # URL do comprovante Pix
    
    # Relacionamentos
    supermarket = relationship("Supermarket", back_populates="pedidos")
    cliente = relationship("Cliente", back_populates="pedidos")
    itens = relationship("ItemPedido", back_populates="pedido", cascade="all, delete-orphan")

class ItemPedido(Base):
    __tablename__ = "itens_pedido"
    
    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    nome_produto = Column(String, nullable=False)
    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(Float, nullable=False)
    
    # Relacionamento
    pedido = relationship("Pedido", back_populates="itens")
