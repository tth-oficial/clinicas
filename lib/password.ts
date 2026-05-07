import { randomInt } from 'crypto'

// Charset sem caracteres ambíguos (0/O, 1/l/I) para reduzir confusão
// quando a senha é lida em voz por telefone para o cliente.
const CHARSET =
  'ABCDEFGHJKLMNPQRSTUVWXYZ' +
  'abcdefghjkmnpqrstuvwxyz' +
  '23456789' +
  '@#!$%&*'

/**
 * Gera senha aleatória usando CSPRNG (`crypto.randomInt`), no servidor.
 * Comprimento mínimo 12, padrão 14.
 */
export function gerarSenhaSegura(tamanho = 14): string {
  if (tamanho < 12) {
    throw new Error('Senha deve ter pelo menos 12 caracteres')
  }
  let senha = ''
  for (let i = 0; i < tamanho; i++) {
    senha += CHARSET[randomInt(0, CHARSET.length)]
  }
  return senha
}
