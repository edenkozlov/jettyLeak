import { createClient } from '@supabase/supabase-js'

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/globals/constants'

const hasConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase = hasConfig
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : (null as unknown as ReturnType<typeof createClient>)

if (!hasConfig && import.meta.env.DEV) {
  console.warn(
    '[SUPABASE] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — auth will not work.',
  )
}
