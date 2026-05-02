import { NextRequest } from 'next/server'
import { createEvolutionClient } from '@/lib/evolution'

// Helper para obter clinicaId da query ou header
function getClinicaId(request: NextRequest): string | null {
  return (
    request.nextUrl.searchParams.get('clinicaId') ??
    request.headers.get('x-clinica-id')
  )
}

// ─── GET /api/whatsapp/instance — status da instância ────────────────────────

export async function GET(request: NextRequest) {
  const clinicaId = getClinicaId(request)

  if (!clinicaId) {
    return Response.json({ error: 'clinicaId é obrigatório' }, { status: 400 })
  }

  try {
    const evolution = await createEvolutionClient(clinicaId)
    const status = await evolution.getStatus()

    return Response.json({ status })
  } catch (err) {
    console.error('[Instance] Erro ao buscar status', err)
    return Response.json(
      { error: 'Erro ao buscar status da instância', status: 'close' },
      { status: 500 }
    )
  }
}

// ─── POST /api/whatsapp/instance — conectar + retornar QR ────────────────────

export async function POST(request: NextRequest) {
  const clinicaId = getClinicaId(request)

  if (!clinicaId) {
    return Response.json({ error: 'clinicaId é obrigatório' }, { status: 400 })
  }

  try {
    const evolution = await createEvolutionClient(clinicaId)

    // Verificar status atual
    const statusAtual = await evolution.getStatus()

    if (statusAtual === 'open') {
      return Response.json({ status: 'open', qrcode: null })
    }

    // Conectar e buscar QR Code
    const qrcode = await evolution.getQRCode()

    return Response.json({
      status: 'connecting',
      qrcode,
    })
  } catch (err) {
    console.error('[Instance] Erro ao conectar instância', err)
    return Response.json(
      { error: 'Erro ao conectar instância' },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/whatsapp/instance — desconectar ─────────────────────────────

export async function DELETE(request: NextRequest) {
  const clinicaId = getClinicaId(request)

  if (!clinicaId) {
    return Response.json({ error: 'clinicaId é obrigatório' }, { status: 400 })
  }

  try {
    const evolution = await createEvolutionClient(clinicaId)
    await evolution.disconnectInstance()

    return Response.json({ ok: true, status: 'disconnected' })
  } catch (err) {
    console.error('[Instance] Erro ao desconectar instância', err)
    return Response.json(
      { error: 'Erro ao desconectar instância' },
      { status: 500 }
    )
  }
}
