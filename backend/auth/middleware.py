from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.supermarket import Supermarket
from .jwt_handler import verify_token

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

def get_current_tenant(current_user: User = Depends(get_current_user)) -> int:
    if current_user.role == "admin":
        return None  # Admin pode acessar todos os tenants
    
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário não possui tenant associado"
        )
    
    return current_user.tenant_id

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores."
        )
    return current_user

def validate_custom_token_or_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """
    Valida tanto tokens JWT quanto tokens manuais de supermercados.
    Retorna informações sobre o token validado.
    """
    token = credentials.credentials
    
    # Primeiro, tenta validar como JWT
    payload = verify_token(token)
    if payload is not None:
        user_id: int = payload.get("sub")
        if user_id is not None:
            user = db.query(User).filter(User.id == user_id).first()
            if user is not None:
                return {
                    "type": "jwt",
                    "user": user,
                    "supermarket_id": user.tenant_id
                }
    
    # Se não for JWT válido, verifica se é um token manual
    supermarket = db.query(Supermarket).filter(
        Supermarket.custom_token == token,
        Supermarket.ativo == True
    ).first()
    
    if supermarket is not None:
        return {
            "type": "custom",
            "supermarket": supermarket,
            "supermarket_id": supermarket.id
        }
    
    # Se não for nem JWT nem token manual válido
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido",
        headers={"WWW-Authenticate": "Bearer"},
    )