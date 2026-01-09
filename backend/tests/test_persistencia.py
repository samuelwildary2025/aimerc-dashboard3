import os
import importlib
from pathlib import Path
import pytest


def setup_db(db_path: str):
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    # Reload database and models to bind to the new engine/Base
    import database as db
    import models.supermarket as sm
    import models.pedido as pm
    importlib.reload(db)
    importlib.reload(sm)
    importlib.reload(pm)
    # Ensure tables exist
    sm.Base.metadata.create_all(bind=db.engine)
    return db, sm, pm


@pytest.fixture
def temp_db_file(tmp_path_factory):
    tmp_dir = tmp_path_factory.mktemp("db")
    return tmp_dir / "test_persist.db"


def test_supermarket_persist_and_delete(temp_db_file):
    # Inicializa DB
    db, sm, pm = setup_db(str(temp_db_file))
    session = db.SessionLocal()

    # Cria supermercado
    sup = sm.Supermarket(
        nome="Supermercado de Teste",
        cnpj="12345678901234",
        email="teste@exemplo.com",
        telefone="11999999999",
        cep="12345678",
        endereco="Rua Teste",
        numero="100",
        complemento=None,
        bairro="Centro",
        cidade="São Paulo",
        estado="SP",
        plano="basico",
        ativo=True,
    )
    session.add(sup)
    session.commit()
    session.refresh(sup)
    sup_id = sup.id
    session.close()

    # Simula reinicialização
    db, sm, pm = setup_db(str(temp_db_file))
    session = db.SessionLocal()
    found = session.query(sm.Supermarket).filter(sm.Supermarket.id == sup_id).first()
    assert found is not None, "Supermercado deveria persistir após reinício"

    # Exclui e confirma
    session.delete(found)
    session.commit()
    session.close()

    # Reinicia novamente e valida exclusão permanente
    db, sm, pm = setup_db(str(temp_db_file))
    session = db.SessionLocal()
    missing = session.query(sm.Supermarket).filter(sm.Supermarket.id == sup_id).first()
    session.close()
    assert missing is None, "Supermercado excluído não deve retornar após reinício"


def test_pedido_persist_and_delete(temp_db_file):
    # Inicializa DB
    db, sm, pm = setup_db(str(temp_db_file))
    session = db.SessionLocal()

    # Cria supermercado para vincular pedido (tenant)
    sup = sm.Supermarket(
        nome="Supermercado Pedido",
        cnpj="99999999999999",
        email="pedido@exemplo.com",
        telefone="11988888888",
        cep="87654321",
        endereco="Av. Pedido",
        numero="200",
        complemento=None,
        bairro="Bairro",
        cidade="São Paulo",
        estado="SP",
        plano="basico",
        ativo=True,
    )
    session.add(sup)
    session.commit()
    session.refresh(sup)

    # Cria pedido com itens
    pedido = pm.Pedido(
        tenant_id=sup.id,
        nome_cliente="Cliente Teste",
        valor_total=0.0,
        status="pendente",
    )
    session.add(pedido)
    session.flush()  # garante id para itens

    item1 = pm.ItemPedido(
        pedido_id=pedido.id,
        nome_produto="Arroz",
        quantidade=2,
        preco_unitario=10.0,
    )
    item2 = pm.ItemPedido(
        pedido_id=pedido.id,
        nome_produto="Feijão",
        quantidade=1,
        preco_unitario=8.5,
    )
    session.add_all([item1, item2])
    # Atualiza valor total
    pedido.valor_total = item1.quantidade * item1.preco_unitario + item2.quantidade * item2.preco_unitario
    session.commit()
    session.refresh(pedido)
    ped_id = pedido.id
    session.close()

    # Simula reinicialização e valida persistência
    db, sm, pm = setup_db(str(temp_db_file))
    session = db.SessionLocal()
    persisted = session.query(pm.Pedido).filter(pm.Pedido.id == ped_id).first()
    assert persisted is not None, "Pedido deveria persistir após reinício"
    assert abs(persisted.valor_total - 28.5) < 1e-6, "Valor total do pedido incorreto"

    # Exclui pedido e valida exclusão
    session.delete(persisted)
    session.commit()
    session.close()

    db, sm, pm = setup_db(str(temp_db_file))
    session = db.SessionLocal()
    gone = session.query(pm.Pedido).filter(pm.Pedido.id == ped_id).first()
    session.close()
    assert gone is None, "Pedido excluído não deve retornar após reinício"