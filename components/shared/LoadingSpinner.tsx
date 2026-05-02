export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="rounded-full border-2 border-t-transparent animate-spin"
      style={{
        width: size,
        height: size,
        borderColor: 'var(--cor-borda)',
        borderTopColor: 'var(--cor-primaria)',
      }}
    />
  )
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size={32} />
    </div>
  )
}
