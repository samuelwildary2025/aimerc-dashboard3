from sqlalchemy import Column, String
from sqlalchemy.orm import Session
from sqlalchemy import text
from models.pedido import Pedido

def add_comprovante_pix_column(db: Session) -> None:
    engine = db.get_bind()
    with engine.connect() as connection:
        try:
            connection.execute(text("ALTER TABLE pedidos ADD COLUMN comprovante_pix VARCHAR"))
            connection.commit()
            print("✅ Coluna 'comprovante_pix' adicionada com sucesso.")
        except Exception as e:
            if "duplicate column" in str(e):
                print("ℹ️ Coluna 'comprovante_pix' já existe.")
            else:
                print(f"❌ Erro ao adicionar coluna: {e}")
