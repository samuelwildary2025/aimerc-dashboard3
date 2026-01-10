from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx
import json
import secrets
import string
from database import get_db
from models.supermarket import Supermarket, SupermarketHistory
from models.user import User
from schemas.supermarket import (
    SupermarketCreate,
    SupermarketResponse,
    SupermarketUpdate,
    SupermarketHistoryResponse,
    CEPResponse,
    SupermarketCreateResponse,
    SupermarketDeleteRequest,
    AgentTestRequest,
)
from auth.middleware import require_admin, get_current_user
from auth.jwt_handler import get_password_hash, verify_password, create_access_token
from utils.crud_logger import log_event
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/supermarkets", tags=["supermarkets"])

def generate_random_password(length: int = 12) -> str:
    """
    Gera uma senha aleatória segura com letras maiúsculas, minúsculas, números e caracteres especiais.
    """
    # Definir os caracteres disponíveis
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special_chars = "!@#$%&*"
    
    # Garantir que a senha tenha pelo menos um caractere de cada tipo
    password = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(special_chars)
    ]
    
    # Preencher o resto da senha com caracteres aleatórios
    all_chars = lowercase + uppercase + digits + special_chars
    for _ in range(length - 4):
        password.append(secrets.choice(all_chars))
    
    # Embaralhar a senha para que os tipos de caracteres não fiquem em posições fixas
    secrets.SystemRandom().shuffle(password)
    
    return ''.join(password)

# Função auxiliar para registrar histórico de alterações
def log_supermarket_change(db: Session, supermarket_id: int, campo: str, valor_anterior: str, valor_novo: str, usuario: str):
    history = SupermarketHistory(
        supermarket_id=supermarket_id,
        campo_alterado=campo,
        valor_anterior=valor_anterior,
        valor_novo=valor_novo,
        usuario_alteracao=usuario
    )
    db.add(history)

@router.post("/", response_model=SupermarketCreateResponse)
def create_supermarket(
    supermarket: SupermarketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Verificar se o email já existe
    db_supermarket = db.query(Supermarket).filter(Supermarket.email == supermarket.email).first()
    if db_supermarket:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )
    # Verificar se o CNPJ já existe (apenas se CNPJ foi fornecido)
    if supermarket.cnpj:
        db_supermarket = db.query(Supermarket).filter(Supermarket.cnpj == supermarket.cnpj).first()
        if db_supermarket:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CNPJ já cadastrado"
            )
    # Operação atômica
    try:
        db_supermarket = Supermarket(**supermarket.dict())
        db.add(db_supermarket)
        db.commit()
        db.refresh(db_supermarket)
        
        # Criar usuário correspondente na tabela users
        # Gerar senha aleatória segura
        senha_gerada = generate_random_password()
        
        db_user = User(
            nome=supermarket.nome,
            email=supermarket.email,
            senha_hash=get_password_hash(senha_gerada),
            role="supermarket",  # Mudança: role específico para supermercados
            tenant_id=db_supermarket.id
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Registrar criação no histórico (sem commit adicional)
        log_supermarket_change(
            db, db_supermarket.id, "criacao", None, "Supermercado criado", current_user.email
        )
        db.commit()  # Commit único para o histórico
        
        log_event("create", "supermarket", db_supermarket.id, current_user.email, before=None, after={"nome": db_supermarket.nome, "email": db_supermarket.email, "cnpj": db_supermarket.cnpj}, success=True)
        
        # Criar resposta com a senha gerada
        response_data = SupermarketCreateResponse(
            id=db_supermarket.id,
            nome=db_supermarket.nome,
            cnpj=db_supermarket.cnpj,
            email=db_supermarket.email,
            telefone=db_supermarket.telefone,
            cep=db_supermarket.cep,
            endereco=db_supermarket.endereco,
            numero=db_supermarket.numero,
            complemento=db_supermarket.complemento,
            bairro=db_supermarket.bairro,
            cidade=db_supermarket.cidade,
            estado=db_supermarket.estado,
            horario_funcionamento=db_supermarket.horario_funcionamento,
            metodos_pagamento=db_supermarket.metodos_pagamento,
            categorias_produtos=db_supermarket.categorias_produtos,
            capacidade_estocagem=db_supermarket.capacidade_estocagem,
            responsavel=db_supermarket.responsavel,
            valor_mensal=db_supermarket.valor_mensal,
            dia_vencimento=db_supermarket.dia_vencimento,
            logo_url=db_supermarket.logo_url,
            plano=db_supermarket.plano,
            ativo=db_supermarket.ativo,
            created_at=db_supermarket.created_at,
            updated_at=db_supermarket.updated_at,
            senha_gerada=senha_gerada
        )
        
        return response_data
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        log_event("create", "supermarket", None, current_user.email, before=None, after=supermarket.dict(), success=False, message=str(e))
        raise HTTPException(status_code=500, detail="Erro ao criar supermercado")

@router.get("/", response_model=List[SupermarketResponse])
def list_supermarkets(
    skip: int = Query(0, ge=0, description="Número de registros para pular"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros"),
    search: Optional[str] = Query(None, description="Buscar por nome, email ou CNPJ"),
    ativo: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = db.query(Supermarket)
    
    # Filtros
    if search:
        query = query.filter(
            (Supermarket.nome.ilike(f"%{search}%")) |
            (Supermarket.email.ilike(f"%{search}%")) |
            (Supermarket.cnpj.ilike(f"%{search}%"))
        )
    
    if ativo is not None:
        query = query.filter(Supermarket.ativo == ativo)
    
    # Paginação
    try:
        supermarkets = query.offset(skip).limit(limit).all()
        return supermarkets
    except Exception as e:
        # Auto-healing: se for erro de coluna ausente, tenta rodar migration
        if "no such column" in str(e) or "column" in str(e) and "does not exist" in str(e):
            print("⚠️ Erro de schema detectado. Tentando auto-reparo...")
            try:
                from manual_migration_pix import run_manual_migrations
                run_manual_migrations(db)
                # Retry query
                supermarkets = query.offset(skip).limit(limit).all()
                return supermarkets
            except Exception as migration_error:
                print(f"❌ Falha no auto-reparo: {migration_error}")
                raise HTTPException(status_code=500, detail=f"Erro de Schema: {str(e)}")
        raise e

@router.get("/me", response_model=SupermarketResponse)
def get_my_supermarket(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permite que um usuário de supermercado obtenha sua própria configuração."""
    if current_user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administradores não têm supermercado associado. Use /supermarkets/{id}."
        )
    
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não possui supermercado vinculado"
        )
    
    supermarket = db.query(Supermarket).filter(Supermarket.id == current_user.tenant_id).first()
    if not supermarket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supermercado não encontrado"
        )
    return supermarket

@router.get("/{supermarket_id}", response_model=SupermarketResponse)
def get_supermarket(
    supermarket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    supermarket = db.query(Supermarket).filter(Supermarket.id == supermarket_id).first()
    if not supermarket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supermercado não encontrado"
        )
    return supermarket

@router.put("/{supermarket_id}", response_model=SupermarketResponse)
def update_supermarket(
    supermarket_id: int,
    supermarket_update: SupermarketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    supermarket = db.query(Supermarket).filter(Supermarket.id == supermarket_id).first()
    if not supermarket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supermercado não encontrado"
        )
    # Verificações de unicidade
    if supermarket_update.email and supermarket_update.email != supermarket.email:
        existing = db.query(Supermarket).filter(
            Supermarket.email == supermarket_update.email,
            Supermarket.id != supermarket_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já cadastrado")
    if supermarket_update.cnpj and supermarket_update.cnpj != supermarket.cnpj:
        existing = db.query(Supermarket).filter(
            Supermarket.cnpj == supermarket_update.cnpj,
            Supermarket.id != supermarket_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CNPJ já cadastrado")
    before_snapshot = {"nome": supermarket.nome, "email": supermarket.email, "cnpj": supermarket.cnpj}
    update_data = supermarket_update.dict(exclude_unset=True)
    try:
        # Registrar histórico de alterações por campo
        for field, new_value in update_data.items():
            if hasattr(supermarket, field):
                old_value = getattr(supermarket, field)
                if old_value != new_value:
                    log_supermarket_change(
                        db, supermarket_id, field,
                        str(old_value) if old_value is not None else None,
                        str(new_value) if new_value is not None else None,
                        current_user.email
                    )
        # Aplicar atualização
        for field, value in update_data.items():
            setattr(supermarket, field, value)
        
        db.commit()
        
        # Validação pós-operação
        refreshed = db.query(Supermarket).filter(Supermarket.id == supermarket_id).first()
        if not refreshed:
            log_event("update", "supermarket", supermarket_id, current_user.email, before=before_snapshot, after=update_data, success=False, message="Registro não encontrado após update")
            raise HTTPException(status_code=500, detail="Falha ao atualizar supermercado")
        log_event("update", "supermarket", supermarket_id, current_user.email, before=before_snapshot, after={"nome": refreshed.nome, "email": refreshed.email, "cnpj": refreshed.cnpj}, success=True)
        return refreshed
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        log_event("update", "supermarket", supermarket_id, current_user.email, before=before_snapshot, after=update_data, success=False, message=str(e))
        raise HTTPException(status_code=500, detail="Erro ao atualizar supermercado")

@router.delete("/{supermarket_id}")
def delete_supermarket(
    supermarket_id: int,
    payload: Optional[SupermarketDeleteRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from models.user import User as UserModel
    from models.pedido import Pedido
    from models.cliente import Cliente
    
    supermarket = db.query(Supermarket).filter(Supermarket.id == supermarket_id).first()
    if not supermarket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supermercado não encontrado")
    
    before_snapshot = {"nome": supermarket.nome, "email": supermarket.email, "cnpj": supermarket.cnpj}
    
    try:
        # Verificar se existem registros relacionados
        users_count = db.query(UserModel).filter(UserModel.tenant_id == supermarket_id).count()
        pedidos_count = db.query(Pedido).filter(Pedido.tenant_id == supermarket_id).count()
        clientes_count = db.query(Cliente).filter(Cliente.tenant_id == supermarket_id).count()

        force = bool(payload.force) if payload else False
        admin_password = payload.admin_password if payload else None

        if users_count > 0 or pedidos_count > 0 or clientes_count > 0:
            if not force:
                details = []
                if users_count > 0:
                    details.append(f"{users_count} usuário(s)")
                if pedidos_count > 0:
                    details.append(f"{pedidos_count} pedido(s)")
                if clientes_count > 0:
                    details.append(f"{clientes_count} cliente(s)")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Não é possível excluir o supermercado. Existem registros relacionados: {', '.join(details)}. Exclua primeiro os registros relacionados ou use exclusão forçada com senha do administrador."
                )

            # Exclusão forçada: requer senha do admin
            if not admin_password or not verify_password(admin_password, current_user.senha_hash):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Senha do administrador inválida"
                )

            # Remover dependências em ordem segura (pedidos -> clientes -> usuários)
            pedidos = db.query(Pedido).filter(Pedido.tenant_id == supermarket_id).all()
            for p in pedidos:
                db.delete(p)  # itens do pedido serão removidos via cascade ORM

            clientes = db.query(Cliente).filter(Cliente.tenant_id == supermarket_id).all()
            for c in clientes:
                db.delete(c)

            users = db.query(UserModel).filter(UserModel.tenant_id == supermarket_id).all()
            for u in users:
                db.delete(u)

            # Registrar no histórico a exclusão forçada
            log_supermarket_change(
                db, supermarket_id, "exclusao_forcada", "Com dependências", "Dependências removidas", current_user.email
            )

        else:
            # Registrar exclusão normal
            log_supermarket_change(
                db, supermarket_id, "exclusao", "Ativo", "Excluído", current_user.email
            )

        # Excluir o supermercado
        db.delete(supermarket)
        db.commit()

        # Log de sucesso
        msg = "Supermercado excluído com sucesso" if not (users_count or pedidos_count or clientes_count) else "Supermercado excluído com sucesso (forçada)"
        log_event("delete", "supermarket", supermarket_id, current_user.email, before=before_snapshot, after=None, success=True, message=msg)
        return {"message": msg}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        log_event("delete", "supermarket", supermarket_id, current_user.email, before=before_snapshot, after=None, success=False, message=str(e))
        raise HTTPException(status_code=500, detail="Erro ao excluir supermercado")

@router.get("/{supermarket_id}/history", response_model=List[SupermarketHistoryResponse])
def get_supermarket_history(
    supermarket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Verificar se supermercado existe
    supermarket = db.query(Supermarket).filter(Supermarket.id == supermarket_id).first()
    if not supermarket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supermercado não encontrado"
        )
    
    history = db.query(SupermarketHistory).filter(
        SupermarketHistory.supermarket_id == supermarket_id
    ).order_by(SupermarketHistory.data_alteracao.desc()).all()
    
    return history

@router.get("/{supermarket_id}/integration-token")
def get_integration_token(
    supermarket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Gerar token JWT de integração para o supermercado.

    O token é assinado com o mesmo segredo da aplicação e usa `sub`
    apontando para o usuário vinculado ao tenant do supermercado,
    permitindo ao agente realizar chamadas autenticadas como esse supermercado.
    """
    # Validar supermercado
    supermarket = db.query(Supermarket).filter(Supermarket.id == supermarket_id).first()
    if not supermarket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supermercado não encontrado")

    # Encontrar usuário do supermercado (preferindo role "supermarket" e mesmo email)
    market_user = db.query(User).filter(
        User.tenant_id == supermarket_id,
        User.role == "supermarket",
        User.email == supermarket.email
    ).first()

    if not market_user:
        # Fallback: qualquer usuário vinculado ao tenant
        market_user = db.query(User).filter(User.tenant_id == supermarket_id).first()
        if not market_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário do supermercado não encontrado")

    # Gerar token com longa expiração (180 dias)
    token = create_access_token({"sub": str(market_user.id)}, expires_delta=timedelta(days=180))

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": market_user.id,
            "email": market_user.email,
            "role": market_user.role,
            "tenant_id": market_user.tenant_id,
        },
        "expires_in_days": 180
    }

@router.post("/{supermarket_id}/reset-password")
def reset_supermarket_password(
    supermarket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Gera uma nova senha para o usuário do painel de pedidos do supermercado.

    - Restrito a administradores.
    - Atualiza o hash de senha do usuário vinculado ao supermercado (preferindo o email do supermercado).
    - Retorna a nova senha em texto claro para o administrador repassar ao cliente.
    """
    supermarket = db.query(Supermarket).filter(Supermarket.id == supermarket_id).first()
    if not supermarket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supermercado não encontrado")

    # Preferir o usuário com o mesmo email do supermercado e role "supermarket"
    target_users = db.query(User).filter(
        User.tenant_id == supermarket_id,
        User.email == supermarket.email,
    ).all()

    if not target_users:
        target_users = db.query(User).filter(
            User.tenant_id == supermarket_id,
            User.role == "supermarket",
        ).all()

    if not target_users:
        # Fallback final: qualquer usuário vinculado ao tenant
        target_users = db.query(User).filter(User.tenant_id == supermarket_id).all()

    if not target_users:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nenhum usuário vinculado ao supermercado")

    new_password = generate_random_password()
    new_hash = get_password_hash(new_password)

    try:
        for u in target_users:
            u.senha_hash = new_hash

        # Registrar no histórico
        log_supermarket_change(
            db,
            supermarket_id,
            "reset_password",
            "-",
            "Senha redefinida",
            current_user.email,
        )

        db.commit()

        log_event(
            "update",
            "supermarket_password",
            supermarket_id,
            current_user.email,
            before=None,
            after={"users_updated": [u.id for u in target_users]},
            success=True,
        )

        return {"senha_gerada": new_password, "users_updated": [u.email for u in target_users]}
    except Exception as e:
        db.rollback()
        log_event(
            "update",
            "supermarket_password",
            supermarket_id,
            current_user.email,
            before=None,
            after=None,
            success=False,
            message=str(e),
        )
        raise HTTPException(status_code=500, detail="Erro ao redefinir senha do supermercado")

@router.post("/{supermarket_id}/agent-test")
def test_agent_integration(
    supermarket_id: int,
    body: AgentTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Dispara uma requisição POST server-to-server ao webhook do supermercado.

    Evita problemas de CORS no navegador e facilita a integração.
    """
    # Verificar se supermercado existe
    supermarket = db.query(Supermarket).filter(Supermarket.id == supermarket_id).first()
    if not supermarket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supermercado não encontrado")

    if not body.url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL de integração é obrigatória")

    default_payload = {
        "supermarket_id": supermarket.id,
        "supermarket_name": getattr(supermarket, "nome", None) or getattr(supermarket, "name", None),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "pedido_exemplo": {
            "cliente": {"nome": "Cliente Teste", "telefone": "000000000"},
            "itens": [
                {"sku": "ABC123", "descricao": "Arroz 5kg", "quantidade": 1, "preco": 25.90},
                {"sku": "XYZ987", "descricao": "Feijão 1kg", "quantidade": 2, "preco": 8.50},
            ],
            "total": 42.90,
        },
    }

    payload = body.payload or default_payload
    headers = body.headers or {"Content-Type": "application/json"}

    try:
        resp = httpx.post(body.url, json=payload, headers=headers, timeout=15)
        try:
            resp_content = resp.json()
        except Exception:
            resp_content = {"text": resp.text}

        return {"ok": resp.is_success, "status": resp.status_code, "response": resp_content}
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Falha ao conectar ao webhook: {str(e)}")

@router.get("/cep/{cep}", response_model=CEPResponse)
async def get_cep_info(cep: str):
    """Buscar informações de endereço por CEP usando API ViaCEP"""
    # Limpar CEP
    cep_clean = cep.replace("-", "").replace(".", "")
    
    if len(cep_clean) != 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CEP deve ter 8 dígitos"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://viacep.com.br/ws/{cep_clean}/json/")
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Erro ao consultar CEP"
                )
            
            data = response.json()
            
            if data.get("erro"):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="CEP não encontrado"
                )
            
            return CEPResponse(
                cep=data.get("cep", ""),
                logradouro=data.get("logradouro", ""),
                complemento=data.get("complemento", ""),
                bairro=data.get("bairro", ""),
                localidade=data.get("localidade", ""),
                uf=data.get("uf", "")
            )
    
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao consultar serviço de CEP"
        )

@router.post("/{supermarket_id}/upload-logo")
async def upload_logo(
    supermarket_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Verificar se supermercado existe
    supermarket = db.query(Supermarket).filter(Supermarket.id == supermarket_id).first()
    if not supermarket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supermercado não encontrado"
        )
    
    # Validar tipo de arquivo
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo deve ser uma imagem"
        )
    
    # Validar tamanho (máximo 5MB)
    if file.size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo muito grande. Máximo 5MB"
        )
    
    # Salvar arquivo (implementação simplificada - em produção usar S3, etc.)
    import os
    from datetime import datetime
    
    # Criar diretório se não existir
    upload_dir = "uploads/logos"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Gerar nome único para o arquivo
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"supermarket_{supermarket_id}_{timestamp}.{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    # Salvar arquivo
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Atualizar URL do logo no banco
    old_logo = supermarket.logo_url
    supermarket.logo_url = f"/uploads/logos/{filename}"
    
    # Registrar alteração no histórico
    log_supermarket_change(
        db, supermarket_id, "logo_url", old_logo, supermarket.logo_url, current_user.email
    )
    
    db.commit()
    
    return {"message": "Logo enviado com sucesso", "logo_url": supermarket.logo_url}

@router.put("/{supermarket_id}/custom-token")
def update_custom_token(
    supermarket_id: int,
    token_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Atualizar o token manual do supermercado."""
    # Verificar se supermercado existe
    supermarket = db.query(Supermarket).filter(Supermarket.id == supermarket_id).first()
    if not supermarket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supermercado não encontrado"
        )
    
    # Obter o novo token
    new_token = token_data.get("custom_token")
    if not new_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token é obrigatório"
        )
    
    # Registrar alteração no histórico
    old_token = supermarket.custom_token
    log_supermarket_change(
        db, supermarket_id, "custom_token", old_token, new_token, current_user.email
    )
    
    # Atualizar token
    supermarket.custom_token = new_token
    supermarket.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(supermarket)
    
    return {"message": "Token atualizado com sucesso", "custom_token": new_token}

@router.get("/fix-db")
def fix_database(db: Session = Depends(get_db)):
    """Rota de emergência para corrigir o banco de dados"""
    try:
        from manual_migration_pix import run_manual_migrations
        run_manual_migrations(db)
        return {"message": "Migrações executadas com sucesso! Verifique os logs."}
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        return {"message": "Erro ao executar migrações", "error": str(e), "traceback": error_msg}