import { useCallback, useState } from 'react'

import { useTheme } from '@/contexts/ThemeContext'

export function useDashboardLayout() {
  const { mode, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  return {
    mode,
    sidebarOpen,
    handleToggleSidebar,
    handleToggleTheme: toggleTheme,
  }
}

export default useDashboardLayout
