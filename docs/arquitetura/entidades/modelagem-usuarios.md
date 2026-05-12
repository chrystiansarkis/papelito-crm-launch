# Modelagem de Entidade: Usuários (Users)

Este documento descreve a estrutura da tabela de usuários, integrando-se à arquitetura de múltiplos perfis e regionalização da indústria.

## 1. Definição da Tabela (SQL)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Para autenticação local

    -- Vínculo com a estrutura organizacional (Regional/Filial da Indústria)
    team_id UUID NOT NULL,

    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de junção para suportar múltiplos perfis (conforme arquitetura ACL)
CREATE TABLE user_profiles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, profile_id)
);
```
