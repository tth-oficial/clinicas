-- ─────────────────────────────────────────────
-- ETAPA 5 — AUTOMAÇÕES
-- Adiciona tabela campanha_contatos e campo
-- periodo_inatividade_meses em campanhas
-- ─────────────────────────────────────────────

ALTER TABLE campanhas
  ADD COLUMN IF NOT EXISTS periodo_inatividade_meses INTEGER DEFAULT 3;

-- Rastreia envios individuais de cada campanha
CREATE TABLE IF NOT EXISTS campanha_contatos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id   UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  clinica_id    UUID NOT NULL REFERENCES clinicas(id)  ON DELETE CASCADE,
  contato_id    UUID NOT NULL REFERENCES contatos(id)  ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','enviado','respondeu','convertido','erro')),
  enviado_em    TIMESTAMPTZ,
  respondeu_em  TIMESTAMPTZ,
  UNIQUE(campanha_id, contato_id)
);

ALTER TABLE campanha_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso_por_clinica" ON campanha_contatos
  FOR ALL USING (
    clinica_id IN (
      SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
    )
  );
