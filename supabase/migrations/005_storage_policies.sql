-- ============================================================
-- 005_storage_policies.sql
-- Bucket de logos + políticas de acesso por clínica
-- ============================================================

-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública (logos são exibidos para visitantes)
DROP POLICY IF EXISTS "logo_publico_leitura" ON storage.objects;
CREATE POLICY "logo_publico_leitura" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

-- Upload só para usuário autenticado da própria clínica
DROP POLICY IF EXISTS "logo_upload_propria_clinica" ON storage.objects;
CREATE POLICY "logo_upload_propria_clinica" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (
      SELECT clinica_id::text FROM usuarios_clinicas WHERE user_id = auth.uid()
    )
  );

-- Update só para usuário autenticado da própria clínica
DROP POLICY IF EXISTS "logo_update_propria_clinica" ON storage.objects;
CREATE POLICY "logo_update_propria_clinica" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (
      SELECT clinica_id::text FROM usuarios_clinicas WHERE user_id = auth.uid()
    )
  );
