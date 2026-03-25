import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import logo from '@/assets/belugaLogo.png'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import useAuth from '@/hooks/auth/useAuth'

const NAV_ITEMS = [
  { label: 'Reports', path: '/dashboard', adminOnly: false, alsoMatches: ['/dashboard/reports', '/dashboard/mag-reports'] },
  { label: 'Home', path: '/dashboard/home', adminOnly: true },
  { label: 'Clients', path: '/dashboard/clients', adminOnly: true },
  { label: 'Buildings', path: '/dashboard/buildings', adminOnly: false },
  { label: 'Sensors', path: '/dashboard/sensors', adminOnly: true },
  { label: 'Admin', path: '/dashboard/admin', adminOnly: true },
  { label: 'Settings', path: '/dashboard/settings', adminOnly: false },
]

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-800 dark:text-white'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
  }`
}

export default function DashboardLayout() {
  const { sidebarOpen, handleToggleSidebar } =
    useDashboardLayout()
  const { role } = useAuth()

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || role === 'admin')

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
          fixed inset-y-0 left-0 z-30 w-64 transform border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out
          dark:border-gray-700 dark:bg-gray-950 lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6 dark:border-gray-700">
          <Link to="/" className="flex items-center gap-2"><img src={logo} alt="Beluga" className="h-8" /><span className="text-lg font-bold text-gray-900 dark:text-white">Beluga</span></Link>
          <button
            onClick={handleToggleSidebar}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white lg:hidden"
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

        <SidebarNav items={visibleNavItems} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-800 sm:h-16 sm:px-6">
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

          <ProfileMenu />
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarNav({ items }: { items: typeof NAV_ITEMS }) {
  const { pathname } = useLocation()

  return (
    <nav className="mt-4 flex flex-col gap-1 px-3">
      {items.map((item) => {
        const active =
          pathname === item.path ||
          (item.alsoMatches?.some((prefix) => pathname.startsWith(prefix)) ?? false)

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            className={() => navLinkClass({ isActive: active })}
          >
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}

function ProfileMenu() {
  const { userData, role, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const email = (userData?.email as string) ?? ''
  const name = (userData?.name as string) ?? email
  const initials = name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white transition hover:bg-indigo-600"
      >
        {initials || '?'}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
            {email && email !== name && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{email}</p>
            )}
            <span className="mt-1.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium capitalize text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {role ?? 'user'}
            </span>
          </div>

          <button
            onClick={() => {
              setOpen(false)
              navigate('/dashboard/settings')
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>

          <button
            onClick={async () => {
              setOpen(false)
              await logout()
              navigate('/login', { replace: true })
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
