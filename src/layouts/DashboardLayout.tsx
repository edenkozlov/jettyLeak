import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { DashboardBrandLogoMark } from '@/components/BrandLogoMark'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import useAuth from '@/hooks/auth/useAuth'

// ---------------------------------------------------------------------------
// Nav item / group definitions
// ---------------------------------------------------------------------------

interface NavItem {
  label: string
  path: string
  adminOnly: boolean
  /** When set, only shown to signed-in users with role client and a linked organization. */
  clientOnly?: boolean
  alsoMatches?: string[]
  icon: ReactNode
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const ICON_CLS = 'h-4 w-4 shrink-0'

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Plumbing',
    items: [
      {
        label: 'Overview',
        path: '/dashboard',
        adminOnly: false,
        icon: (
          <svg className={ICON_CLS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
          </svg>
        ),
      },
      {
        label: 'Fixtures',
        path: '/dashboard/fixtures',
        adminOnly: false,
        icon: (
          <svg className={ICON_CLS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h10" />
          </svg>
        ),
      },
      {
        label: 'Activity',
        path: '/dashboard/activity',
        adminOnly: false,
        icon: (
          <svg className={ICON_CLS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Buildings',
    items: [
      {
        label: 'All buildings',
        path: '/dashboard/buildings',
        adminOnly: false,
        icon: (
          <svg className={ICON_CLS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      },
      {
        label: 'Map',
        path: '/dashboard/buildings/map',
        adminOnly: false,
        icon: (
          <svg className={ICON_CLS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Admin Tools',
    items: [
      {
        label: 'Clients',
        path: '/dashboard/clients',
        adminOnly: true,
        icon: (
          <svg className={ICON_CLS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        label: 'Sensors',
        path: '/dashboard/sensors',
        adminOnly: true,
        icon: (
          <svg className={ICON_CLS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
          </svg>
        ),
      },
      {
        label: 'Reports (raw)',
        path: '/dashboard/reports',
        adminOnly: true,
        alsoMatches: ['/dashboard/mag-reports', '/dashboard/engineering/mag'],
        icon: (
          <svg className={ICON_CLS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        label: 'City water alerts',
        path: '/dashboard/water-alerts',
        adminOnly: true,
        icon: (
          <svg className={ICON_CLS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        label: 'Admin',
        path: '/dashboard/admin',
        adminOnly: true,
        icon: (
          <svg className={ICON_CLS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        label: 'Team',
        path: '/dashboard/team',
        adminOnly: false,
        clientOnly: true,
        icon: (
          <svg className={ICON_CLS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        label: 'Settings',
        path: '/dashboard/settings',
        adminOnly: false,
        icon: (
          <svg className={ICON_CLS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
]

function navLinkClass(isActive: boolean) {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-800 dark:text-white'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
  }`
}

function navLinkCollapsedClass(isActive: boolean) {
  return `flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
    isActive
      ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-800 dark:text-white'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
  }`
}

const HAMBURGER_ICON = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

export default function DashboardLayout() {
  const { sidebarOpen, handleToggleSidebar, closeSidebar } = useDashboardLayout()
  const { role, client_id } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const visibleGroups = NAV_GROUPS
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (item.adminOnly && role !== 'admin') return false
        if (item.clientOnly && (role !== 'client' || !client_id)) return false
        return true
      }),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={handleToggleSidebar}
          role="presentation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white
          transition-all duration-200 ease-in-out dark:border-gray-700 dark:bg-gray-950
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
        `}
      >
        {/* Sidebar header */}
        <div className={`flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-gray-700 ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''} px-4`}>
          {/* Mobile: logo + close */}
          <div className="flex flex-1 items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <DashboardBrandLogoMark />
            </Link>
            <button
              onClick={handleToggleSidebar}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
              aria-label="Close sidebar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Desktop: collapse/expand toggle */}
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="hidden items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white lg:flex"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {HAMBURGER_ICON}
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarNav groups={visibleGroups} collapsed={sidebarCollapsed} onNavigate={closeSidebar} />
        </div>

        {/* Collapse toggle at bottom (desktop only) */}
        <div className={`hidden shrink-0 border-t border-gray-200 dark:border-gray-700 lg:block ${sidebarCollapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <svg className={`h-4 w-4 shrink-0 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-800 sm:h-16 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={handleToggleSidebar}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:hidden"
              aria-label="Open sidebar"
            >
              {HAMBURGER_ICON}
            </button>
            {/* Logo in header */}
            <Link to="/" className="flex items-center gap-2">
              <DashboardBrandLogoMark />
            </Link>
          </div>

          <ProfileMenu />
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function isItemActive(item: NavItem, pathname: string) {
  return (
    pathname === item.path ||
    (item.alsoMatches?.some((p) => pathname.startsWith(p)) ?? false)
  )
}

function SidebarNav({
  groups,
  collapsed,
  onNavigate,
}: {
  groups: NavGroup[]
  collapsed: boolean
  onNavigate: () => void
}) {
  const { pathname } = useLocation()
  const [groupCollapsed, setGroupCollapsed] = useState<Record<string, boolean>>({})

  const toggleGroup = (title: string) =>
    setGroupCollapsed((prev) => ({ ...prev, [title]: !prev[title] }))

  /* ── Icon-only mode ── */
  if (collapsed) {
    return (
      <nav className="mt-3 flex flex-col items-center gap-0.5 px-1.5">
        {groups.map((group, idx) => (
          <div key={group.title} className="w-full">
            {idx > 0 && (
              <div className="mx-2 my-2 border-t border-gray-200 dark:border-gray-700" />
            )}
            <div className="flex flex-col items-center gap-1">
              {group.items.map((item) => {
                const active = isItemActive(item, pathname)
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/dashboard'}
                    title={item.label}
                    className={() => navLinkCollapsedClass(active)}
                    onClick={onNavigate}
                  >
                    {item.icon}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    )
  }

  /* ── Full mode with collapsible groups ── */
  return (
    <nav className="mt-2 flex flex-col gap-0.5 px-3">
      {groups.map((group) => {
        const isGrpCollapsed = groupCollapsed[group.title] ?? false
        const hasActive = group.items.some((item) => isItemActive(item, pathname))

        return (
          <div key={group.title}>
            <button
              onClick={() => toggleGroup(group.title)}
              className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <span>{group.title}</span>
              <svg
                className={`h-3 w-3 transition-transform duration-200 ${isGrpCollapsed ? '-rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              className={`grid transition-all duration-200 ${
                isGrpCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-0.5 pb-2">
                  {group.items.map((item) => {
                    const active = isItemActive(item, pathname)
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/dashboard'}
                        className={() => navLinkClass(active)}
                        onClick={onNavigate}
                      >
                        {item.icon}
                        {item.label}
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            </div>

            {isGrpCollapsed && hasActive && (
              <div className="mx-3 mb-1 h-0.5 rounded-full bg-indigo-400/40" />
            )}
          </div>
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
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
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
