# Arquitetura de Usuários, Perfis e Permissões (Múltiplos Perfis)

Este documento define a estrutura de controle de acesso (ACL) para o CRM Industrial, permitindo que um usuário possua um ou mais perfis simultaneamente.

## 1. Lógica de Atribuição e Conflito

1. **Relação Muitos-para-Muitos:** Um usuário pode estar vinculado a múltiplos perfis (ex: `Vendedor` + `Supervisor de Estoque`).
2. **Resolução por União (Princípio da Permissividade):** Se o usuário possui dois perfis com permissões diferentes para o mesmo módulo, o sistema aplicará a permissão mais abrangente.
   - Se o Perfil A diz `can_delete: false` e o Perfil B diz `can_delete: true`, o usuário **pode** deletar.
   - O `scope` seguirá a hierarquia: `GLOBAL` > `TEAM` > `OWNED`.

## 2. Estrutura do Banco de Dados (SQL)

```sql
-- 1. Tabela de Perfis
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL, -- Ex: 'Vendedor', 'Supervisor'
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabela de Permissões por Perfil
CREATE TABLE profile_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL, -- Ex: 'pedidos', 'estoque'

    can_read   BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,

    -- Escopos: 'OWNED', 'TEAM', 'GLOBAL'
    scope VARCHAR(20) DEFAULT 'OWNED',

    UNIQUE(profile_id, module)
);

-- 3. Tabela de Usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID, -- Referência à regional/time principal
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    active BOOLEAN DEFAULT true
);

-- 4. Tabela de Junção (Múltiplos Perfis por Usuário)
CREATE TABLE user_profiles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, profile_id)
);
```
