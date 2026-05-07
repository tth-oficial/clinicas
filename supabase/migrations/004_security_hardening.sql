-- ============================================================
-- 004 — SECURITY HARDENING (Sprint 1)
-- Execute APÓS 001/002/003 e todas as etapas (3,4,5,6,7,8).
-- Idempotente: pode rodar mais de uma vez sem efeitos colaterais.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Remover policies de leitura anônima em conversas/mensagens
-- (Migration 003 já tentava, mas mantemos aqui para garantir que
-- ambientes que pularam a 003 fiquem consistentes.)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_read_conversas" ON conversas;
DROP POLICY IF EXISTS "anon_read_mensagens" ON mensagens;

-- Garantir que existe policy de leitura para usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'conversas' AND policyname = 'auth_read_conversas'
  ) THEN
    CREATE POLICY "auth_read_conversas" ON conversas
      FOR SELECT TO authenticated
      USING (
        clinica_id IN (
          SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mensagens' AND policyname = 'auth_read_mensagens'
  ) THEN
    CREATE POLICY "auth_read_mensagens" ON mensagens
      FOR SELECT TO authenticated
      USING (
        clinica_id IN (
          SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mensagens' AND policyname = 'auth_update_mensagens_lido'
  ) THEN
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
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Garantir RLS em usuarios_clinicas (anti-vazamento de vínculos)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE usuarios_clinicas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'usuarios_clinicas' AND policyname = 'user_ve_apenas_seus_vinculos'
  ) THEN
    CREATE POLICY "user_ve_apenas_seus_vinculos" ON usuarios_clinicas
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Padronizar `conversas.agente_ativo` como BOOLEAN
-- A migration 001 criou TEXT (legado), o restante do código trata como BOOLEAN.
-- Convertemos com fallback seguro: 'qualificacao'/'true' → true, demais → false.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'conversas' AND column_name = 'agente_ativo';

  IF col_type = 'text' THEN
    -- Remover default antigo antes de mudar tipo
    ALTER TABLE conversas ALTER COLUMN agente_ativo DROP DEFAULT;

    ALTER TABLE conversas
      ALTER COLUMN agente_ativo TYPE boolean
      USING CASE
        WHEN agente_ativo IN ('qualificacao', 'true', 't', '1') THEN true
        ELSE false
      END;

    ALTER TABLE conversas ALTER COLUMN agente_ativo SET DEFAULT true;
    ALTER TABLE conversas ALTER COLUMN agente_ativo SET NOT NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. WITH CHECK em policies de tenant para impedir mass-assignment
-- de clinica_id por update (tenant-jumping). FOR ALL com USING
-- isolado não cobre o INSERT/UPDATE quando o cliente envia outro
-- clinica_id no payload.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'contatos','leads','agendamentos','conversas','mensagens',
    'cadencias','campanhas','metricas_diarias','clinica_config',
    'profissionais','servicos','horarios_funcionamento',
    'campanha_contatos','relatorios'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
      -- Drop policy genérica antiga (sem WITH CHECK)
      EXECUTE format('DROP POLICY IF EXISTS "acesso_por_clinica" ON %I', t);
      EXECUTE format('DROP POLICY IF EXISTS "acesso_config" ON %I', t);

      -- Recriar com USING e WITH CHECK
      EXECUTE format($f$
        CREATE POLICY "acesso_por_clinica" ON %I
          FOR ALL TO authenticated
          USING (
            clinica_id IN (SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid())
          )
          WITH CHECK (
            clinica_id IN (SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid())
          )
      $f$, t);
    END IF;
  END LOOP;
END $$;

-- Re-criar policy de cadencia_etapas via cadencias (não tem clinica_id direto)
DROP POLICY IF EXISTS "acesso_por_cadencia" ON cadencia_etapas;
CREATE POLICY "acesso_por_cadencia" ON cadencia_etapas
  FOR ALL TO authenticated
  USING (
    cadencia_id IN (
      SELECT c.id FROM cadencias c
      WHERE c.clinica_id IN (
        SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    cadencia_id IN (
      SELECT c.id FROM cadencias c
      WHERE c.clinica_id IN (
        SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
      )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. Índice de performance que estava faltando
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa_enviado
  ON mensagens(conversa_id, enviado_em DESC);

CREATE INDEX IF NOT EXISTS idx_mensagens_clinica_contato
  ON mensagens(clinica_id, enviado_em DESC)
  WHERE de = 'cliente';

-- ─────────────────────────────────────────────────────────────
-- 6. Verificação final (rodar manualmente no SQL Editor):
-- SELECT tablename, policyname FROM pg_policies
--   WHERE schemaname = 'public' AND policyname LIKE 'anon%';
-- (deve retornar 0 linhas)
--
-- SELECT data_type FROM information_schema.columns
--   WHERE table_name = 'conversas' AND column_name = 'agente_ativo';
-- (deve retornar 'boolean')
-- ─────────────────────────────────────────────────────────────
