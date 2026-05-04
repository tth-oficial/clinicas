import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const clinica = await getClinicaDoUsuario(user.id)
    const formData = await request.formData()
    const file = formData.get('csv') as File | null
    if (!file) return Response.json({ erro: 'Arquivo CSV não enviado' }, { status: 400 })

    const texto = await file.text()
    const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean)

    // Ignorar cabeçalho se contiver palavras-chave
    const inicio = linhas[0]?.toLowerCase().includes('nome') ? 1 : 0
    const registros = linhas.slice(inicio)

    const contatos = registros.map(linha => {
      const partes = linha.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
      return {
        clinica_id: clinica.id,
        nome: partes[0] ?? '',
        telefone: partes[1] ?? '',
        email: partes[2] || null,
        ativo: true,
        total_procedimentos: 0,
        total_gasto: 0,
      }
    }).filter(c => c.nome && c.telefone)

    if (contatos.length === 0) {
      return Response.json({ erro: 'Nenhum contato válido encontrado no CSV' }, { status: 400 })
    }

    const LOTE = 100
    let importados = 0

    for (let i = 0; i < contatos.length; i += LOTE) {
      const lote = contatos.slice(i, i + LOTE)
      const { error } = await supabase
        .from('contatos')
        .upsert(lote, { onConflict: 'clinica_id,telefone', ignoreDuplicates: true })

      if (!error) importados += lote.length
    }

    return Response.json({ importados })
  } catch (err) {
    console.error('[Importar] erro', err)
    return Response.json({ erro: 'Erro interno na importação' }, { status: 500 })
  }
}
