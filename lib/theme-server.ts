import { createClient } from '@/lib/supabase/server'
import { gerarTema, type Tema } from '@/lib/theme'

export async function getTemaClinica(clinicaId: string): Promise<Tema> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('clinica_config')
    .select('cor_principal, cor_destaque, cor_fundo, cor_sidebar, fonte, nome_exibicao, logo_url, favicon_url, slogan')
    .eq('clinica_id', clinicaId)
    .single()

  if (!data) return gerarTema('#1B5E4F')

  return gerarTema(data.cor_principal, {
    corDestaque:  data.cor_destaque,
    corFundo:     data.cor_fundo,
    corSidebar:   data.cor_sidebar,
    fonte:        data.fonte,
    nomeExibicao: data.nome_exibicao ?? undefined,
    logoUrl:      data.logo_url,
    faviconUrl:   data.favicon_url,
    slogan:       data.slogan,
  })
}
