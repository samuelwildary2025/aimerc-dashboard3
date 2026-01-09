from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

def run_manual_migrations(db: Session) -> None:
    engine = db.get_bind()
    inspector = inspect(engine)
    
    # 1. Tabela 'pedidos': column 'comprovante_pix'
    try:
        columns = [c['name'] for c in inspector.get_columns('pedidos')]
        if 'comprovante_pix' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE pedidos ADD COLUMN comprovante_pix VARCHAR"))
                conn.commit()
            print("✅ Coluna 'comprovante_pix' adicionada com sucesso.")
        else:
            print("ℹ️ Coluna 'comprovante_pix' já existe.")
            
        # 2. Tabela 'pedidos': column 'cliente_id'
        if 'cliente_id' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE pedidos ADD COLUMN cliente_id INTEGER"))
                conn.execute(text("ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_clientes FOREIGN KEY (cliente_id) REFERENCES clientes(id)"))
                conn.commit()
            print("✅ Coluna 'cliente_id' adicionada com sucesso.")
        else:
            print("ℹ️ Coluna 'cliente_id' já existe.")

    except Exception as e:
        print(f"❌ Erro ao verificar/migrar tabela pedidos: {e}")

    # 3. Tabela 'supermarkets': column 'whatsapp_instance_token'
    try:
        columns = [c['name'] for c in inspector.get_columns('supermarkets')]
        if 'whatsapp_instance_token' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE supermarkets ADD COLUMN whatsapp_instance_token VARCHAR"))
                conn.commit()
            print("✅ Coluna 'whatsapp_instance_token' adicionada em supermarkets.")
        else:
            print("ℹ️ Coluna 'whatsapp_instance_token' já existe.")
    except Exception as e:
        print(f"❌ Erro ao verificar/migrar tabela supermarkets: {e}")

