export const IS_PRODUCTION = import.meta.env.PROD
export const IS_STAGING = !IS_PRODUCTION

/** Primary contact for Beluga (support, sales, privacy). */
export const CONTACT_EMAIL = 'contact@trybeluga.io'
/** Use in tel: href (E.164). */
export const CONTACT_PHONE_TEL = '+15147102555'
export const CONTACT_PHONE_DISPLAY = '(514) 710-2555'

export const LINKEDIN_COMPANY_URL = 'https://www.linkedin.com/company/100204846'
export const TWITTER_URL = 'https://x.com/try_beluga'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN ?? ''
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? ''
