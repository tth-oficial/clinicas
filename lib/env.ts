/**
 * Valida variáveis de ambiente críticas no startup do servidor.
 * Importar em qualquer API route server-side para falhar cedo com mensagem clara.
 */

const requiredServer = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

const recommendedServer = [
  'OPENAI_API_KEY',
  'EVOLUTION_API_URL',
  'EVOLUTION_API_KEY',
  'WEBHOOK_SECRET',
  'CRON_SECRET',
  'NEXT_PUBLIC_APP_URL',
] as const

export function validateEnv(): void {
  const missing: string[] = []
  const placeholder: string[] = []

  for (const key of requiredServer) {
    const val = process.env[key]
    if (!val) {
      missing.push(key)
    } else if (val === 'trocar_por_string_aleatoria_forte') {
      placeholder.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] Variáveis obrigatórias ausentes: ${missing.join(', ')}. Verifique o .env.local ou as variáveis no Vercel.`
    )
  }

  if (placeholder.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      `[env] Variáveis com valor placeholder em produção: ${placeholder.join(', ')}. Substitua pelos valores reais.`
    )
  }

  for (const key of recommendedServer) {
    const val = process.env[key]
    if (!val || val === 'trocar_por_string_aleatoria_forte') {
      if (process.env.NODE_ENV === 'production') {
        console.warn(`[env] Variável recomendada não configurada em produção: ${key}`)
      }
    }
  }
}
