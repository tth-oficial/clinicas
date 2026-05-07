#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# gerar-secrets.sh
# Gera as 3 variáveis de ambiente obrigatórias em produção.
# Uso: bash scripts/gerar-secrets.sh
# Requisitos: node instalado.
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "ERRO: node não está instalado. Instale Node.js (https://nodejs.org) antes de rodar."
  exit 1
fi

echo ""
echo "============================================================"
echo "  Secrets para o Vercel (Settings -> Environment Variables)"
echo "============================================================"
echo ""

ENC_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
WH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

cat <<EOF
ENCRYPTION_KEY=${ENC_KEY}
WEBHOOK_SECRET=${WH_SECRET}
CRON_SECRET=${CRON_SECRET}

============================================================
INSTRUÇÕES:
1. Copie as 3 linhas acima e GUARDE NUM COFRE (1Password etc).
2. Cadastre cada uma no Vercel:
   Settings -> Environment Variables -> Add New
   - marque Production, Preview e Development.
3. Após cadastrar todas, clique em Redeploy no último deploy.

ATENÇÃO:
- ENCRYPTION_KEY não pode ser perdida nem trocada depois sem migração.
  Se perder, todas as keys criptografadas no banco viram inacessíveis.
- WEBHOOK_SECRET precisa ser repassado para a Evolution API
  (cada clínica reconfigura via Configurações -> WhatsApp -> Reconectar).
============================================================
EOF
