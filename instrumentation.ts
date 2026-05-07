// Hook de boot do Next.js. Roda uma vez por instância do servidor,
// antes de qualquer request. Usamos para falhar cedo se variáveis
// críticas estiverem ausentes/placeholder em produção.
//
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env')
    validateEnv()
  }
}
