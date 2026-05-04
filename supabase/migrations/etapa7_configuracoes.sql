-- ─────────────────────────────────────────────
-- ETAPA 7 — CONFIGURAÇÕES + POLISH FINAL
-- ─────────────────────────────────────────────

-- Adicionar campo de templates de cadências na config da clínica
ALTER TABLE clinica_config
  ADD COLUMN IF NOT EXISTS templates_cadencias JSONB NOT NULL DEFAULT '{}';

-- Storage bucket para logos (executar no Supabase Studio se ainda não existe)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true)
-- ON CONFLICT (id) DO NOTHING;

-- RLS para storage de logos
-- CREATE POLICY "logo_publico" ON storage.objects
--   FOR SELECT USING (bucket_id = 'logos');

-- CREATE POLICY "logo_upload_autenticado" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'logos' AND auth.uid() IS NOT NULL
--   );

-- Índice de texto completo para busca global
CREATE INDEX IF NOT EXISTS idx_contatos_busca_nome
  ON contatos USING gin(to_tsvector('portuguese', nome));

CREATE INDEX IF NOT EXISTS idx_contatos_telefone
  ON contatos(telefone);

CREATE INDEX IF NOT EXISTS idx_leads_busca_servico
  ON leads USING gin(to_tsvector('portuguese', servico));
