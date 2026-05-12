---

### Arquivo 2: `docs/arquitetura/model-clients.md`

````markdown
# Modelagem de Entidade: Clientes (Clients)

Este documento define a estrutura de Clientes, suportando a hierarquia Matriz/Filial e os motores de inteligência de recorrência e sentimento.

## 1. Definição da Tabela (SQL)

```sql
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Hierarquia Corporativa
    parent_id UUID REFERENCES clientes(id), -- Auto-relacionamento (Nulo se for Matriz isolada)
    is_matriz BOOLEAN DEFAULT true,

    -- Identificação e Localização
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE,
    inscricao_estadual VARCHAR(20),
    tipo_cliente VARCHAR(50), -- Ex: 'Produtor Rural', 'Cooperativa', 'Usina'

    -- Endereço de Entrega (Vital para logística de insumos)
    logradouro TEXT,
    cidade VARCHAR(100),
    estado CHAR(2),
    cep VARCHAR(10),

    -- Vínculos de Negócio e Segurança
    owner_id UUID REFERENCES users(id), -- Vendedor principal
    team_id  UUID, -- Regional que atende este cliente

    -- Motor de Recorrência (Inteligência)
    frequencia_media_dias INT DEFAULT 30,
    ultima_compra_at TIMESTAMP,
    proxima_compra_estimada_at TIMESTAMP,

    -- Resumo de Sentimento (Atualizado via Worker de IA)
    last_sentiment_label VARCHAR(20), -- 'POSITIVO', 'NEUTRO', 'NEGATIVO'
    sentiment_score NUMERIC(3,2),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```
````
