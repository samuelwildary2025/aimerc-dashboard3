from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    role = Column(String, default="cliente")  # admin ou cliente
    tenant_id = Column(Integer, ForeignKey("supermarkets.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamento com supermercado
    supermarket = relationship("Supermarket", back_populates="users")