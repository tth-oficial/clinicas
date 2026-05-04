import Link from 'next/link'

export default function NotFound() {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', background: '#F0F7F5' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '1.5rem',
            padding: '3rem 2.5rem',
            maxWidth: 420,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: '1px solid #E2EDE9',
          }}>
            <p style={{ fontSize: '4rem', lineHeight: 1, marginBottom: '0.5rem' }}>404</p>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A1A1A', marginBottom: '0.75rem' }}>
              Página não encontrada
            </h1>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              A página que você está procurando não existe ou foi movida.
            </p>
            <Link
              href="/dashboard"
              style={{
                display: 'inline-block',
                padding: '0.6rem 1.5rem',
                background: '#1B5E4F',
                color: '#fff',
                borderRadius: '0.75rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              Voltar ao Dashboard
            </Link>
          </div>
          <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#9CA3AF' }}>
            Opus Clínicas
          </p>
        </div>
      </body>
    </html>
  )
}
