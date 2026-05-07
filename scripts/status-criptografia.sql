-- ============================================================
-- status-criptografia.sql
-- Mostra quais clínicas ainda têm openai_api_key e/ou
-- evolution_api_key em TEXTO PLANO (legado, antes da Sprint 1).
--
-- Uso: rodar no Supabase SQL Editor após aplicar a Sprint 1.
-- Para criptografar uma clínica: login -> Configurações ->
-- Integrações -> Salvar (não precisa redigitar nada).
-- ============================================================

SELECT
  c.nome,
  c.id AS clinica_id,
  CASE
    WHEN cc.openai_api_key IS NULL THEN 'sem key'
    WHEN cc.openai_api_key LIKE 'enc:v1:%' THEN '✓ criptografada'
    ELSE '⚠ TEXTO PLANO — re-salvar config'
  END AS openai_status,
  CASE
    WHEN cc.evolution_api_key IS NULL THEN 'sem key'
    WHEN cc.evolution_api_key LIKE 'enc:v1:%' THEN '✓ criptografada'
    ELSE '⚠ TEXTO PLANO — re-salvar config'
  END AS evolution_status,
  cc.atualizado_em AS config_atualizada_em
FROM clinicas c
LEFT JOIN clinica_config cc ON cc.clinica_id = c.id
ORDER BY c.nome;
