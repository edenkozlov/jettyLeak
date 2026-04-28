import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { SiteFooter } from '@/components/SiteFooter'
import { supabase } from '@/lib/supabase'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

/* ────────────────────────────────────────────────────────────────────────── */
/*  Types & constants                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

type Role = 'homeowner' | 'business' | 'property_manager' | 'building_owner' | 'other'
type ContactMethod = 'Email' | 'Phone call' | 'WhatsApp'

const ROLE_OPTIONS: { key: Role; label: string; full?: boolean; Icon: () => ReactNode }[] = [
  { key: 'homeowner', label: 'Homeowner', Icon: HomeIcon },
  { key: 'business', label: 'Business owner / manager', Icon: BriefcaseIcon },
  { key: 'property_manager', label: 'Property manager', Icon: FolderIcon },
  { key: 'building_owner', label: 'Building owner', Icon: BuildingsIcon },
  { key: 'other', label: 'Other', full: true, Icon: PencilIcon },
]

const ROLE_DB_VALUE: Record<Role, string> = {
  homeowner: 'Homeowner',
  business: 'Business owner / manager',
  property_manager: 'Property manager',
  building_owner: 'Building owner',
  other: 'Other',
}

const PROPERTY_TYPES = ['Single family home', 'Condo', 'Townhouse', 'Other'] as const
const BUILDINGS_MANAGED = ['1–5', '6–20', '21–50', '51–100', '100+'] as const
const BUILDINGS_OWNED = ['1', '2–5', '6–20', '20+'] as const
const SELF_OR_PM = ['Self-manage', 'Property manager', 'Mix of both'] as const

const BUILDING_TYPES = [
  'Multi-unit residential',
  'Commercial (office, retail)',
  'Industrial',
  'Mixed-use',
  'Other',
] as const

const CHALLENGES = [
  'Unexpected water damage',
  'High or unexplained water bills',
  'Old or unknown plumbing infrastructure',
  'Compliance / insurance pressure',
  'Had a leak before, want to prevent another',
  'Just being proactive',
  'Other',
] as const

const INTERESTS = [
  'Detecting leaks early',
  'Reducing water waste',
  'Preventative maintenance',
  'Understanding my plumbing system',
  'Reducing unexpected costs',
  'Other',
] as const

const PROCESS_STAGES = [
  "Yes — let's schedule",
  'Maybe — need to coordinate first',
  'Not yet — still gathering info',
] as const

const TOTAL_STEPS = 3

/** Light phone formatter.
 *  - International numbers (anything starting with `+`) are kept free-form,
 *    stripped of garbage characters, and capped at 20 chars (E.164 is 15 digits).
 *  - Otherwise we treat input as North American and progressively format
 *    digits as `(XXX) XXX-XXXX`, capped at 10 digits. */
function formatPhone(raw: string): string {
  const trimmed = raw.trimStart()
  if (trimmed.startsWith('+')) {
    return trimmed.replace(/[^\d+\s\-()]/g, '').slice(0, 20)
  }
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length < 4) return `(${digits}`
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Page                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export default function EventForm() {
  useDocumentMeta(
    'Talk to Beluga — leak detection for buildings',
    "Tell us about your project and we'll get back to you within 48 hours.",
  )

  return (
    <div className="min-h-screen bg-gray-50 antialiased">
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogoMark />
          </Link>
          <Link to="/" className="text-[13px] text-gray-400 transition hover:text-gray-700">
            Home
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24">
        <EventLeadForm />
      </main>

      <SiteFooter variant="page" />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Form                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

type Errors = Record<string, string>

function EventLeadForm() {
  const cardRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  // Step 1
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [contactMethod, setContactMethod] = useState<ContactMethod | ''>('')

  // Step 2
  const [role, setRole] = useState<Role | ''>('')
  const [roleOther, setRoleOther] = useState('')

  // Step 3 — branched
  const [propertyType, setPropertyType] = useState('') // homeowner
  const [businessType, setBusinessType] = useState('') // business
  const [buildingsManaged, setBuildingsManaged] = useState('') // PM
  const [buildingsOwned, setBuildingsOwned] = useState('') // owner
  const [selfOrPm, setSelfOrPm] = useState('') // owner
  const [buildingTypes, setBuildingTypes] = useState<string[]>([]) // PM + owner
  const [buildingTypesOther, setBuildingTypesOther] = useState('')
  const [challenges, setChallenges] = useState<string[]>([])
  const [challengesOther, setChallengesOther] = useState('')
  const [otherSituation, setOtherSituation] = useState('') // role=other

  // Shared
  const [interests, setInterests] = useState<string[]>([])
  const [interestsOther, setInterestsOther] = useState('')
  const [processStage, setProcessStage] = useState('')

  const scrollToTop = () => {
    if (typeof window === 'undefined') return
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (submitted) scrollToTop()
  }, [submitted])

  // Clear any prior validation errors whenever the user moves between steps,
  // so step 3 never opens already showing errors from an earlier attempt.
  useEffect(() => {
    setErrors({})
  }, [step])

  /* ─── Validation ─── */

  function validateStep1(): Errors {
    const e: Errors = {}
    if (!name.trim()) e.name = 'Please enter your name.'
    if (!email.trim()) e.email = 'Please enter your email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Please enter a valid email.'
    if (!contactMethod) e.contactMethod = 'Please select a preferred contact method.'
    return e
  }

  function validateStep2(): Errors {
    const e: Errors = {}
    if (!role) e.role = 'Please select what best describes you.'
    if (role === 'other' && !roleOther.trim()) e.roleOther = 'Please tell us what you do.'
    return e
  }

  function challengesValid(): boolean {
    if (challenges.length === 0) return false
    if (challenges.includes('Other') && !challengesOther.trim()) return false
    return true
  }

  function validateStep3(): Errors {
    const e: Errors = {}

    if (role === 'homeowner') {
      if (!propertyType) e.propertyType = 'Please select a property type.'
      if (!challengesValid()) e.challenges = 'Please select at least one challenge.'
      if (challenges.includes('Other') && !challengesOther.trim())
        e.challengesOther = 'Please describe your other challenge.'
    } else if (role === 'business') {
      if (!businessType.trim()) e.businessType = 'Please tell us your type of business.'
      if (!challengesValid()) e.challenges = 'Please select at least one challenge.'
      if (challenges.includes('Other') && !challengesOther.trim())
        e.challengesOther = 'Please describe your other challenge.'
    } else if (role === 'property_manager') {
      if (!buildingsManaged) e.buildingsManaged = 'Please select how many buildings you manage.'
      if (buildingTypes.length === 0) e.buildingTypes = 'Please select at least one building type.'
      if (buildingTypes.includes('Other') && !buildingTypesOther.trim())
        e.buildingTypesOther = 'Please describe the other building type.'
    } else if (role === 'building_owner') {
      if (!buildingsOwned) e.buildingsOwned = 'Please select how many buildings you own.'
      if (buildingTypes.length === 0) e.buildingTypes = 'Please select at least one building type.'
      if (buildingTypes.includes('Other') && !buildingTypesOther.trim())
        e.buildingTypesOther = 'Please describe the other building type.'
      if (!selfOrPm) e.selfOrPm = 'Please select how the buildings are managed.'
      if (!challengesValid()) e.challenges = 'Please select at least one challenge.'
      if (challenges.includes('Other') && !challengesOther.trim())
        e.challengesOther = 'Please describe your other challenge.'
    } else if (role === 'other') {
      if (!otherSituation.trim()) e.otherSituation = 'Please tell us about your situation.'
    }

    if (interests.length === 0) e.interests = 'Please select at least one.'
    if (interests.includes('Other') && !interestsOther.trim())
      e.interestsOther = 'Please describe your other interest.'

    return e
  }

  /* ─── Step nav ─── */

  function handleContinue() {
    const stepErrors = step === 1 ? validateStep1() : validateStep2()
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) return
    setStep((s) => (s === 1 ? 2 : 3))
    scrollToTop()
  }

  function handleBack() {
    setErrors({})
    setStep((s) => (s === 3 ? 2 : 1))
    scrollToTop()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const stepErrors = validateStep3()
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) return

    setSubmitting(true)
    setSubmitError('')

    const payload = {
      name: name.trim(),
      company: company.trim() || null,
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      preferred_contact: contactMethod || null,
      role: role ? ROLE_DB_VALUE[role] : null,
      property_type: role === 'homeowner' ? propertyType || null : null,
      business_type: role === 'business' ? businessType.trim() || null : null,
      buildings_managed_range: role === 'property_manager' ? buildingsManaged || null : null,
      buildings_owned_range: role === 'building_owner' ? buildingsOwned || null : null,
      self_or_pm: role === 'building_owner' ? selfOrPm || null : null,
      building_types:
        role === 'property_manager' || role === 'building_owner'
          ? buildingTypes.length > 0
            ? buildingTypes
            : null
          : null,
      building_types_other_text:
        (role === 'property_manager' || role === 'building_owner') && buildingTypes.includes('Other')
          ? buildingTypesOther.trim() || null
          : null,
      challenges:
        role === 'homeowner' || role === 'business' || role === 'building_owner'
          ? challenges.length > 0
            ? challenges
            : null
          : null,
      challenges_other_text:
        (role === 'homeowner' || role === 'business' || role === 'building_owner') &&
        challenges.includes('Other')
          ? challengesOther.trim() || null
          : null,
      other_situation: role === 'other' ? otherSituation.trim() || null : null,
      interests,
      interests_other_text: interests.includes('Other') ? interestsOther.trim() || null : null,
      process_stage: processStage || null,
    }

    try {
      if (supabase) {
        const { error } = await supabase.from('event_leads').insert(payload)
        if (error) throw error
      } else {
        // TODO: replace with the project's real form handler / API endpoint when one exists.
        // eslint-disable-next-line no-console
        console.log('[event-form] submit payload', payload)
      }
      setSubmitted(true)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ─── Helpers ─── */

  function toggleArrayValue(list: string[], setList: (v: string[]) => void, value: string) {
    if (list.includes(value)) setList(list.filter((v) => v !== value))
    else setList([...list, value])
  }

  /* ─── Render ─── */

  if (submitted) return <SuccessScreen />

  return (
    <div
      ref={cardRef}
      className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100"
    >
      <ProgressBar step={step} total={TOTAL_STEPS} />

      <form onSubmit={handleSubmit} className="px-5 py-7 sm:px-10 sm:py-10" noValidate>
        {step === 1 ? (
          <Step1
            name={name}
            setName={setName}
            company={company}
            setCompany={setCompany}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            contactMethod={contactMethod}
            setContactMethod={setContactMethod}
            errors={errors}
          />
        ) : null}

        {step === 2 ? (
          <Step2
            role={role}
            setRole={setRole}
            roleOther={roleOther}
            setRoleOther={setRoleOther}
            errors={errors}
          />
        ) : null}

        {step === 3 ? (
          <Step3
            role={role}
            propertyType={propertyType}
            setPropertyType={setPropertyType}
            businessType={businessType}
            setBusinessType={setBusinessType}
            buildingsManaged={buildingsManaged}
            setBuildingsManaged={setBuildingsManaged}
            buildingsOwned={buildingsOwned}
            setBuildingsOwned={setBuildingsOwned}
            selfOrPm={selfOrPm}
            setSelfOrPm={setSelfOrPm}
            buildingTypes={buildingTypes}
            toggleBuildingType={(v) => toggleArrayValue(buildingTypes, setBuildingTypes, v)}
            buildingTypesOther={buildingTypesOther}
            setBuildingTypesOther={setBuildingTypesOther}
            challenges={challenges}
            toggleChallenge={(v) => toggleArrayValue(challenges, setChallenges, v)}
            challengesOther={challengesOther}
            setChallengesOther={setChallengesOther}
            otherSituation={otherSituation}
            setOtherSituation={setOtherSituation}
            interests={interests}
            toggleInterest={(v) => toggleArrayValue(interests, setInterests, v)}
            interestsOther={interestsOther}
            setInterestsOther={setInterestsOther}
            processStage={processStage}
            setProcessStage={setProcessStage}
            errors={errors}
          />
        ) : null}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="text-[13px] font-medium text-gray-500 transition hover:text-gray-900"
            >
              ← Back
            </button>
          ) : (
            <span className="hidden sm:inline" />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-7 py-3 text-[14px] font-semibold text-white shadow-sm transition hover:bg-indigo-600"
            >
              Continue
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-7 py-3 text-[14px] font-semibold text-white shadow-sm transition hover:bg-indigo-600 disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          )}
        </div>

        {submitError ? (
          <p className="mt-4 text-center text-[13px] text-red-500">{submitError}</p>
        ) : null}
      </form>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Step components                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-5 sm:px-10">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => {
          const filled = i < step
          return (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                filled ? 'bg-indigo-500' : 'bg-gray-200'
              }`}
            />
          )
        })}
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
        Step {step} of {total}
      </p>
    </div>
  )
}

type Step1Props = {
  name: string
  setName: (v: string) => void
  company: string
  setCompany: (v: string) => void
  email: string
  setEmail: (v: string) => void
  phone: string
  setPhone: (v: string) => void
  contactMethod: ContactMethod | ''
  setContactMethod: (v: ContactMethod | '') => void
  errors: Errors
}

function Step1(props: Step1Props) {
  const {
    name,
    setName,
    company,
    setCompany,
    email,
    setEmail,
    phone,
    setPhone,
    contactMethod,
    setContactMethod,
    errors,
  } = props

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[26px]">Let's connect</h1>
      <p className="mt-1 text-[14px] text-gray-500 sm:text-[15px]">
        Tell us how to reach you. We'll get back to you within 48 hours.
      </p>

      <div className="mt-7 space-y-5">
        <Field label="Name" required error={errors.name}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass(Boolean(errors.name))}
            placeholder="Jane Doe"
            autoComplete="name"
          />
        </Field>

        <Field label="Company / Organization" hint="Optional">
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={inputClass(false)}
            placeholder="Acme Holdings"
            autoComplete="organization"
          />
        </Field>

        <Field label="Email" required error={errors.email}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass(Boolean(errors.email))}
            placeholder="jane@company.com"
            autoComplete="email"
            inputMode="email"
          />
        </Field>

        <Field label="Phone" hint="Optional">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className={inputClass(false)}
            placeholder="(555) 555-0100"
            autoComplete="tel"
            inputMode="tel"
            maxLength={20}
          />
        </Field>

        <Field label="Preferred contact method" required error={errors.contactMethod}>
          <SelectInput
            value={contactMethod}
            onChange={(v) => setContactMethod(v as ContactMethod | '')}
            invalid={Boolean(errors.contactMethod)}
            placeholder="Select one"
            options={['Email', 'Phone call', 'WhatsApp']}
          />
        </Field>
      </div>
    </div>
  )
}

type Step2Props = {
  role: Role | ''
  setRole: (r: Role | '') => void
  roleOther: string
  setRoleOther: (v: string) => void
  errors: Errors
}

function Step2(props: Step2Props) {
  const { role, setRole, roleOther, setRoleOther, errors } = props

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[26px]">
        What best describes you?
      </h1>
      <p className="mt-1 text-[14px] text-gray-500 sm:text-[15px]">
        Pick the one that fits best. We'll tailor the next step.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-2.5">
        {ROLE_OPTIONS.map(({ key, label, full, Icon }) => {
          const selected = role === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setRole(key)}
              className={`group flex items-center gap-3 rounded-2xl border-2 px-4 py-5 text-left transition-all ${
                full ? 'col-span-2' : ''
              } ${
                selected
                  ? 'border-indigo-500 bg-indigo-50/70'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                  selected ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <Icon />
              </span>
              <span
                className={`text-[14px] font-semibold sm:text-[15px] ${
                  selected ? 'text-gray-900' : 'text-gray-700'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {errors.role ? <p className="mt-3 text-[13px] text-red-500">{errors.role}</p> : null}

      {role === 'other' ? (
        <div className="mt-5">
          <Field label="Tell us a bit about you" required error={errors.roleOther}>
            <input
              type="text"
              value={roleOther}
              onChange={(e) => setRoleOther(e.target.value)}
              className={inputClass(Boolean(errors.roleOther))}
              placeholder="e.g. architect, plumber, insurance broker…"
            />
          </Field>
        </div>
      ) : null}
    </div>
  )
}

type Step3Props = {
  role: Role | ''
  propertyType: string
  setPropertyType: (v: string) => void
  businessType: string
  setBusinessType: (v: string) => void
  buildingsManaged: string
  setBuildingsManaged: (v: string) => void
  buildingsOwned: string
  setBuildingsOwned: (v: string) => void
  selfOrPm: string
  setSelfOrPm: (v: string) => void
  buildingTypes: string[]
  toggleBuildingType: (v: string) => void
  buildingTypesOther: string
  setBuildingTypesOther: (v: string) => void
  challenges: string[]
  toggleChallenge: (v: string) => void
  challengesOther: string
  setChallengesOther: (v: string) => void
  otherSituation: string
  setOtherSituation: (v: string) => void
  interests: string[]
  toggleInterest: (v: string) => void
  interestsOther: string
  setInterestsOther: (v: string) => void
  processStage: string
  setProcessStage: (v: string) => void
  errors: Errors
}

function Step3(props: Step3Props) {
  const { role, errors } = props

  const challengeBlock = (
    <>
      <Field
        label="What's your biggest challenge with water or plumbing?"
        required
        hint="Select all that apply"
        error={errors.challenges}
      >
        <CheckboxGroup
          options={[...CHALLENGES]}
          values={props.challenges}
          onToggle={props.toggleChallenge}
        />
      </Field>
      {props.challenges.includes('Other') ? (
        <Field label="Other challenge" required error={errors.challengesOther}>
          <input
            type="text"
            value={props.challengesOther}
            onChange={(e) => props.setChallengesOther(e.target.value)}
            className={inputClass(Boolean(errors.challengesOther))}
            placeholder="Tell us more"
          />
        </Field>
      ) : null}
    </>
  )

  const buildingTypesBlock = (
    <>
      <Field
        label="Type of buildings"
        required
        hint="Select all that apply"
        error={errors.buildingTypes}
      >
        <CheckboxGroup
          options={[...BUILDING_TYPES]}
          values={props.buildingTypes}
          onToggle={props.toggleBuildingType}
        />
      </Field>
      {props.buildingTypes.includes('Other') ? (
        <Field label="Other building type" required error={errors.buildingTypesOther}>
          <input
            type="text"
            value={props.buildingTypesOther}
            onChange={(e) => props.setBuildingTypesOther(e.target.value)}
            className={inputClass(Boolean(errors.buildingTypesOther))}
            placeholder="Tell us more"
          />
        </Field>
      ) : null}
    </>
  )

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[26px]">
        A few more details
      </h1>
      <p className="mt-1 text-[14px] text-gray-500 sm:text-[15px]">
        This helps us prepare the right conversation.
      </p>

      <div className="mt-7 space-y-6">
        {/* ── Branched fields ── */}

        {role === 'homeowner' ? (
          <>
            <Field label="Type of property" required error={errors.propertyType}>
              <SelectInput
                value={props.propertyType}
                onChange={props.setPropertyType}
                invalid={Boolean(errors.propertyType)}
                placeholder="Select one"
                options={[...PROPERTY_TYPES]}
              />
            </Field>
            {challengeBlock}
          </>
        ) : null}

        {role === 'business' ? (
          <>
            <Field label="Type of business" required error={errors.businessType}>
              <input
                type="text"
                value={props.businessType}
                onChange={(e) => props.setBusinessType(e.target.value)}
                className={inputClass(Boolean(errors.businessType))}
                placeholder="e.g. restaurant, office, retail…"
              />
            </Field>
            {challengeBlock}
          </>
        ) : null}

        {role === 'property_manager' ? (
          <>
            <Field label="How many buildings do you manage?" required error={errors.buildingsManaged}>
              <SelectInput
                value={props.buildingsManaged}
                onChange={props.setBuildingsManaged}
                invalid={Boolean(errors.buildingsManaged)}
                placeholder="Select one"
                options={[...BUILDINGS_MANAGED]}
              />
            </Field>
            {buildingTypesBlock}
          </>
        ) : null}

        {role === 'building_owner' ? (
          <>
            <Field label="How many buildings do you own?" required error={errors.buildingsOwned}>
              <SelectInput
                value={props.buildingsOwned}
                onChange={props.setBuildingsOwned}
                invalid={Boolean(errors.buildingsOwned)}
                placeholder="Select one"
                options={[...BUILDINGS_OWNED]}
              />
            </Field>
            {buildingTypesBlock}
            <Field
              label="Do you self-manage or use a property manager?"
              required
              error={errors.selfOrPm}
            >
              <SelectInput
                value={props.selfOrPm}
                onChange={props.setSelfOrPm}
                invalid={Boolean(errors.selfOrPm)}
                placeholder="Select one"
                options={[...SELF_OR_PM]}
              />
            </Field>
            {challengeBlock}
          </>
        ) : null}

        {role === 'other' ? (
          <Field label="Tell us about your situation" required error={errors.otherSituation}>
            <textarea
              value={props.otherSituation}
              onChange={(e) => props.setOtherSituation(e.target.value)}
              className={`${inputClass(Boolean(errors.otherSituation))} min-h-[120px] resize-y`}
              placeholder="What brings you to Beluga?"
              rows={5}
            />
          </Field>
        ) : null}

        {/* ── Shared fields ── */}

        <div className="border-t border-gray-100 pt-6">
          <Field
            label="What interests you most about Beluga?"
            required
            hint="Select all that apply"
            error={errors.interests}
          >
            <CheckboxGroup
              options={[...INTERESTS]}
              values={props.interests}
              onToggle={props.toggleInterest}
            />
          </Field>
          {props.interests.includes('Other') ? (
            <Field label="Other interest" required error={errors.interestsOther}>
              <input
                type="text"
                value={props.interestsOther}
                onChange={(e) => props.setInterestsOther(e.target.value)}
                className={inputClass(Boolean(errors.interestsOther))}
                placeholder="Tell us more"
              />
            </Field>
          ) : null}
        </div>

        <Field label="Could we install right after the event?" hint="Optional">
          <SelectInput
            value={props.processStage}
            onChange={props.setProcessStage}
            invalid={false}
            placeholder="Select one"
            options={[...PROCESS_STAGES]}
          />
        </Field>

      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Reusable form primitives                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label className="text-[13px] font-semibold text-gray-800 sm:text-[14px]">
          {label}
          {required ? <span className="ml-0.5 text-indigo-500">*</span> : null}
        </label>
        {hint ? <span className="text-[12px] text-gray-400">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="mt-1.5 text-[12.5px] text-red-500">{error}</p> : null}
    </div>
  )
}

function inputClass(invalid: boolean) {
  return [
    'w-full rounded-xl border bg-white px-4 py-3 text-[14px] text-gray-900 placeholder-gray-400 outline-none transition',
    invalid
      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
  ].join(' ')
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  invalid,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
  invalid: boolean
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass(invalid)} appearance-none pr-10 ${value ? 'text-gray-900' : 'text-gray-400'}`}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

function CheckboxGroup({
  options,
  values,
  onToggle,
}: {
  options: string[]
  values: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const checked = values.includes(opt)
        return (
          <label
            key={opt}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition ${
              checked
                ? 'border-indigo-500 bg-indigo-50/70'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                checked ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white'
              }`}
            >
              {checked ? <CheckIcon className="h-3.5 w-3.5 text-white" /> : null}
            </span>
            <span
              className={`text-[14px] ${checked ? 'font-medium text-gray-900' : 'text-gray-700'}`}
            >
              {opt}
            </span>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(opt)}
              className="sr-only"
            />
          </label>
        )
      })}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Success screen                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function SuccessScreen() {
  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-gray-100 sm:px-12 sm:py-16">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/25">
          <CheckIcon className="h-8 w-8 text-white" />
        </div>
        <h1 className="mt-6 text-[26px] font-bold tracking-tight text-gray-900 sm:text-[32px]">
          You're on the list
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
          We'll get back to you within 48 hours to discuss your project. Look out for a message via your
          preferred contact method.
        </p>
      </div>

      <p className="mt-10 mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
        While you wait —
      </p>

      <div className="space-y-2.5">
        <NavCard
          to="/how-it-works"
          title="See how Beluga works"
          description="How we detect leaks and monitor your system in real time"
          Icon={CogIcon}
        />
        <NavCard
          to="/case-study"
          title="Real installations, real results"
          description="See what early pilots have found in buildings like yours"
          Icon={ClipboardIcon}
        />
        <NavCard
          to="/faq"
          title="Common questions"
          description="What's involved, what it costs, what we need from you"
          Icon={ChatIcon}
        />
      </div>
    </div>
  )
}

function NavCard({
  to,
  title,
  description,
  Icon,
}: {
  to: string
  title: string
  description: string
  Icon: () => ReactNode
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-gray-100 transition hover:ring-indigo-200 hover:shadow-sm"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
        <Icon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-gray-900 sm:text-[15px]">{title}</span>
        <span className="mt-0.5 block text-[12.5px] text-gray-500 sm:text-[13px]">{description}</span>
      </span>
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
    </Link>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Icons (no emojis)                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13.5a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3M4 7h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  )
}

function BuildingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V8l6-4 6 4v13M4 21h16M14 21V12l6-3v12M8 9h.01M8 13h.01M8 17h.01" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  )
}

function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5h6a1 1 0 0 1 1 1v1H8V6a1 1 0 0 1 1-1Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2M9 13h6M9 17h4" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />
    </svg>
  )
}
