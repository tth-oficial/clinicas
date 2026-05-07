import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const clinica = await getClinicaDoUsuario(user.id)
    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file) return Response.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'Arquivo maior que 2MB.' }, { status: 400 })
    }

    // SVG pode embutir <script> — bloquear por segurança
    if (file.type === 'image/svg+xml') {
      return Response.json({ error: 'SVG não suportado por segurança. Use PNG, JPG ou WEBP.' }, { status: 400 })
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return Response.json({ error: 'Formato inválido. Use PNG, JPG ou WEBP.' }, { status: 400 })
    }

    const extensao = file.name.split('.').pop() ?? 'png'
    const caminho = `${clinica.id}/logo.${extensao}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(caminho, file, { upsert: true, contentType: file.type })

    if (uploadError) return Response.json({ error: uploadError.message }, { status: 400 })

    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(caminho)

    await supabase
      .from('clinica_config')
      .update({ logo_url: publicUrl, atualizado_em: new Date().toISOString() })
      .eq('clinica_id', clinica.id)

    return Response.json({ url: publicUrl })
  } catch (err) {
    console.error('[Logo] POST erro', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
