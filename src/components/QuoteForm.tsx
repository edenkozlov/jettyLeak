import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { supabase } from '@/lib/supabase'

type Step = 'role' | 'size' | 'priority' | 'email'

const ROLE_KEYS = [
  'residential_homeowner',
  'residential_building_owner',
  'commercial_building_owner',
  'property_manager',
  'real_estate_broker',
  'other',
] as const

type RoleKey = (typeof ROLE_KEYS)[number]

/** Values stored in DB (English, unchanged for reporting compatibility). */
const ROLE_DB_VALUE: Record<RoleKey, string> = {
  residential_homeowner: 'Residential homeowner',
  residential_building_owner: 'Residential building owner',
  commercial_building_owner: 'Commercial building owner',
  property_manager: 'Property manager',
  real_estate_broker: 'Real estate broker',
  other: 'Other',
}

const SIZE_KEYS = ['1_10', '10_50', '50_200', '200_plus'] as const
type SizeKey = (typeof SIZE_KEYS)[number]

const SIZE_DB_VALUE: Record<SizeKey, string> = {
  '1_10': '1\u201310',
  '10_50': '10\u201350',
  '50_200': '50\u2013200',
  '200_plus': '200+',
}

const PRIORITY_KEYS = [
  'preventing_leaks',
  'reducing_costs',
  'understanding_usage',
  'avoiding_surprises',
] as const

type PriorityKey = (typeof PRIORITY_KEYS)[number]

const PRIORITY_DB_VALUE: Record<PriorityKey, string> = {
  preventing_leaks: 'Preventing leaks',
  reducing_costs: 'Reducing water costs',
  understanding_usage: 'Understanding water usage',
  avoiding_surprises: 'Avoiding maintenance surprises',
}

function nextStep(current: Step, roleKey: string): Step {
  if (current === 'role') return roleKey === 'residential_homeowner' ? 'priority' : 'size'
  if (current === 'size') return 'priority'
  return 'email'
}

function prevStep(current: Step, roleKey: string): Step | null {
  if (current === 'email') return 'priority'
  if (current === 'priority') return roleKey === 'residential_homeowner' ? 'role' : 'size'
  if (current === 'size') return 'role'
  return null
}

function stepIndex(step: Step, roleKey: string): number {
  const steps: Step[] =
    roleKey === 'residential_homeowner' ? ['role', 'priority', 'email'] : ['role', 'size', 'priority', 'email']
  return steps.indexOf(step)
}

function totalSteps(roleKey: string): number {
  return roleKey === 'residential_homeowner' ? 3 : 4
}

export function QuoteForm() {
  const { t } = useTranslation('landing')
  const [step, setStep] = useState<Step>('role')
  const [role, setRole] = useState<RoleKey | ''>('')
  const [size, setSize] = useState<SizeKey | ''>('')
  const [priority, setPriority] = useState<PriorityKey | ''>('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handlePickRole(key: RoleKey) {
    setRole(key)
    setTimeout(() => setStep(nextStep(step, key)), 180)
  }

  function handlePickSize(key: SizeKey) {
    setSize(key)
    setTimeout(() => setStep(nextStep(step, role)), 180)
  }

  function handlePickPriority(key: PriorityKey) {
    setPriority(key)
    setTimeout(() => setStep(nextStep(step, role)), 180)
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
        role: role ? ROLE_DB_VALUE[role] : null,
        portfolio_size: size ? SIZE_DB_VALUE[size] : null,
        priority: priority ? PRIORITY_DB_VALUE[priority] : null,
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
      const message = err instanceof Error ? err.message : t('quote.errorFallback')
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
            <h2 className="text-[22px] font-bold tracking-tight text-white sm:text-[28px]">{t('quote.success.title')}</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/40 sm:text-[15px]">{t('quote.success.body')}</p>
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
                  {t('quote.roleStep.title')}
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-[14px] text-white/40 sm:text-[15px]">{t('quote.roleStep.subtitle')}</p>
                <div className="mx-auto mt-8 grid max-w-md gap-2.5 sm:mt-10 sm:grid-cols-2">
                  {ROLE_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handlePickRole(key)}
                      className={`rounded-xl border px-4 py-3 text-[13px] font-medium transition-all sm:text-[14px] ${
                        role === key
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80'
                      }`}
                    >
                      {t(`quote.roles.${key}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'size' && (
              <div className="animate-slide-up">
                <h2 className="text-[22px] font-bold tracking-tight text-white sm:text-[28px] md:text-[34px]">
                  {t('quote.sizeStep.title')}
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-[14px] text-white/40 sm:text-[15px]">{t('quote.sizeStep.subtitle')}</p>
                <div className="mx-auto mt-8 flex max-w-sm flex-wrap justify-center gap-2.5 sm:mt-10">
                  {SIZE_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handlePickSize(key)}
                      className={`rounded-xl border px-5 py-3 text-[13px] font-medium transition-all sm:text-[14px] ${
                        size === key
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80'
                      }`}
                    >
                      {t(`quote.sizes.${key}`)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-6 text-[13px] text-white/30 transition hover:text-white/50"
                >
                  {t('quote.back')}
                </button>
              </div>
            )}

            {step === 'priority' && (
              <div className="animate-slide-up">
                <h2 className="text-[22px] font-bold tracking-tight text-white sm:text-[28px] md:text-[34px]">
                  {t('quote.priorityStep.title')}
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-[14px] text-white/40 sm:text-[15px]">{t('quote.priorityStep.subtitle')}</p>
                <div className="mx-auto mt-8 grid max-w-sm gap-2.5 sm:mt-10">
                  {PRIORITY_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handlePickPriority(key)}
                      className={`rounded-xl border px-5 py-3 text-[13px] font-medium transition-all sm:text-[14px] ${
                        priority === key
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80'
                      }`}
                    >
                      {t(`quote.priorities.${key}`)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-6 text-[13px] text-white/30 transition hover:text-white/50"
                >
                  {t('quote.back')}
                </button>
              </div>
            )}

            {step === 'email' && (
              <div className="animate-slide-up">
                <h2 className="text-[22px] font-bold tracking-tight text-white sm:text-[28px] md:text-[34px]">
                  {t('quote.emailStep.titleLine1')}
                  <br className="hidden sm:block" /> {t('quote.emailStep.titleLine2')}
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
                    placeholder={t('quote.emailStep.placeholder')}
                    className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 shadow-lg transition hover:bg-gray-100 hover:shadow-xl disabled:opacity-50"
                  >
                    {status === 'loading' ? t('quote.emailStep.submitLoading') : t('quote.emailStep.submit')}
                  </button>
                </form>

                {status === 'error' ? <p className="mt-3 text-[13px] text-red-400">{errorMsg}</p> : null}

                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-6 text-[13px] text-white/30 transition hover:text-white/50"
                >
                  {t('quote.back')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
