import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router'

import { Provider } from 'react-redux'

import { ThemeProvider } from '@/contexts/ThemeContext'
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import AdminRoute from '@/routes/AdminRoute'
import BuildingDetail from '@/pages/BuildingDetail'
import Buildings from '@/pages/Buildings'
import Clients from '@/pages/Clients'
import Home from '@/pages/Home'
import CaseStudy from '@/pages/CaseStudy'
import Demo from '@/pages/Demo'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Support from '@/pages/Support'
import Privacy from '@/pages/Privacy'
import Terms from '@/pages/Terms'
import MagReports from '@/pages/MagReports'
import Reports from '@/pages/Reports'
import Sensors from '@/pages/Sensors'
import Admin from '@/pages/Admin'
import Settings from '@/pages/Settings'
import { store } from '@/redux/store'
import { restoreSession } from '@/hooks/auth/useAuth'
import { useAppDispatch } from '@/hooks/useAppSelector'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function SessionRestorer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    restoreSession(dispatch).finally(() => setReady(true))
  }, [dispatch])

  if (!ready) return null

  return <>{children}</>
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <SessionRestorer>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/case-study" element={<CaseStudy />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/support" element={<Support />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Reports />} />
            <Route path="buildings" element={<Buildings />} />
            <Route path="buildings/:id" element={<BuildingDetail />} />
            <Route path="reports/:sensorId?" element={<Reports />} />
            <Route path="reports/:sensorId/:timeWindow" element={<Reports />} />
            <Route path="reports/:sensorId/:timeWindow/raw" element={<Reports />} />
            <Route path="mag-reports/:buildingId?" element={<MagReports />} />
            <Route path="settings" element={<Settings />} />
            <Route element={<AdminRoute />}>
              <Route path="home" element={<Home />} />
              <Route path="clients" element={<Clients />} />
              <Route path="sensors" element={<Sensors />} />
              <Route path="admin" element={<Admin />} />
            </Route>
          </Route>
        </Routes>
      </SessionRestorer>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </Provider>
  )
}
