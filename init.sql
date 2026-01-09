-- Criação do banco de dados (caso não exista)
CREATE DATABASE IF NOT EXISTS supermercado_db;

-- Conectar ao banco de dados
\c supermercado_db;

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'client',
    tenant_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de supermercados
CREATE TABLE IF NOT EXISTS supermarkets (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    plano VARCHAR(50) DEFAULT 'basico',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES supermarkets(id) ON DELETE CASCADE,
    nome_cliente VARCHAR(255) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente',
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS itens_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    nome_produto VARCHAR(255) NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supermarkets_email ON supermarkets(email);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_id ON pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);

-- Inserir usuário admin padrão (senha: admin123)
INSERT INTO users (email, senha_hash, role) 
VALUES ('admin@admin.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJflLxQjm', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Inserir alguns dados de exemplo
INSERT INTO supermarkets (nome, email, telefone, plano, ativo) VALUES
('Supermercado Central', 'central@exemplo.com', '(11) 1234-5678', 'premium', true),
('Mercado do Bairro', 'bairro@exemplo.com', '(11) 8765-4321', 'basico', true),
('Super Atacado', 'atacado@exemplo.com', '(11) 5555-5555', 'enterprise', true)
ON CONFLICT (email) DO NOTHING;

-- Inserir usuários para os supermercados
INSERT INTO users (email, senha_hash, role, tenant_id) VALUES
('central@exemplo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJflLxQjm', 'client', 1),
('bairro@exemplo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJflLxQjm', 'client', 2),
('atacado@exemplo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJflLxQjm', 'client', 3)
ON CONFLICT (email) DO NOTHING;

-- Inserir alguns pedidos de exemplo
INSERT INTO pedidos (tenant_id, nome_cliente, valor_total, status, data_pedido) VALUES
(1, 'João Silva', 150.75, 'pendente', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(1, 'Maria Santos', 89.50, 'faturado', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(2, 'Pedro Oliveira', 234.20, 'pendente', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
(2, 'Ana Costa', 67.80, 'faturado', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
(3, 'Carlos Ferreira', 445.90, 'pendente', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(3, 'Lucia Mendes', 178.30, 'faturado', CURRENT_TIMESTAMP - INTERVAL '2 days');

-- Inserir itens dos pedidos
INSERT INTO itens_pedido (pedido_id, nome_produto, quantidade, preco_unitario) VALUES
-- Pedido 1
(1, 'Arroz 5kg', 2, 25.90),
(1, 'Feijão 1kg', 3, 8.50),
(1, 'Óleo de Soja 900ml', 4, 6.75),
(1, 'Açúcar 1kg', 2, 4.20),
-- Pedido 2
(2, 'Leite 1L', 6, 4.50),
(2, 'Pão de Forma', 2, 5.80),
(2, 'Manteiga 200g', 1, 8.90),
-- Pedido 3
(3, 'Carne Bovina 1kg', 2, 35.90),
(3, 'Frango 1kg', 3, 12.50),
(3, 'Batata 1kg', 5, 3.20),
(3, 'Cebola 1kg', 2, 4.80),
-- Pedido 4
(4, 'Sabão em Pó 1kg', 2, 12.90),
(4, 'Detergente 500ml', 3, 2.50),
(4, 'Papel Higiênico 4 rolos', 2, 8.75),
-- Pedido 5
(5, 'Refrigerante 2L', 6, 7.50),
(5, 'Biscoito Recheado', 8, 3.20),
(5, 'Chocolate 100g', 10, 4.80),
-- Pedido 6
(6, 'Shampoo 400ml', 2, 15.90),
(6, 'Condicionador 400ml', 2, 16.50),
(6, 'Sabonete 90g', 6, 2.80);