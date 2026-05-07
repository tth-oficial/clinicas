import { createHmac, timingSafeEqual } from 'crypto'

const SIG_PREFIX = 'sha256='

/**
 * Assina um corpo arbitrário com HMAC-SHA256(secret, body).
 * Retorna no formato `sha256=<hex>`.
 */
export function signBody(body: string, secret: string): string {
  const hmac = createHmac('sha256', secret).update(body).digest('hex')
  return `${SIG_PREFIX}${hmac}`
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * Verifica autenticidade de um webhook.
 *
 * Aceita dois formatos no header de assinatura:
 *   1. `sha256=<hex>` → HMAC-SHA256 do raw body com `secret` (preferido,
 *      protege contra replay/tamper).
 *   2. Valor cru igual ao `secret` → bearer estático. Modo de
 *      compatibilidade com Evolution API que só envia headers fixos.
 *      NÃO protege contra replay, mas pelo menos exige conhecimento do
 *      secret.
 *
 * Comparação sempre em tempo constante.
 */
export function verifyBody(body: string, secret: string, signature: string): boolean {
  if (signature.startsWith(SIG_PREFIX)) {
    const expected = signBody(body, secret)
    return constantTimeStringEqual(expected, signature)
  }
  // Fallback: bearer estático (modo Evolution legacy)
  return constantTimeStringEqual(signature, secret)
}
