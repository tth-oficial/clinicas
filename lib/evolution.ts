import { createAdminClient } from '@/lib/supabase/admin'
import type { ClinicaConfig } from '@/types'

export interface EvolutionConfig {
  url: string
  apiKey: string
  instance: string
}

export class EvolutionAPI {
  constructor(private config: EvolutionConfig) {}

  private get baseUrl() {
    return `${this.config.url}`
  }

  private async request<T>(
    path: string,
    options?: RequestInit,
    retries = 2
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          apikey: this.config.apiKey,
          ...options?.headers,
        },
      })

      if (!response.ok) {
        const body = await response.text()
        console.error('[Evolution] Erro na requisição', { url, status: response.status, body })
        throw new Error(`Evolution API error ${response.status}: ${body}`)
      }

      return response.json() as Promise<T>
    } catch (err) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 500))
        return this.request<T>(path, options, retries - 1)
      }
      throw err
    }
  }

  /**
   * Envia mensagem de texto simples para um número
   * @param telefone Número no formato 5511999999999 (sem + e sem @s.whatsapp.net)
   * @param mensagem Texto a enviar
   */
  async sendText(telefone: string, mensagem: string): Promise<void> {
    const numero = telefone.includes('@')
      ? telefone
      : `${telefone}@s.whatsapp.net`

    await this.request(`/message/sendText/${this.config.instance}`, {
      method: 'POST',
      body: JSON.stringify({
        number: numero,
        text: mensagem,
        delay: 1000,
      }),
    })
  }

  /**
   * Envia mensagem com mídia (imagem, vídeo, documento)
   * @param telefone Número no formato 5511999999999
   * @param url URL pública da mídia
   * @param caption Legenda opcional
   */
  async sendMedia(
    telefone: string,
    url: string,
    caption?: string
  ): Promise<void> {
    const numero = telefone.includes('@')
      ? telefone
      : `${telefone}@s.whatsapp.net`

    await this.request(`/message/sendMedia/${this.config.instance}`, {
      method: 'POST',
      body: JSON.stringify({
        number: numero,
        mediatype: 'image',
        media: url,
        caption: caption ?? '',
        delay: 1000,
      }),
    })
  }

  /**
   * Retorna o status de conexão da instância
   * (Faz o fetch direto para evitar log de erro 404 no console quando a instância não existe)
   */
  async getStatus(): Promise<'open' | 'connecting' | 'close'> {
    try {
      const url = `${this.baseUrl}/instance/connectionState/${this.config.instance}`
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          apikey: this.config.apiKey,
        },
      })

      if (!response.ok) return 'close'

      const data = await response.json() as { instance?: { state?: string } }
      const state = data?.instance?.state ?? 'close'
      if (state === 'open') return 'open'
      if (state === 'connecting') return 'connecting'
      return 'close'
    } catch {
      return 'close'
    }
  }

  /**
   * Retorna o QR Code em base64 para conexão do WhatsApp
   */
  async getQRCode(): Promise<string> {
    const data = await this.request<{ base64: string }>(
      `/instance/connect/${this.config.instance}`
    )
    return data.base64 ?? ''
  }

  /**
   * Cria uma nova instância na Evolution API
   */
  async createInstance(nome: string): Promise<void> {
    await this.request(`/instance/create`, {
      method: 'POST',
      body: JSON.stringify({
        instanceName: nome,
        token: this.config.apiKey,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    })
  }

  /**
   * Conecta (ou reconecta) a instância
   */
  async connectInstance(): Promise<void> {
    await this.request(`/instance/connect/${this.config.instance}`, {
      method: 'GET',
    })
  }

  /**
   * Desconecta a instância (logout do WhatsApp)
   */
  async disconnectInstance(): Promise<void> {
    await this.request(`/instance/logout/${this.config.instance}`, {
      method: 'DELETE',
    })
  }

  /**
   * Verifica se a instância já existe na Evolution API
   */
  async checkExists(): Promise<boolean> {
    try {
      await this.request(`/instance/fetchInstances`, { method: 'GET' })
      // Se chegou aqui, busca especificamente esta instância
      const data = await this.request<{ instance: { instanceName: string } }[]>(
        `/instance/fetchInstances`
      )
      return Array.isArray(data) &&
        data.some((i) => i.instance?.instanceName === this.config.instance)
    } catch {
      return false
    }
  }

  /**
   * Configura opções globais da instância (ignorar grupos, chamadas, etc)
   */
  async configureSettings(): Promise<void> {
    await this.request(`/settings/set/${this.config.instance}`, {
      method: 'POST',
      body: JSON.stringify({
        rejectCall: true,
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false,
      }),
    })
  }

  /**
   * Configura o webhook da instância para receber eventos de mensagens.
   * Chamado automaticamente no fluxo de onboarding de cada clínica.
   * @param webhookUrl URL completa incluindo ?clinicaId=xxx
   * @param signatureSecret Se informado, é enviado pela Evolution como header
   *   `x-webhook-signature` em todo POST do webhook. Deve ser igual ao
   *   `WEBHOOK_SECRET` do app para o handler aceitar a request.
   *
   * IMPORTANTE: byEvents PRECISA ser false. Quando true, a Evolution
   * acrescenta o slug do evento à URL (ex: /webhook/messages-upsert), o que
   * faz o Next.js retornar 404 — mensagens recebidas nunca chegam ao handler.
   *
   * Evolution API v2 usa `byEvents` e `base64` no payload de entrada
   * (mas armazena/retorna como `webhookByEvents` e `webhookBase64`).
   */
  async setWebhook(webhookUrl: string, signatureSecret?: string): Promise<void> {
    const headers = signatureSecret
      ? { 'x-webhook-signature': signatureSecret }
      : undefined

    await this.request(`/webhook/set/${this.config.instance}`, {
      method: 'POST',
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          headers,
          byEvents: false,
          base64: true,
          events: [
            'MESSAGES_UPSERT',
            'CONNECTION_UPDATE',
          ],
        },
      }),
    })
  }
}

/**
 * Factory: cria um cliente Evolution com as configurações da clínica no banco.
 * Usa EVOLUTION_API_URL e EVOLUTION_API_KEY do .env como fallback.
 */
export async function createEvolutionClient(
  clinicaId: string
): Promise<EvolutionAPI> {
  // Service role: este factory é chamado em handlers server-to-server
  // (webhook, agente/processar, cron) onde não há sessão de usuário.
  const supabase = createAdminClient()

  const { data: config } = await supabase
    .from('clinica_config')
    .select('evolution_url, evolution_api_key, evolution_instance')
    .eq('clinica_id', clinicaId)
    .single()

  const cfg = config as Pick<
    ClinicaConfig,
    'evolution_url' | 'evolution_api_key' | 'evolution_instance'
  > | null

  const url =
    cfg?.evolution_url ?? process.env.EVOLUTION_API_URL ?? ''
  const apiKey =
    cfg?.evolution_api_key ?? process.env.EVOLUTION_API_KEY ?? ''
  const instance =
    cfg?.evolution_instance ?? process.env.EVOLUTION_INSTANCE ?? 'default'

  if (!url || !apiKey) {
    throw new Error(
      `[Evolution] Configuração ausente para clinica_id=${clinicaId}. ` +
        'Defina evolution_url e evolution_api_key no banco ou no .env.'
    )
  }

  return new EvolutionAPI({ url, apiKey, instance })
}
