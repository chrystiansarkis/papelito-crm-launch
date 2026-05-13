-- Sprint 2.6 · Bloco 3: nomes amigáveis pros grupos de produto.
-- Mitigates: A01 (RLS habilitada), A05 (grants explícitos por role).

CREATE TABLE IF NOT EXISTS crm.grupo_display_nome (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_original text NOT NULL UNIQUE,
  nome_amigavel text NOT NULL,
  nivel text CHECK (nivel IN ('pai','filho')),
  atualizado_em timestamptz DEFAULT now()
);

GRANT SELECT ON crm.grupo_display_nome TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON crm.grupo_display_nome TO authenticated;

ALTER TABLE crm.grupo_display_nome ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS grupo_display_select_all ON crm.grupo_display_nome;
CREATE POLICY grupo_display_select_all ON crm.grupo_display_nome
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS grupo_display_write_auth ON crm.grupo_display_nome;
CREATE POLICY grupo_display_write_auth ON crm.grupo_display_nome
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO crm.grupo_display_nome (nome_original, nome_amigavel, nivel) VALUES
  ('PAPÉIS PARA FUMO',             'Papéis',              'pai'),
  ('PAPÉIS PARA FUMO - KEEP',      'Papéis Keep',         'pai'),
  ('FILTROS',                      'Filtros',             'pai'),
  ('PITEIRAS',                     'Piteiras',            'pai'),
  ('PA PITEIRAS',                  'Acessórios Piteiras', 'pai'),
  ('ACESSORIOS',                   'Acessórios',          'pai'),
  ('BRINDES',                      'Brindes',             'pai'),
  ('MERCHANDISING',                'Merchandising',       'pai'),
  ('MERCHAN',                      'Merchandising',       'pai'),
  ('MATERIAL DE MERCHANDISING',    'Merchandising',       'pai'),
  ('MÃQUINAS ESTOQUE',             'Máquinas Estoque',    'pai'),
  ('MÁQUINAS INDÚSTRIA',           'Máquinas Indústria',  'pai'),
  ('SERVIÃ‡OS ADMINISTRATIVO',     'Serviços Admin',      'pai'),
  ('SERVIÃ‡OS GRÁFICOS EM PRODUTOS','Serviços Gráficos',  'pai'),
  ('SERVIÃ‡OS OPERACIONAIS',       'Serviços Operacionais','pai'),
  ('SERVICO TORNEADORA',           'Serviço Torneadora',  'pai'),
  ('FACA CORTE E VINTO',           'Facas Corte/Vinco',   'pai'),
  ('MAO DE OBRA',                  'Mão de Obra',         'pai'),
  ('MAT. P MANUTENÇÃO - PITEIRAS', 'Manut. Piteiras',     'pai'),
  ('MANUT DE EQUIPAMENTOS - INDUST','Manut. Equipamentos','pai'),
  ('MATERIAIS PARA CONSTRUÇÃO',    'Materiais Construção','pai'),
  ('MATERIAIS PARA EVENTOS',       'Materiais Eventos',   'pai'),
  ('MATERIAL ADMINISTRATIVO',      'Material Admin',      'pai'),
  ('MATÉRIAS-PRIMAS',              'Matérias-primas',     'pai'),
  ('BENS MKT - OFFLINE',           'Bens MKT Offline',    'pai'),
  ('DIVERSOS - OPERAÇÃO',          'Diversos Operação',   'pai'),
  ('EQUIPAMENTOS ADMINISTRATIVOS', 'Equipamentos Admin',  'pai'),
  ('SAAS',                         'SaaS',                'pai'),
  ('LINHA TRADICIONAL',            'Tradicional',         'filho'),
  ('LINHA BROWN',                  'Brown',               'filho'),
  ('LINHA BROWN SLIM',             'Brown Slim',          'filho'),
  ('LINHA SLIM',                   'Slim',                'filho'),
  ('LINHA ESPECIAL',               'Especial',            'filho'),
  ('LINHA EXTRA LARGE',            'Extra Large',         'filho'),
  ('LINHA HEMP',                   'Hemp',                'filho'),
  ('LINHA BROWN KEEP',             'Brown Keep',          'filho'),
  ('LINHA CLASSIC - KEEP',         'Classic Keep',        'filho'),
  ('FILTRO BIODEGRADAVEL',         'Biodegradável',       'filho'),
  ('FILTRO SLIM',                  'Slim',                'filho'),
  ('FILTRO TRADICIONAL',           'Tradicional',         'filho'),
  ('PITEIRA TRADICIONAL',          'Tradicional',         'filho'),
  ('PITEIRA SLIM',                 'Slim',                'filho'),
  ('PITEIRA LARGE',                'Large',               'filho'),
  ('PITEIRAS TRADICIONAIS',        'Tradicionais',        'filho'),
  ('PA BLOCOS DE PITEIRAS',        'Blocos',              'filho'),
  ('PA DISPLAYS DE PITEIRAS',      'Displays',            'filho'),
  ('PA DISPLAYS DE PITEIRAS SL',   'Displays Slim',       'filho'),
  ('PA DISPLAYS DE PITEIRAS SELADO','Displays Selados',   'filho'),
  ('ACESSÓRIOS',                   'Acessórios',          'filho'),
  ('BANDEJA CHAVEIRO PAPELITO',    'Bandeja Chaveiro',    'filho'),
  ('BANDEJAS G',                   'Bandejas G',          'filho'),
  ('BANDEJAS M',                   'Bandejas M',          'filho'),
  ('BANDEJAS P',                   'Bandejas P',          'filho'),
  ('BITUQUEIRAS',                  'Bituqueiras',         'filho'),
  ('CINZEIROS',                    'Cinzeiros',           'filho'),
  ('DICHAVADORES',                 'Dichavadores',        'filho'),
  ('EXPOSITORES KEEP',             'Expositores Keep',    'filho'),
  ('EXPOSITORES PAPELITO',         'Expositores Papelito','filho'),
  ('LOVE BRANDING IMPORTADO',      'Love Branding Imp.',  'filho'),
  ('LOVE BRANDING NACIONAL',       'Love Branding Nac.',  'filho'),
  ('MATERIAL PROMOCIONAL',         'Material Promocional','filho'),
  ('TABAQUEIRAS',                  'Tabaqueiras',         'filho'),
  ('TUBELITOS',                    'Tubelitos',           'filho'),
  ('MP DICHAVADORES',              'MP Dichavadores',     'filho'),
  ('MP PITEIRAS',                  'MP Piteiras',         'filho'),
  ('MP SEDAS',                     'MP Sedas',            'filho')
ON CONFLICT (nome_original) DO UPDATE
  SET nome_amigavel = EXCLUDED.nome_amigavel,
      nivel = EXCLUDED.nivel,
      atualizado_em = now();
