-- ============================================================
-- ETAPA 3 — Migration: habilitar Realtime nas tabelas WhatsApp
-- Execute este script no SQL Editor do Supabase antes de testar
-- o Realtime nos hooks useConversas e useMensagens.
-- ============================================================

-- 1. Adicionar tabelas mensagens e conversas à publication do Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE conversas;

-- 2. Criar tabelas mensagens e conversas caso ainda não existam
-- (Se já existem, o script vai falhar nas CREATE TABLE — ignore esses erros)

CREATE TABLE IF NOT EXISTS conversas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id    uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  contato_id    uuid NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  agente_ativo  boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mensagens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  clinica_id  uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  de          text NOT NULL CHECK (de IN ('cliente', 'agente', 'sistema')),
  texto       text,
  midia_url   text,
  tipo_midia  text,
  enviado_em  timestamptz NOT NULL DEFAULT now(),
  lido        boolean NOT NULL DEFAULT false
);

-- 3. Índices de performance
CREATE INDEX IF NOT EXISTS idx_conversas_clinica_id ON conversas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_conversas_contato_id ON conversas(contato_id);
CREATE INDEX IF NOT EXISTS idx_conversas_atualizado_em ON conversas(atualizado_em DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa_id ON mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_clinica_id ON mensagens(clinica_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_enviado_em ON mensagens(enviado_em);

-- 4. RLS — habilitar e criar políticas básicas
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

-- Política: service_role tem acesso total (usada pelas API routes)
DROP POLICY IF EXISTS "service_role_all_conversas" ON conversas;
CREATE POLICY "service_role_all_conversas"
  ON conversas FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_mensagens" ON mensagens;
CREATE POLICY "service_role_all_mensagens"
  ON mensagens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Política: anon pode ler (necessário para Realtime no cliente)
DROP POLICY IF EXISTS "anon_read_conversas" ON conversas;
CREATE POLICY "anon_read_conversas"
  ON conversas FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "anon_read_mensagens" ON mensagens;
CREATE POLICY "anon_read_mensagens"
  ON mensagens FOR SELECT
  TO anon
  USING (true);
