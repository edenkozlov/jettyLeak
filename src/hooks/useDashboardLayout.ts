import { useCallback, useState } from 'react'

export function useDashboardLayout() {
  /** Closed by default; on `lg+` the sidebar is always visible via CSS regardless of this flag. */
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  return {
    sidebarOpen,
    handleToggleSidebar,
    closeSidebar,
  }
}

export default useDashboardLayout
