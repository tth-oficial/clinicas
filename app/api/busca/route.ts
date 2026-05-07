import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { sanitizeFilterValue } from '@/lib/sanitize'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const qRaw = request.nextUrl.searchParams.get('q')?.trim()
  if (!qRaw || qRaw.length < 2) return Response.json({ resultados: [] })
  const q = sanitizeFilterValue(qRaw)
  if (q.length < 2) return Response.json({ resultados: [] })

  try {
    const clinica = await getClinicaDoUsuario(user.id)

    const [contatosRes, leadsRes] = await Promise.all([
      supabase
        .from('contatos')
        .select('id, nome, telefone, email')
        .eq('clinica_id', clinica.id)
        .or(`nome.ilike.%${q}%,telefone.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(5),
      supabase
        .from('leads')
        .select('id, servico, status, etapa, contatos(nome, telefone)')
        .eq('clinica_id', clinica.id)
        .ilike('servico', `%${q}%`)
        .limit(5),
    ])

    const resultados = [
      ...(contatosRes.data ?? []).map((c) => ({
        tipo: 'contato' as const,
        id: c.id,
        titulo: c.nome,
        subtitulo: c.telefone,
        href: `/crm`,
      })),
      ...(leadsRes.data ?? []).map((l) => {
        const contato = Array.isArray(l.contatos) ? l.contatos[0] : l.contatos
        return {
          tipo: 'lead' as const,
          id: l.id,
          titulo: l.servico,
          subtitulo: contato ? (contato as { nome: string }).nome : l.status,
          href: `/leads`,
        }
      }),
    ]

    return Response.json({ resultados })
  } catch (err) {
    console.error('[Busca] erro', err)
    return Response.json({ resultados: [] })
  }
}
