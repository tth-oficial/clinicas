'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Clinica } from '@/types'

export function useClinica() {
  const [clinica, setClinica] = useState<Clinica | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Não autenticado'); setLoading(false); return }

      const { data, error: err } = await supabase
        .from('usuarios_clinicas')
        .select('clinicas(id, nome, logo_url, responsavel, especialidade, cidade, whatsapp, plano, ativo, criado_em, atualizado_em)')
        .eq('user_id', user.id)
        .single()

      if (err || !data?.clinicas) {
        setError('Clínica não encontrada')
      } else {
        setClinica(data.clinicas as unknown as Clinica)
      }
      setLoading(false)
    }
    load()
  }, [])

  return { clinica, loading, error }
}
