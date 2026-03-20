import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router'

import { Provider } from 'react-redux'

import { ThemeProvider } from '@/contexts/ThemeContext'
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
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
import { store } from '@/redux/store'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <ScrollToTop />
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
              <Route path="home" element={<Home />} />
              <Route path="clients" element={<Clients />} />
              <Route path="buildings" element={<Buildings />} />
              <Route path="buildings/:id" element={<BuildingDetail />} />
              <Route path="sensors" element={<Sensors />} />
              <Route path="reports/:sensorId?" element={<Reports />} />
              <Route path="reports/:sensorId/:timeWindow" element={<Reports />} />
              <Route path="reports/:sensorId/:timeWindow/raw" element={<Reports />} />
              <Route path="mag-reports/:buildingId?" element={<MagReports />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  )
}
