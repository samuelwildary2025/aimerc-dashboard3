#!/usr/bin/env python3
"""
Script de diagnóstico para testar conexão com PostgreSQL e criação de tabelas
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def test_database_connection():
    """Testa a conexão com o banco de dados"""
    print("🔍 DIAGNÓSTICO DO BANCO DE DADOS")
    print("=" * 50)
    
    # 1. Verificar variáveis de ambiente
    database_url = os.getenv("DATABASE_URL")
    print(f"📋 DATABASE_URL: {database_url}")
    
    if not database_url:
        print("❌ ERRO: DATABASE_URL não encontrada!")
        print("💡 Configure a variável de ambiente DATABASE_URL")
        return False
    
    # 2. Testar conexão básica
    try:
        print("\n🔌 Testando conexão básica...")
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✅ Conexão OK! PostgreSQL: {version}")
            
    except SQLAlchemyError as e:
        print(f"❌ ERRO na conexão: {e}")
        return False
    except Exception as e:
        print(f"❌ ERRO inesperado: {e}")
        return False
    
    # 3. Verificar tabelas existentes
    try:
        print("\n📊 Verificando tabelas existentes...")
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if tables:
            print(f"✅ Tabelas encontradas: {tables}")
        else:
            print("⚠️  Nenhuma tabela encontrada")
            
    except Exception as e:
        print(f"❌ ERRO ao verificar tabelas: {e}")
    
    # 4. Testar criação de tabelas
    try:
        print("\n🏗️  Testando criação de tabelas...")
        
        # Importar modelos
        sys.path.append(os.path.dirname(__file__))
        from models.user import User
        from models.supermarket import Supermarket, SupermarketHistory
        from models.pedido import Pedido, ItemPedido
        from models.cliente import Cliente
        
        # Criar tabelas
        User.metadata.create_all(bind=engine)
        Supermarket.metadata.create_all(bind=engine)
        Pedido.metadata.create_all(bind=engine)
        ItemPedido.metadata.create_all(bind=engine)
        SupermarketHistory.metadata.create_all(bind=engine)
        Cliente.metadata.create_all(bind=engine)
        
        print("✅ Tabelas criadas com sucesso!")
        
        # Verificar novamente
        inspector = inspect(engine)
        tables_after = inspector.get_table_names()
        print(f"📊 Tabelas após criação: {tables_after}")
        
        expected_tables = ['users', 'supermarkets', 'pedidos', 'itens_pedido', 'supermarket_history', 'clientes']
        missing_tables = [t for t in expected_tables if t not in tables_after]
        
        if missing_tables:
            print(f"⚠️  Tabelas não criadas: {missing_tables}")
        else:
            print("✅ Todas as tabelas foram criadas!")
            
    except Exception as e:
        print(f"❌ ERRO na criação de tabelas: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 5. Testar inserção de dados
    try:
        print("\n💾 Testando inserção de dados...")
        from sqlalchemy.orm import sessionmaker
        from auth.jwt_handler import get_password_hash
        
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # Verificar se admin já existe
        admin_exists = db.execute(text("SELECT COUNT(*) FROM users WHERE email = 'admin@admin.com'")).fetchone()[0]
        
        if admin_exists == 0:
            # Criar usuário admin
            db.execute(text("""
                INSERT INTO users (nome, email, senha_hash, role) 
                VALUES ('Administrador', 'admin@admin.com', :senha_hash, 'admin')
            """), {"senha_hash": get_password_hash("admin123")})
            db.commit()
            print("✅ Usuário admin criado!")
        else:
            print("✅ Usuário admin já existe!")
            
        db.close()
        
    except Exception as e:
        print(f"❌ ERRO na inserção de dados: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n🎉 DIAGNÓSTICO CONCLUÍDO!")
    return True

if __name__ == "__main__":
    test_database_connection()