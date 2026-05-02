import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { redirect } from 'next/navigation'
import { WhatsAppClient } from '@/components/whatsapp/WhatsAppClient'
import type { ConversaItem } from '@/hooks/useConversas'
import { EvolutionAPI } from '@/lib/evolution'

export const metadata = {
  title: 'WhatsApp — Opus Clínicas',
  description: 'Gerencie suas conversas WhatsApp com o agente IA Luna',
}

export default async function WhatsAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let clinica
  try {
    clinica = await getClinicaDoUsuario(user.id)
  } catch {
    redirect('/login')
  }

  // Carregar conversas iniciais server-side (SSR)
  const { data: conversasRaw } = await supabase
    .from('conversas')
    .select(`
      id,
      clinica_id,
      contato_id,
      agente_ativo,
      criado_em,
      atualizado_em,
      contatos (
        id,
        nome,
        telefone
      )
    `)
    .eq('clinica_id', clinica.id)
    .order('atualizado_em', { ascending: false })
    .limit(50)

  // Enriquecer com última mensagem e não lidas
  const conversasIniciais: ConversaItem[] = await Promise.all(
    (conversasRaw ?? []).map(async (conversa) => {
      const [{ data: ultimaMsg }, { count: naoLidas }] = await Promise.all([
        supabase
          .from('mensagens')
          .select('texto, enviado_em, de')
          .eq('conversa_id', conversa.id)
          .order('enviado_em', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('mensagens')
          .select('*', { count: 'exact', head: true })
          .eq('conversa_id', conversa.id)
          .eq('lido', false)
          .eq('de', 'cliente'),
      ])

      const contatoRaw = conversa.contatos as unknown
      const contato = (
        Array.isArray(contatoRaw) ? contatoRaw[0] : contatoRaw
      ) as ConversaItem['contatos']

      return {
        ...conversa,
        contatos: contato,
        ultima_mensagem: ultimaMsg
          ? {
              texto: ultimaMsg.texto,
              enviado_em: ultimaMsg.enviado_em,
              de: ultimaMsg.de as 'cliente' | 'agente' | 'sistema',
            }
          : undefined,
        nao_lidas: naoLidas ?? 0,
      }
    })
  )

  // Verificar status da instância Evolution (server-side, sem bloquear se falhar)
  let instanceStatus: 'open' | 'connecting' | 'close' | 'not_configured' = 'not_configured'

  try {
    const { data: evolConfig } = await supabase
      .from('clinica_config')
      .select('evolution_url, evolution_api_key, evolution_instance')
      .eq('clinica_id', clinica.id)
      .single()

    const evolutionUrl =
      (evolConfig?.evolution_url as string | null) ??
      process.env.EVOLUTION_API_URL ?? ''
    const evolutionApiKey =
      (evolConfig?.evolution_api_key as string | null) ??
      process.env.EVOLUTION_API_KEY ?? ''
    const evolutionInstance =
      (evolConfig?.evolution_instance as string | null) ??
      `clinic-${clinica.id.replace(/-/g, '').slice(0, 8)}`

    if (evolutionUrl && evolutionApiKey) {
      const evolution = new EvolutionAPI({
        url: evolutionUrl,
        apiKey: evolutionApiKey,
        instance: evolutionInstance,
      })
      instanceStatus = await evolution.getStatus()
    }
  } catch {
    // Se Evolution API estiver offline, apenas marca como desconectado
    instanceStatus = 'close'
  }

  return (
    // -m-6 cancela o p-6 do layout pai para ocupar 100% sem scroll
    <div className="-m-6 h-[calc(100vh-4rem)] overflow-hidden">
      <WhatsAppClient
        clinicaId={clinica.id}
        conversasIniciais={conversasIniciais}
        instanceStatus={instanceStatus}
      />
    </div>
  )
}
