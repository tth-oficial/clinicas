'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Mensagem {
  id: string
  conversa_id: string
  clinica_id: string
  de: 'cliente' | 'agente' | 'sistema'
  texto: string | null
  midia_url: string | null
  tipo_midia: string | null
  enviado_em: string
  lido: boolean
}

export function useMensagens(conversaId: string | null) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  const supabase = createClient()

  // Scroll automático para última mensagem
  const scrollParaFim = useCallback(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const carregarMensagens = useCallback(async () => {
    if (!conversaId) return

    try {
      setCarregando(true)
      setErro(null)

      const { data, error: erroQuery } = await supabase
        .from('mensagens')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('enviado_em', { ascending: true })
        .limit(100)

      if (erroQuery) throw erroQuery

      setMensagens((data ?? []) as Mensagem[])
    } catch (err) {
      console.error('[useMensagens] Erro ao carregar mensagens', err)
      setErro('Erro ao carregar mensagens')
    } finally {
      setCarregando(false)
    }
  }, [conversaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Marcar mensagens como lidas
  const marcarComoLidas = useCallback(async () => {
    if (!conversaId) return
    await supabase
      .from('mensagens')
      .update({ lido: true })
      .eq('conversa_id', conversaId)
      .eq('lido', false)
      .eq('de', 'cliente')
  }, [conversaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carregar mensagens quando a conversa muda
  useEffect(() => {
    if (!conversaId) {
      setMensagens([])
      return
    }
    carregarMensagens().then(() => {
      marcarComoLidas()
    })
  }, [conversaId, carregarMensagens, marcarComoLidas])

  // Scroll automático quando mensagens atualizam
  useEffect(() => {
    if (mensagens.length > 0) {
      // Pequeno delay para garantir renderização
      const timer = setTimeout(scrollParaFim, 100)
      return () => clearTimeout(timer)
    }
  }, [mensagens, scrollParaFim])

  // Realtime — escutar novas mensagens nesta conversa
  useEffect(() => {
    if (!conversaId) return

    const canal = supabase
      .channel(`mensagens-conversa-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          const novaMensagem = payload.new as Mensagem
          setMensagens((prev) => {
            // Evitar duplicatas
            if (prev.some((m) => m.id === novaMensagem.id)) return prev
            return [...prev, novaMensagem]
          })

          // Marcar como lida se for do cliente
          if (novaMensagem.de === 'cliente') {
            supabase
              .from('mensagens')
              .update({ lido: true })
              .eq('id', novaMensagem.id)
              .then(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [conversaId]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    mensagens,
    carregando,
    erro,
    endRef,
    recarregar: carregarMensagens,
  }
}
