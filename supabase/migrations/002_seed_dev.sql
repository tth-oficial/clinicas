-- Seed de desenvolvimento — Etapa 2 CRM + Leads
-- Requer ao menos uma clínica existente no banco.
-- Execute após criar seu usuário e clínica pela interface.

DO $$
DECLARE
  v_clinica_id UUID;
  v_contato1_id UUID := uuid_generate_v4();
  v_contato2_id UUID := uuid_generate_v4();
BEGIN
  SELECT id INTO v_clinica_id FROM clinicas ORDER BY criado_em LIMIT 1;
  IF v_clinica_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma clínica encontrada. Crie uma clínica antes de rodar o seed.';
  END IF;

  -- Contatos
  INSERT INTO contatos (id, clinica_id, nome, telefone, email, origem, total_procedimentos, total_gasto) VALUES
    (v_contato1_id, v_clinica_id, 'Ana Beatriz Costa',    '(86) 98765-4321', 'ana.costa@email.com',    'Instagram', 3, 4500.00),
    (v_contato2_id, v_clinica_id, 'Carlos Eduardo Lima',  '(86) 91234-5678', 'carlos.lima@email.com',  'Indicação', 1, 1200.00);

  -- 8 leads distribuídos pelas 5 etapas
  INSERT INTO leads (clinica_id, contato_id, servico, valor_estimado, origem, etapa, temperatura, status, posicao_kanban) VALUES
    (v_clinica_id, v_contato1_id, 'Botox Facial',          680.00,  'Instagram', 'lead',              'quente', 'novo',       1),
    (v_clinica_id, v_contato2_id, 'Preenchimento Labial',  950.00,  'Indicação', 'lead',              'morno',  'em_contato', 2),
    (v_clinica_id, v_contato1_id, 'Harmonização Facial',  2800.00,  'Instagram', 'consulta_agendada', 'quente', 'agendado',   1),
    (v_clinica_id, v_contato2_id, 'Lipo HD',              8500.00,  'Indicação', 'negociacao',        'morno',  'negociando', 1),
    (v_clinica_id, v_contato1_id, 'Rinoplastia',         12000.00,  'Google',    'negociacao',        'frio',   'negociando', 2),
    (v_clinica_id, v_contato2_id, 'Peeling Químico',       550.00,  'WhatsApp',  'procedimento',      'quente', 'agendado',   1),
    (v_clinica_id, v_contato1_id, 'Botox Facial',          680.00,  'Instagram', 'pos_venda',         'quente', 'convertido', 1),
    (v_clinica_id, v_contato2_id, 'Microagulhamento',      420.00,  'Indicação', 'pos_venda',         'morno',  'convertido', 2);

  RAISE NOTICE 'Seed concluído: 2 contatos e 8 leads inseridos para a clínica %', v_clinica_id;
END $$;
