import { type FormEvent, useState } from 'react'

import { supabase } from '@/lib/supabase'

type Step = 'role' | 'size' | 'priority' | 'email'

const ROLES = [
  'Residential homeowner',
  'Residential building owner',
  'Commercial building owner',
  'Property manager',
  'Real estate broker',
  'Other',
] as const

const SIZES = ['1\u201310', '10\u201350', '50\u2013200', '200+'] as const

const PRIORITIES = [
  'Preventing leaks',
  'Reducing water costs',
  'Understanding water usage',
  'Avoiding maintenance surprises',
] as const

function nextStep(current: Step, role: string): Step {
  if (current === 'role') return role === 'Residential homeowner' ? 'priority' : 'size'
  if (current === 'size') return 'priority'
  return 'email'
}

function prevStep(current: Step, role: string): Step | null {
  if (current === 'email') return 'priority'
  if (current === 'priority') return role === 'Residential homeowner' ? 'role' : 'size'
  if (current === 'size') return 'role'
  return null
}

function stepIndex(step: Step, role: string): number {
  const steps: Step[] =
    role === 'Residential homeowner'
      ? ['role', 'priority', 'email']
      : ['role', 'size', 'priority', 'email']
  return steps.indexOf(step)
}

function totalSteps(role: string): number {
  return role === 'Residential homeowner' ? 3 : 4
}

export function QuoteForm() {
  const [step, setStep] = useState<Step>('role')
  const [role, setRole] = useState('')
  const [size, setSize] = useState('')
  const [priority, setPriority] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handlePick(value: string, setter: (v: string) => void) {
    setter(value)
    setTimeout(() => setStep(nextStep(step, step === 'role' ? value : role)), 180)
  }

  function handleBack() {
    const prev = prevStep(step, role)
    if (prev) setStep(prev)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const { error } = await supabase.from('interested').insert({
        email: email.trim().toLowerCase(),
        role: role || null,
        portfolio_size: size || null,
        priority: priority || null,
      })

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

  const current = stepIndex(step, role)
  const total = totalSteps(role)

  return (
    <div className="relative px-6 py-14 text-center sm:px-16 sm:py-20">
      <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-indigo-500/15 blur-[100px] animate-glow-pulse" />
      <div
        className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-cyan-500/15 blur-[100px] animate-glow-pulse"
        style={{ animationDelay: '2s' }}
      />

      <div className="relative">
        {status === 'success' ? (
          <div className="mx-auto max-w-md">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-[22px] font-bold tracking-tight text-white sm:text-[28px]">
              You're on the list
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/40 sm:text-[15px]">
              We'll be in touch shortly with next steps. Thanks for your interest in Beluga.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 flex items-center justify-center gap-1.5">
              {Array.from({ length: total }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === current
                      ? 'w-6 bg-indigo-500'
                      : i < current
                        ? 'w-1.5 bg-indigo-500/50'
                        : 'w-1.5 bg-white/15'
                  }`}
                />
              ))}
            </div>

            {step === 'role' && (
              <div className="animate-slide-up">
                <h2 className="text-[22px] font-bold tracking-tight text-white sm:text-[28px] md:text-[34px]">
                  What best describes you?
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-[14px] text-white/40 sm:text-[15px]">
                  This helps us tailor the experience to your needs.
                </p>
                <div className="mx-auto mt-8 grid max-w-md gap-2.5 sm:mt-10 sm:grid-cols-2">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handlePick(r, setRole)}
                      className={`rounded-xl border px-4 py-3 text-[13px] font-medium transition-all sm:text-[14px] ${
                        role === r
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'size' && (
              <div className="animate-slide-up">
                <h2 className="text-[22px] font-bold tracking-tight text-white sm:text-[28px] md:text-[34px]">
                  Portfolio size
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-[14px] text-white/40 sm:text-[15px]">
                  How many units or properties do you manage?
                </p>
                <div className="mx-auto mt-8 flex max-w-sm flex-wrap justify-center gap-2.5 sm:mt-10">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handlePick(s, setSize)}
                      className={`rounded-xl border px-5 py-3 text-[13px] font-medium transition-all sm:text-[14px] ${
                        size === s
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-6 text-[13px] text-white/30 transition hover:text-white/50"
                >
                  Back
                </button>
              </div>
            )}

            {step === 'priority' && (
              <div className="animate-slide-up">
                <h2 className="text-[22px] font-bold tracking-tight text-white sm:text-[28px] md:text-[34px]">
                  What matters most to you?
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-[14px] text-white/40 sm:text-[15px]">
                  Pick the one that best reflects your main goal.
                </p>
                <div className="mx-auto mt-8 grid max-w-sm gap-2.5 sm:mt-10">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePick(p, setPriority)}
                      className={`rounded-xl border px-5 py-3 text-[13px] font-medium transition-all sm:text-[14px] ${
                        priority === p
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-6 text-[13px] text-white/30 transition hover:text-white/50"
                >
                  Back
                </button>
              </div>
            )}

            {step === 'email' && (
              <div className="animate-slide-up">
                <h2 className="text-[22px] font-bold tracking-tight text-white sm:text-[28px] md:text-[34px]">
                  Want early access or a free
                  <br className="hidden sm:block" /> building water assessment?
                </h2>
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
                    {status === 'loading' ? 'Sending...' : 'Get access'}
                  </button>
                </form>

                {status === 'error' ? <p className="mt-3 text-[13px] text-red-400">{errorMsg}</p> : null}

                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-6 text-[13px] text-white/30 transition hover:text-white/50"
                >
                  Back
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
