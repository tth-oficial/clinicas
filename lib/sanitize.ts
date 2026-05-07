/**
 * Sanitiza string para uso seguro em filtros PostgREST `.or()` / `.ilike()`.
 * Remove caracteres que mudariam a semântica do filtro (injeção de filtro).
 */
export function sanitizeFilterValue(s: string): string {
  return s
    .replace(/[,()*%]/g, '')  // sintaxe de filtro PostgREST
    .replace(/[\\']/g, '')    // escape e aspas
    .trim()
    .slice(0, 100)
}
