import { useCallback, useState } from 'react'

export function useDashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  return {
    sidebarOpen,
    handleToggleSidebar,
  }
}

export default useDashboardLayout
