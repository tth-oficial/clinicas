-- ============================================================
-- verificar-seguranca.sql
-- Roda no Supabase SQL Editor. Confirma que a migration 004
-- foi aplicada corretamente. Cada query é independente.
-- ============================================================

-- 1) NENHUMA política aberta a `anon` deve sobrar em conversas/mensagens
-- Esperado: 0 linhas
SELECT
  '⚠ ATENÇÃO: ainda existem policies anon' AS alerta,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'anon%'
  AND tablename IN ('conversas', 'mensagens');

-- 2) `conversas.agente_ativo` deve ser BOOLEAN (não TEXT)
-- Esperado: data_type = 'boolean'
SELECT
  column_name,
  data_type,
  CASE
    WHEN data_type = 'boolean' THEN '✓ OK'
    ELSE '⚠ DEVE SER boolean'
  END AS status
FROM information_schema.columns
WHERE table_name = 'conversas' AND column_name = 'agente_ativo';

-- 3) RLS deve estar ATIVO em todas as tabelas com clinica_id
-- Esperado: rowsecurity = true em todas
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_ativo,
  CASE WHEN rowsecurity THEN '✓ OK' ELSE '⚠ ATIVAR RLS' END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'clinicas','clinica_config','contatos','leads','agendamentos',
    'conversas','mensagens','cadencias','cadencia_etapas',
    'campanhas','metricas_diarias','usuarios_clinicas',
    'profissionais','servicos','horarios_funcionamento',
    'campanha_contatos','relatorios'
  )
ORDER BY tablename;

-- 4) Policies de tenant devem ter WITH CHECK (não só USING)
-- Esperado: todas com qual + with_check preenchidos
SELECT
  tablename,
  policyname,
  CASE
    WHEN with_check IS NULL THEN '⚠ FALTA WITH CHECK'
    ELSE '✓ OK'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN ('acesso_por_clinica', 'acesso_por_cadencia', 'acesso_config')
ORDER BY tablename;

-- 5) Realtime publication ainda inclui mensagens e conversas
-- Esperado: 2 linhas (mensagens, conversas)
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('mensagens', 'conversas');
