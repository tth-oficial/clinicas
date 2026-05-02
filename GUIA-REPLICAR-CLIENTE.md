# GUIA DE OPERAÇÃO — REPLICAR PARA NOVO CLIENTE
# Para uso interno de Thiago / Opus Clínicas

---

## TEMPO ESTIMADO: 30-40 minutos por cliente novo

---

## PASSO 1 — Supabase (5 min)

1. No painel Supabase, ir em **Table Editor → clinicas**
2. Inserir nova clínica:
   ```
   nome: "Clínica X"
   responsavel: "Dr. Fulano"
   especialidade: "Odontologia"
   cidade: "Teresina, PI"
   whatsapp: "(86) 99999-9999"
   plano: "medio"
   ```
3. Copiar o `id` gerado (UUID)

4. Inserir em **clinica_config**:
   ```
   clinica_id: [UUID copiado]
   agente_nome: "Sofia"
   agente_prompt: [prompt personalizado da clínica]
   openai_api_key: [chave OpenAI da clínica]
   ```

5. Criar usuário no **Auth → Users**:
   - Email e senha do responsável da clínica
   - Copiar o `user_id`

6. Inserir em **usuarios_clinicas**:
   ```
   user_id: [user_id copiado]
   clinica_id: [clinica_id copiado]
   papel: "admin"
   ```

---

## PASSO 2 — Evolution API (10 min)

1. Acessar painel da Evolution API
2. Criar nova instância com nome da clínica (ex: "clinica-x-lumina")
3. Copiar URL + API Key da instância
4. Atualizar no Supabase → clinica_config:
   ```
   evolution_url: "https://evolution.seudominio.com"
   evolution_api_key: "key_aqui"
   evolution_instance: "clinica-x-lumina"
   ```
5. Configurar webhook da instância para apontar para:
   ```
   https://opus-clinicas.vercel.app/api/whatsapp/webhook
   Header: x-clinica-id: [UUID da clínica]
   Header: x-webhook-signature: [WEBHOOK_SECRET]
   ```

---

## PASSO 3 — Personalização Visual (5 min)

1. Acessar sistema como admin da clínica
2. Ir em Configurações → Identidade
3. Fazer upload do logo
4. Ajustar cores se necessário
5. Salvar

---

## PASSO 4 — Conectar WhatsApp (5 min)

1. Ir em Configurações → WhatsApp
2. Clicar "Conectar"
3. QR Code aparece na tela
4. Cliente escaneia com o WhatsApp da clínica
5. Status muda para "Conectado"

---

## PASSO 5 — Configurar Agente (10 min)

1. Ir em Configurações → Agente IA
2. Definir nome do agente
3. Colar prompt personalizado (usar template abaixo)
4. Testar no chat interno
5. Ajustar até estar satisfatório
6. Ativar

### Template de Prompt por Nicho

**Estética:**
```
Você é {nome}, assistente virtual da {clinica}.
Atenda pacientes de forma profissional e acolhedora.
Serviços: [listar serviços e preços]
Horários: [dias e horários]
Para agendar: confirme nome, serviço, data e hora preferidos.
Não invente preços fora da lista acima.
```

**Odontologia:**
```
Você é {nome}, assistente da {clinica}.
Especialidades: [listar]
Convênios aceitos: [listar]
Para urgências: orientar a ligar para [telefone].
Para consultas de rotina: seguir fluxo de agendamento.
```

---

## PASSO 6 — Importar Contatos (5 min)

1. Ir em Leads → Importar
2. Fazer upload do CSV (modelo fornecido)
3. Mapear colunas (nome, telefone, email, origem)
4. Confirmar importação
5. Contatos aparecem disponíveis para campanha de reaquecimento

---

## CHECKLIST CLIENTE NOVO

- [ ] Clínica criada no Supabase
- [ ] Usuário criado e vinculado
- [ ] Evolution API instância criada
- [ ] Webhook configurado
- [ ] WhatsApp conectado (QR escaneado)
- [ ] Prompt do agente testado e aprovado
- [ ] Logo e cores configurados
- [ ] Contatos importados
- [ ] Primeira campanha de reaquecimento criada
- [ ] Cliente treinado (30 min de onboarding)

---

## QUANTO COBRAR DE CONFIGURAÇÃO

O tempo de setup é ~40 minutos de trabalho técnico.
O valor cobrado (R$ 3.500 a R$ 10.000) é pelo sistema, não pelo tempo.
Esse guia é o seu processo operacional que garante entrega em 30 dias.
