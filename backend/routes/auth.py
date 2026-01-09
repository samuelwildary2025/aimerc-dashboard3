from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.user import UserCreate, UserLogin, Token, UserResponse
from auth.jwt_handler import create_access_token, get_password_hash, verify_password
from datetime import timedelta

router = APIRouter(prefix="/api/auth", tags=["auth"])
alias_router = APIRouter(prefix="/auth", tags=["auth"])  # Alias sem /api para compatibilidade com proxies

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Verificar se o email já existe
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )
    
    # Criar novo usuário
    hashed_password = get_password_hash(user.senha)
    db_user = User(
        nome=user.nome,
        email=user.email,
        senha_hash=hashed_password,
        role=user.role,
        tenant_id=user.tenant_id
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    # Buscar usuário
    user = db.query(User).filter(User.email == user_credentials.email).first()
    
    if not user or not verify_password(user_credentials.senha, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Criar token
    # Para clientes, emitir token de longa duração (ex.: ~10 anos)
    if (user.role or "").lower() == "cliente":
        access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=timedelta(days=3650))
    else:
        access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

# === Alias sem prefixo /api para ambientes onde o proxy remove /api ===
@alias_router.post("/register", response_model=UserResponse)
def register_alias(user: UserCreate, db: Session = Depends(get_db)):
    # Reutiliza a mesma lógica do endpoint principal
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )

    hashed_password = get_password_hash(user.senha)
    db_user = User(
        nome=user.nome,
        email=user.email,
        senha_hash=hashed_password,
        role=user.role,
        tenant_id=user.tenant_id
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@alias_router.post("/login", response_model=Token)
def login_alias(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_credentials.email).first()
    if not user or not verify_password(user_credentials.senha, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if (user.role or "").lower() == "cliente":
        access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=timedelta(days=3650))
    else:
        access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }