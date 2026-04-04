import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router'
import { Analytics } from '@vercel/analytics/react'

import { Provider } from 'react-redux'

import { ThemeProvider } from '@/contexts/ThemeContext'
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import AdminRoute from '@/routes/AdminRoute'
import { store } from '@/redux/store'
import { restoreSession } from '@/hooks/auth/useAuth'
import { useAppDispatch } from '@/hooks/useAppSelector'

const BuildingDetail = lazy(() => import('@/pages/BuildingDetail'))
const Buildings = lazy(() => import('@/pages/Buildings'))
const Clients = lazy(() => import('@/pages/Clients'))
const Home = lazy(() => import('@/pages/Home'))
const CaseStudy = lazy(() => import('@/pages/CaseStudy'))
const Demo = lazy(() => import('@/pages/Demo'))
const Landing = lazy(() => import('@/pages/Landing'))
const ClientsDirectoryPage = lazy(() => import('@/pages/ClientsDirectoryPage'))
const Login = lazy(() => import('@/pages/Login'))
const Support = lazy(() => import('@/pages/Support'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const Terms = lazy(() => import('@/pages/Terms'))
const CompareFlo = lazy(() => import('@/pages/CompareFlo'))
const ComparePhyn = lazy(() => import('@/pages/ComparePhyn'))
const CompareWint = lazy(() => import('@/pages/CompareWint'))
const CompareAlertLabs = lazy(() => import('@/pages/CompareAlertLabs'))
const CompareWaterAlert = lazy(() => import('@/pages/CompareWaterAlert'))
const CompareFlume = lazy(() => import('@/pages/CompareFlume'))
const GetQuote = lazy(() => import('@/pages/GetQuote'))
const Faq = lazy(() => import('@/pages/Faq'))
const MagReports = lazy(() => import('@/pages/MagReports'))
const Reports = lazy(() => import('@/pages/Reports'))
const BuildingsMap = lazy(() => import('@/pages/BuildingsMap'))
const Sensors = lazy(() => import('@/pages/Sensors'))
const Admin = lazy(() => import('@/pages/Admin'))
const Settings = lazy(() => import('@/pages/Settings'))

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
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-500">Loading…</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/clients" element={<ClientsDirectoryPage />} />
          <Route path="/case-study" element={<CaseStudy />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/support" element={<Support />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/compare/flo-by-moen" element={<CompareFlo />} />
          <Route path="/compare/phyn" element={<ComparePhyn />} />
          <Route path="/compare/wint" element={<CompareWint />} />
          <Route path="/compare/alert-labs" element={<CompareAlertLabs />} />
          <Route path="/compare/water-alert" element={<CompareWaterAlert />} />
          <Route path="/compare/flume" element={<CompareFlume />} />
          <Route path="/quote" element={<GetQuote />} />
          <Route path="/faq" element={<Faq />} />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Home />} />
            <Route path="buildings" element={<Buildings />} />
            <Route path="buildings/map" element={<BuildingsMap />} />
            <Route path="buildings/:id" element={<BuildingDetail />} />
            <Route path="reports/:sensorId?" element={<Reports />} />
            <Route path="reports/:sensorId/:timeWindow/raw" element={<Reports />} />
            <Route path="reports/:sensorId/:timeWindow/flow" element={<Reports />} />
            <Route path="reports/:sensorId/:timeWindow" element={<Reports />} />
            <Route path="mag-reports/:buildingId?" element={<MagReports />} />
            <Route path="settings" element={<Settings />} />
            <Route element={<AdminRoute />}>
              <Route path="clients" element={<Clients />} />
              <Route path="sensors" element={<Sensors />} />
              <Route path="admin" element={<Admin />} />
            </Route>
          </Route>
        </Routes>
        </Suspense>
      </SessionRestorer>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppRoutes />
        <Analytics />
      </ThemeProvider>
    </Provider>
  )
}
