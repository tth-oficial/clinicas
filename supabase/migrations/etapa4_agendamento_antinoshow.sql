-- ──────────────────────────────────────────────────────
-- ETAPA 4: AGENDAMENTO + ANTI NO-SHOW
-- Execute no Supabase SQL Editor
-- ──────────────────────────────────────────────────────

-- Adicionar política para cadencia_etapas (pode não existir ainda)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cadencia_etapas' AND policyname = 'acesso_por_cadencia'
  ) THEN
    CREATE POLICY "acesso_por_cadencia" ON cadencia_etapas
      FOR ALL USING (
        cadencia_id IN (
          SELECT c.id FROM cadencias c
          WHERE c.clinica_id IN (
            SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- Garantir que a tabela agendamentos tem todos os campos necessários
-- (já existe no 001, mas garantindo índice extra)
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(clinica_id, status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional ON agendamentos(clinica_id, profissional);

-- Índice para busca de cadências ativas anti_noshow
CREATE INDEX IF NOT EXISTS idx_cadencias_tipo ON cadencias(clinica_id, tipo, status);

-- Seed de agendamentos de exemplo para dev
INSERT INTO agendamentos (
  clinica_id, contato_id, servico, profissional,
  data_hora, duracao_minutos, valor, status
)
SELECT
  'a1b2c3d4-0000-0000-0000-000000000001',
  c.id,
  s.servico,
  s.profissional,
  s.data_hora,
  s.duracao,
  s.valor,
  s.status
FROM contatos c
CROSS JOIN (
  VALUES
    ('Limpeza de Pele', 'Dra. Fernanda', NOW() + INTERVAL '2 days' + INTERVAL '9 hours', 60, 250.00, 'agendado'),
    ('Botox', 'Dra. Fernanda', NOW() + INTERVAL '3 days' + INTERVAL '10 hours', 45, 890.00, 'confirmado'),
    ('Peeling Químico', 'Dr. Rafael', NOW() + INTERVAL '1 day' + INTERVAL '14 hours', 90, 420.00, 'agendado'),
    ('Microagulhamento', 'Dra. Fernanda', NOW() + INTERVAL '5 days' + INTERVAL '11 hours', 60, 380.00, 'agendado'),
    ('Harmonização Facial', 'Dr. Rafael', NOW() - INTERVAL '2 days' + INTERVAL '9 hours', 120, 1500.00, 'realizado'),
    ('Depilação a Laser', 'Dra. Carolina', NOW() - INTERVAL '1 day' + INTERVAL '15 hours', 60, 280.00, 'no_show')
) AS s(servico, profissional, data_hora, duracao, valor, status)
WHERE c.clinica_id = 'a1b2c3d4-0000-0000-0000-000000000001'
ORDER BY c.criado_em
LIMIT 1
ON CONFLICT DO NOTHING;
