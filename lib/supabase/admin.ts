import { createClient } from '@supabase/supabase-js'

// Cliente com service role — NUNCA expor no browser
// Usado apenas em Server Components e API Routes do /admin
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
