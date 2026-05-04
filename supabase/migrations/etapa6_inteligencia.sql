-- ─────────────────────────────────────────────
-- ETAPA 6 — INTELIGÊNCIA
-- Tabela de relatórios semanais gerados pela IA
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS relatorios (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id           UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  semana_inicio        DATE NOT NULL,
  semana_fim           DATE NOT NULL,
  resumo_ia            TEXT NOT NULL,
  acoes_recomendadas   JSONB NOT NULL DEFAULT '[]',
  metricas             JSONB NOT NULL DEFAULT '{}',
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clinica_id, semana_inicio)
);

ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso_por_clinica" ON relatorios
  FOR ALL USING (
    clinica_id IN (
      SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
    )
  );
