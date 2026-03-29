import { type FormEvent, useState } from 'react'

import { supabase } from '@/lib/supabase'

export function InterestSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const { error } = await supabase.from('interested').insert({ email: email.trim().toLowerCase() })

      if (error) {
        if (error.code === '23505') {
          setStatus('success')
        } else {
          throw error
        }
      } else {
        setStatus('success')
      }
      setEmail('')
    } catch (err: unknown) {
      setStatus('error')
      const message = err instanceof Error ? err.message : 'Something went wrong. Try again.'
      setErrorMsg(message)
    }
  }

  return (
    <section id="interested" className="bg-white px-4 pt-12 pb-20 sm:px-0 sm:pt-16 sm:pb-28">
      <div className="mx-auto max-w-5xl sm:px-6">
        <div className="relative overflow-hidden rounded-[20px] bg-gray-950 px-6 py-14 text-center sm:rounded-[28px] sm:px-16 sm:py-20">
          <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-indigo-500/15 blur-[100px] animate-glow-pulse" />
          <div
            className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-cyan-500/15 blur-[100px] animate-glow-pulse"
            style={{ animationDelay: '2s' }}
          />

          <div className="relative">
            <h2 className="text-[26px] leading-tight font-bold tracking-tight text-white sm:text-[34px] md:text-[46px]">
              Understand your building's
              <br className="hidden sm:block" /> water system
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[14px] text-white/40 sm:mt-4 sm:text-[15px]">
              Get visibility into every fixture, every pattern, and every inefficiency.
            </p>

            {status === 'success' ? (
              <div className="mx-auto mt-8 max-w-md rounded-full border border-emerald-500/20 bg-emerald-500/10 px-6 py-3.5 text-sm font-medium text-emerald-400">
                We've got your info. Someone from our team will be in touch shortly.
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:mt-10 sm:flex-row"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 shadow-lg transition hover:bg-gray-100 hover:shadow-xl disabled:opacity-50"
                >
                  {status === 'loading' ? 'Sending...' : 'Request a Quote'}
                </button>
              </form>
            )}

            {status === 'error' ? <p className="mt-3 text-[13px] text-red-400">{errorMsg}</p> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
