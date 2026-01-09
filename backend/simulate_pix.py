
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.pedido import Pedido
from database import Base, DATABASE_URL

# Setup DB connection
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def simulate_pix():
    telefone = "5585987520060"
    print(f"Buscando pedido por telefone: {telefone}")
    
    # Try with and without country code just in case
    pedido = db.query(Pedido).filter(Pedido.telefone == telefone).order_by(Pedido.id.desc()).first()
    
    if not pedido:
        print("Tentando sem o 55...")
        pedido = db.query(Pedido).filter(Pedido.telefone == "85987520060").order_by(Pedido.id.desc()).first()

    if not pedido:
        print("❌ Nenhum pedido encontrado para este número.")
        return

    print(f"✅ Pedido encontrado: ID {pedido.id} - Cliente: {pedido.nome_cliente}")
    
    # Update receipt
    dummy_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Boleto_Bancario.png/640px-Boleto_Bancario.png" # Generic receipt image
    pedido.comprovante_pix = dummy_url
    
    # Also fix address if missing for better demo
    if not pedido.endereco:
        pedido.endereco = "Rua Simulada, 123 - Bairro Teste"
        print("✅ Endereço simulado adicionado.")
        
    db.commit()
    print(f"✅ Comprovante Pix atualizado com sucesso!")
    print(f"🔗 URL: {dummy_url}")

if __name__ == "__main__":
    simulate_pix()
