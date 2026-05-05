-- ──────────────────────────────────────────────────────────────────
-- ETAPA 8 — INTEGRAÇÃO TOTAL: FUNDAÇÃO DE DADOS
-- Fase 1 do PLANO-INTEGRACAO-TOTAL.md
-- Execute no Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- PASSO 1.1 — Tabela `profissionais`
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profissionais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  especialidade TEXT,
  telefone TEXT,
  email TEXT,
  cor TEXT DEFAULT '#2D8B73',       -- cor no calendário
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profissionais_clinica ON profissionais(clinica_id);

ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profissionais' AND policyname = 'acesso_por_clinica'
  ) THEN
    CREATE POLICY "acesso_por_clinica" ON profissionais
      FOR ALL USING (clinica_id IN (
        SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
      ));
  END IF;
END $$;

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE TRIGGER trg_profissionais
  BEFORE UPDATE ON profissionais
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- ─────────────────────────────────────────────
-- PASSO 1.2 — Tabela `servicos`
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  valor DECIMAL(10,2),
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servicos_clinica ON servicos(clinica_id);

ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'servicos' AND policyname = 'acesso_por_clinica'
  ) THEN
    CREATE POLICY "acesso_por_clinica" ON servicos
      FOR ALL USING (clinica_id IN (
        SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
      ));
  END IF;
END $$;

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE TRIGGER trg_servicos
  BEFORE UPDATE ON servicos
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- ─────────────────────────────────────────────
-- PASSO 1.3 — Tabela `horarios_funcionamento`
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS horarios_funcionamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=dom, 1=seg, ..., 6=sab
  hora_inicio TIME NOT NULL DEFAULT '08:00',
  hora_fim TIME NOT NULL DEFAULT '18:00',
  ativo BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(clinica_id, dia_semana)
);

ALTER TABLE horarios_funcionamento ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'horarios_funcionamento' AND policyname = 'acesso_por_clinica'
  ) THEN
    CREATE POLICY "acesso_por_clinica" ON horarios_funcionamento
      FOR ALL USING (clinica_id IN (
        SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
      ));
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- PASSO 1.4 — Adicionar campos de escalação na `clinica_config`
-- ─────────────────────────────────────────────
ALTER TABLE clinica_config
  ADD COLUMN IF NOT EXISTS telefone_escalacao TEXT,
  ADD COLUMN IF NOT EXISTS notificar_escalacao BOOLEAN NOT NULL DEFAULT true;

-- ─────────────────────────────────────────────
-- PASSO 1.5 — Adicionar `profissional_id` em `agendamentos`
-- Mantém o campo TEXT `profissional` para compatibilidade retroativa
-- ─────────────────────────────────────────────
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS profissional_id UUID REFERENCES profissionais(id) ON DELETE SET NULL;

ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS servico_id UUID REFERENCES servicos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_id ON agendamentos(profissional_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_servico_id ON agendamentos(servico_id);

-- ─────────────────────────────────────────────
-- PASSO 1.6 — Garantir campo `status` em `conversas`
-- A etapa3 criou conversas sem status; 001 criou com status.
-- Este ADD COLUMN IF NOT EXISTS é idempotente.
-- ─────────────────────────────────────────────
ALTER TABLE conversas
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'aberta'
  CHECK (status IN ('aberta','resolvida','aguardando_humano'));

-- ─────────────────────────────────────────────
-- PASSO 1.7 — Garantir campo `bio` em `profissionais`
-- Apresentado ao paciente quando o agente lista profissionais
-- ─────────────────────────────────────────────
ALTER TABLE profissionais
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- ─────────────────────────────────────────────
-- SEED — Dados iniciais de desenvolvimento
-- Profissionais e serviços da Clínica Estética Lumina
-- ─────────────────────────────────────────────

-- Profissionais
INSERT INTO profissionais (id, clinica_id, nome, especialidade, telefone, email, cor)
VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Dra. Fernanda Queiroz',
    'Estética Avançada',
    '(86) 99812-3344',
    'fernanda@lumina.com',
    '#2D8B73'
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Dr. Rafael Mendes',
    'Dermatologia Estética',
    '(86) 99911-2233',
    'rafael@lumina.com',
    '#1B5E4F'
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Dra. Carolina Lima',
    'Depilação e Estética Corporal',
    '(86) 99800-5566',
    'carolina@lumina.com',
    '#7B2D8B'
  )
ON CONFLICT (id) DO NOTHING;

-- Serviços
INSERT INTO servicos (id, clinica_id, nome, descricao, duracao_minutos, valor)
VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Limpeza de Pele',
    'Limpeza profunda com extração de cravos e comedões.',
    60,
    250.00
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Botox',
    'Aplicação de toxina botulínica para suavização de rugas.',
    45,
    890.00
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Peeling Químico',
    'Renovação celular com ácidos de alta concentração.',
    90,
    420.00
  ),
  (
    'c1000000-0000-0000-0000-000000000004',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Microagulhamento',
    'Estimulação de colágeno com micro perfurações controladas.',
    60,
    380.00
  ),
  (
    'c1000000-0000-0000-0000-000000000005',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Harmonização Facial',
    'Preenchimento com ácido hialurônico para harmonizar traços.',
    120,
    1500.00
  ),
  (
    'c1000000-0000-0000-0000-000000000006',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Depilação a Laser',
    'Remoção definitiva de pelos com laser de alta tecnologia.',
    60,
    280.00
  )
ON CONFLICT (id) DO NOTHING;

-- Horários de funcionamento (seg a sex 08h-18h, sab 08h-13h, dom fechado)
INSERT INTO horarios_funcionamento (clinica_id, dia_semana, hora_inicio, hora_fim, ativo)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 0, '08:00', '18:00', false), -- Domingo: fechado
  ('a1b2c3d4-0000-0000-0000-000000000001', 1, '08:00', '18:00', true),  -- Segunda
  ('a1b2c3d4-0000-0000-0000-000000000001', 2, '08:00', '18:00', true),  -- Terça
  ('a1b2c3d4-0000-0000-0000-000000000001', 3, '08:00', '18:00', true),  -- Quarta
  ('a1b2c3d4-0000-0000-0000-000000000001', 4, '08:00', '18:00', true),  -- Quinta
  ('a1b2c3d4-0000-0000-0000-000000000001', 5, '08:00', '18:00', true),  -- Sexta
  ('a1b2c3d4-0000-0000-0000-000000000001', 6, '08:00', '13:00', true)   -- Sábado: meio período
ON CONFLICT (clinica_id, dia_semana) DO UPDATE
  SET hora_inicio = EXCLUDED.hora_inicio,
      hora_fim    = EXCLUDED.hora_fim,
      ativo       = EXCLUDED.ativo;

-- ─────────────────────────────────────────────
-- VERIFICAÇÃO FINAL
-- Rode este SELECT para confirmar que tudo foi criado:
-- ─────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('profissionais','servicos','horarios_funcionamento')
-- ORDER BY table_name;
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'clinica_config'
--   AND column_name IN ('telefone_escalacao','notificar_escalacao');
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'agendamentos'
--   AND column_name IN ('profissional_id','servico_id');
