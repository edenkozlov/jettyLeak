import { supabase } from '@/lib/supabase'

export interface NightWatchResult {
  ok?: boolean
  status?: string
  diagnosis?: string
  flowPattern?: string
  patternConfidence?: number
  sustainedSeconds?: number
  shouldAlert?: boolean
  smsSent?: boolean
  error?: string
}

/** Invoke jetty-night-watch edge function (uses logged-in user JWT). */
export async function invokeNightWatch(dryRun = false): Promise<NightWatchResult | null> {
  if (!supabase) return null

  const { data, error } = await supabase.functions.invoke('jetty-night-watch', {
    body: { dryRun },
  })

  if (error) {
    console.warn('[jetty] night-watch invoke failed:', error.message)
    return { ok: false, error: error.message }
  }

  return (data ?? null) as NightWatchResult | null
}
