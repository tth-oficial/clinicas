-- ============================================================
-- SECURITY FIX: corrigir RLS em conversas/mensagens/usuarios_clinicas
-- Execute este script no SQL Editor do Supabase (Settings → SQL Editor)
-- ============================================================

-- 1. Remover políticas anônimas perigosas (qualquer anon key lê tudo)
DROP POLICY IF EXISTS "anon_read_conversas" ON conversas;
DROP POLICY IF EXISTS "anon_read_mensagens" ON mensagens;

-- 2. Políticas de leitura para usuários autenticados da clínica
CREATE POLICY "auth_read_conversas" ON conversas
  FOR SELECT TO authenticated
  USING (
    clinica_id IN (
      SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "auth_read_mensagens" ON mensagens
  FOR SELECT TO authenticated
  USING (
    clinica_id IN (
      SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
    )
  );

-- 3. Política de UPDATE para marcar mensagens como lidas (client-side via useMensagens hook)
CREATE POLICY "auth_update_mensagens_lido" ON mensagens
  FOR UPDATE TO authenticated
  USING (
    clinica_id IN (
      SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    clinica_id IN (
      SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
    )
  );

-- 4. Habilitar RLS em usuarios_clinicas (estava sem RLS — qualquer auth lia vínculos de todos)
ALTER TABLE usuarios_clinicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_ve_apenas_seus_vinculos" ON usuarios_clinicas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
