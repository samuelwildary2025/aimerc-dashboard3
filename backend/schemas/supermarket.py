from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List, Dict
from datetime import datetime
import re

class SupermarketCreate(BaseModel):
    # Dados básicos
    nome: str = Field(..., min_length=3, max_length=100, description="Nome do supermercado")
    cnpj: Optional[str] = Field(None, description="CNPJ do supermercado")
    email: EmailStr = Field(..., description="Email do supermercado")
    telefone: str = Field(..., description="Telefone do supermercado")
    
    # Endereço
    cep: str = Field(..., description="CEP do supermercado")
    endereco: str = Field(..., max_length=200, description="Endereço completo")
    numero: str = Field(..., max_length=10, description="Número do endereço")
    complemento: Optional[str] = Field(None, max_length=100, description="Complemento do endereço")
    bairro: str = Field(..., max_length=100, description="Bairro")
    cidade: str = Field(..., max_length=100, description="Cidade")
    estado: str = Field(..., min_length=2, max_length=2, description="Estado (UF)")
    
    # Dados operacionais
    horario_funcionamento: Optional[Dict[str, str]] = Field(None, description="Horário de funcionamento por dia da semana")
    metodos_pagamento: Optional[List[str]] = Field(None, description="Métodos de pagamento aceitos")
    categorias_produtos: Optional[List[str]] = Field(None, description="Categorias de produtos disponíveis")
    capacidade_estocagem: Optional[int] = Field(None, ge=0, description="Capacidade de estocagem em m²")
    
    # Dados de gestão
    responsavel: Optional[str] = Field(None, max_length=100, description="Nome do responsável")
    valor_mensal: Optional[float] = Field(None, ge=0, description="Valor mensal do plano")
    dia_vencimento: Optional[int] = Field(None, ge=1, le=31, description="Dia do vencimento mensal")
    
    # Sistema
    plano: Optional[str] = Field("basico", description="Plano do supermercado")
    ativo: Optional[bool] = Field(True, description="Status ativo do supermercado")
    custom_token: Optional[str] = Field(None, description="Token manual para API")
    
    @validator('cnpj')
    def validate_cnpj(cls, v):
        if v is None:
            return v
            
        # Remove caracteres não numéricos
        cnpj = re.sub(r'[^0-9]', '', v)
        
        if len(cnpj) != 14:
            raise ValueError('CNPJ deve ter 14 dígitos')
        
        # Validação básica de CNPJ
        if cnpj == cnpj[0] * 14:
            raise ValueError('CNPJ inválido')
        
        return cnpj
    
    @validator('telefone')
    def validate_telefone(cls, v):
        # Remove caracteres não numéricos
        telefone = re.sub(r'[^0-9]', '', v)
        
        if len(telefone) < 10 or len(telefone) > 11:
            raise ValueError('Telefone deve ter 10 ou 11 dígitos')
        
        return telefone
    
    @validator('cep')
    def validate_cep(cls, v):
        # Remove caracteres não numéricos
        cep = re.sub(r'[^0-9]', '', v)
        
        if len(cep) != 8:
            raise ValueError('CEP deve ter 8 dígitos')
        
        return cep
    
    @validator('estado')
    def validate_estado(cls, v):
        return v.upper()

class SupermarketUpdate(BaseModel):
    # Dados básicos
    nome: Optional[str] = Field(None, min_length=3, max_length=100)
    cnpj: Optional[str] = None
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    
    # Endereço
    cep: Optional[str] = None
    endereco: Optional[str] = Field(None, max_length=200)
    numero: Optional[str] = Field(None, max_length=10)
    complemento: Optional[str] = Field(None, max_length=100)
    bairro: Optional[str] = Field(None, max_length=100)
    cidade: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = Field(None, min_length=2, max_length=2)
    
    # Dados operacionais
    horario_funcionamento: Optional[Dict[str, str]] = None
    metodos_pagamento: Optional[List[str]] = None
    categorias_produtos: Optional[List[str]] = None
    capacidade_estocagem: Optional[int] = Field(None, ge=0)
    
    # Dados de gestão
    responsavel: Optional[str] = Field(None, max_length=100)
    valor_mensal: Optional[float] = Field(None, ge=0)
    dia_vencimento: Optional[int] = Field(None, ge=1, le=31)
    
    # Logo
    logo_url: Optional[str] = None
    
    # Sistema
    plano: Optional[str] = None
    ativo: Optional[bool] = None
    custom_token: Optional[str] = Field(None, description="Token manual para API")
    
    @validator('cnpj')
    def validate_cnpj(cls, v):
        if v is None:
            return v
        cnpj = re.sub(r'[^0-9]', '', v)
        if len(cnpj) != 14:
            raise ValueError('CNPJ deve ter 14 dígitos')
        if cnpj == cnpj[0] * 14:
            raise ValueError('CNPJ inválido')
        return cnpj
    
    @validator('telefone')
    def validate_telefone(cls, v):
        if v is None:
            return v
        telefone = re.sub(r'[^0-9]', '', v)
        if len(telefone) < 10 or len(telefone) > 11:
            raise ValueError('Telefone deve ter 10 ou 11 dígitos')
        return telefone
    
    @validator('cep')
    def validate_cep(cls, v):
        if v is None:
            return v
        cep = re.sub(r'[^0-9]', '', v)
        if len(cep) != 8:
            raise ValueError('CEP deve ter 8 dígitos')
        return cep
    
    @validator('estado')
    def validate_estado(cls, v):
        if v is None:
            return v
        return v.upper()

class SupermarketResponse(BaseModel):
    id: int
    nome: str
    cnpj: Optional[str]
    email: str
    telefone: str
    
    # Endereço
    cep: str
    endereco: str
    numero: str
    complemento: Optional[str]
    bairro: str
    cidade: str
    estado: str
    
    # Dados operacionais
    horario_funcionamento: Optional[Dict[str, str]]
    metodos_pagamento: Optional[List[str]]
    categorias_produtos: Optional[List[str]]
    capacidade_estocagem: Optional[int]
    
    # Dados de gestão
    responsavel: Optional[str]
    valor_mensal: Optional[float]
    dia_vencimento: Optional[int]
    
    # Sistema
    logo_url: Optional[str]
    
    # Sistema
    plano: str
    ativo: bool
    custom_token: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SupermarketCreateResponse(BaseModel):
    """Response específica para criação de supermercado, incluindo a senha gerada"""
    id: int
    nome: str
    cnpj: Optional[str]
    email: str
    telefone: str
    
    # Endereço
    cep: str
    endereco: str
    numero: str
    complemento: Optional[str]
    bairro: str
    cidade: str
    estado: str
    
    # Dados operacionais
    horario_funcionamento: Optional[Dict[str, str]]
    metodos_pagamento: Optional[List[str]]
    categorias_produtos: Optional[List[str]]
    capacidade_estocagem: Optional[int]
    
    # Dados de gestão
    responsavel: Optional[str]
    valor_mensal: Optional[float]
    dia_vencimento: Optional[int]
    
    # Sistema
    logo_url: Optional[str]
    plano: str
    ativo: bool
    created_at: datetime
    updated_at: datetime
    
    # Senha gerada para o usuário
    senha_gerada: str
    
    class Config:
        from_attributes = True

class SupermarketHistoryResponse(BaseModel):
    id: int
    supermarket_id: int
    campo_alterado: str
    valor_anterior: Optional[str]
    valor_novo: Optional[str]
    usuario_alteracao: str
    data_alteracao: datetime
    
    class Config:
        from_attributes = True

class CEPResponse(BaseModel):
    cep: str
    logradouro: str
    complemento: str
    bairro: str
    localidade: str
    uf: str
    erro: Optional[bool] = None

# Payload para exclusão de supermercado
class SupermarketDeleteRequest(BaseModel):
    force: bool = False
    admin_password: Optional[str] = None

# Solicitação para testar integração do agente IA via POST
class AgentTestRequest(BaseModel):
    url: str
    payload: Optional[dict] = None
    headers: Optional[dict] = None