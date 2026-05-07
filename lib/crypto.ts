import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// Criptografia simétrica para segredos por-clínica (OpenAI, Evolution).
// Algoritmo: AES-256-GCM (autenticado, resistente a tampering).
// Formato: "enc:v1:<base64(iv)>:<base64(ciphertext|authTag)>"
//
// IMPORTANTE — chave-mestra:
//   ENCRYPTION_KEY no .env, base64 de 32 bytes (256 bits).
//   Gerar com: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
//   Em produção, ENCRYPTION_KEY é OBRIGATÓRIA — boot falha sem ela
//   (validateEnv).
//
// LEGADO: valores em texto plano no banco continuam funcionando para LEITURA
// (retorna como veio). Toda WRITE encripta. Backfill = atualizar a config
// uma vez via UI.

const PREFIX = 'enc:v1:'
const ALGO = 'aes-256-gcm'
const IV_BYTES = 12 // GCM padrão
const KEY_BYTES = 32

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey

  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      '[crypto] ENCRYPTION_KEY não definida. ' +
        'Gere com `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"`.'
    )
  }

  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `[crypto] ENCRYPTION_KEY deve ter ${KEY_BYTES} bytes em base64 (atual: ${buf.length}).`
    )
  }
  cachedKey = buf
  return buf
}

export function isEncrypted(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

/**
 * Criptografa um segredo. Devolve a string `enc:v1:<iv>:<payload>`.
 * Se a entrada for nula/vazia, retorna `null` (não armazena lixo).
 */
export function encryptSecret(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null
  if (isEncrypted(plaintext)) return plaintext // idempotente

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload = Buffer.concat([enc, tag]).toString('base64')
  return `${PREFIX}${iv.toString('base64')}:${payload}`
}

/**
 * Descriptografa. Se o valor não tem prefixo `enc:v1:`, é tratado como
 * legado em texto plano e devolvido como veio (compatibilidade retroativa
 * com bancos pré-criptografia).
 */
export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null
  if (!isEncrypted(value)) return value // legado plain

  try {
    const [, , ivB64, payloadB64] = value.split(':')
    if (!ivB64 || !payloadB64) throw new Error('formato inválido')
    const iv = Buffer.from(ivB64, 'base64')
    const payload = Buffer.from(payloadB64, 'base64')
    const tag = payload.subarray(payload.length - 16)
    const enc = payload.subarray(0, payload.length - 16)

    const decipher = createDecipheriv(ALGO, getKey(), iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(enc), decipher.final()])
    return dec.toString('utf8')
  } catch (err) {
    console.error('[crypto] Falha ao descriptografar segredo', err)
    return null
  }
}
