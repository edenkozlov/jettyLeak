import useAuth from '@/hooks/auth/useAuth'
import { useTheme } from '@/contexts/ThemeContext'

export default function Settings() {
  const { userData, role } = useAuth()
  const { mode, toggleTheme } = useTheme()

  const email = (userData?.email as string) ?? '—'
  const name = (userData?.name as string) ?? email

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold sm:text-2xl">Settings</h1>

      <div className="mt-6 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Profile</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Name</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{name}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{email}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Role</span>
              <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {role ?? 'user'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Appearance</h2>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Dark mode</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Switch between light and dark theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${mode === 'dark' ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-600'}`}
              role="switch"
              aria-checked={mode === 'dark'}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${mode === 'dark' ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
