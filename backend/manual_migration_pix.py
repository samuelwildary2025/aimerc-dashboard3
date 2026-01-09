from sqlalchemy import Column, String
from sqlalchemy.orm import Session
from sqlalchemy import text
from models.pedido import Pedido

def run_manual_migrations(db: Session) -> None:
    engine = db.get_bind()
    with engine.connect() as connection:
        # 1. Adicionar comprovante_pix
        try:
            connection.execute(text("ALTER TABLE pedidos ADD COLUMN comprovante_pix VARCHAR"))
            connection.commit()
            print("✅ Coluna 'comprovante_pix' adicionada com sucesso.")
        except Exception as e:
            if "duplicate column" in str(e) or "already exists" in str(e):
                print("ℹ️ Coluna 'comprovante_pix' já existe.")
            else:
                print(f"❌ Erro ao adicionar coluna comprovante_pix: {e}")

        # 2. Adicionar cliente_id
        try:
            connection.execute(text("ALTER TABLE pedidos ADD COLUMN cliente_id INTEGER"))
            connection.execute(text("ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_clientes FOREIGN KEY (cliente_id) REFERENCES clientes(id)"))
            connection.commit()
            print("✅ Coluna 'cliente_id' adicionada com sucesso.")
        except Exception as e:
            if "duplicate column" in str(e) or "already exists" in str(e):
                print("ℹ️ Coluna 'cliente_id' já existe.")
            else:
                print(f"❌ Erro ao adicionar coluna cliente_id: {e}")

