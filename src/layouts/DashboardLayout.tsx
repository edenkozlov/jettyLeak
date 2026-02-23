import { NavLink, Outlet } from 'react-router'

import { useDashboardLayout } from '@/hooks/useDashboardLayout'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Clients', path: '/dashboard/clients' },
  { label: 'Buildings', path: '/dashboard/buildings' },
  { label: 'Sensors', path: '/dashboard/sensors' },
  { label: 'Reports', path: '/dashboard/reports' },
]

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-gray-800 text-white'
      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
  }`
}

export default function DashboardLayout() {
  const { mode, sidebarOpen, handleToggleSidebar, handleToggleTheme } =
    useDashboardLayout()

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={handleToggleSidebar}
          role="presentation"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 transform bg-gray-900 transition-transform duration-200 ease-in-out
          dark:bg-gray-950 lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-6">
          <span className="text-lg font-semibold text-white">Flomo</span>
          <button
            onClick={handleToggleSidebar}
            className="text-gray-400 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="mt-4 flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={navLinkClass}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={handleToggleSidebar}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Toggle sidebar"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={handleToggleTheme}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Toggle theme"
            >
              {mode === 'light' ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              )}
            </button>

            <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
