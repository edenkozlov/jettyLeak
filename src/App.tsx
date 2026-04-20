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
const Signup = lazy(() => import('@/pages/Signup'))
const Support = lazy(() => import('@/pages/Support'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const Terms = lazy(() => import('@/pages/Terms'))
const CompareFlo = lazy(() => import('@/pages/compare/CompareFlo'))
const ComparePhyn = lazy(() => import('@/pages/compare/ComparePhyn'))
const CompareWint = lazy(() => import('@/pages/compare/CompareWint'))
const CompareAlertLabs = lazy(() => import('@/pages/compare/CompareAlertLabs'))
const CompareWaterAlert = lazy(() => import('@/pages/compare/CompareWaterAlert'))
const CompareFlume = lazy(() => import('@/pages/compare/CompareFlume'))
const WaterMonitoringSystems = lazy(() => import('@/pages/compare/WaterMonitoringSystems'))
const GetQuote = lazy(() => import('@/pages/GetQuote'))
const PropertyIntelligence = lazy(() => import('@/pages/PropertyIntelligence'))
const Faq = lazy(() => import('@/pages/Faq'))
const Fixtures = lazy(() => import('@/pages/Fixtures'))
const MagReports = lazy(() => import('@/pages/MagReports'))
const ReportsRedirect = lazy(() => import('@/pages/ReportsRedirect'))
const BuildingsMap = lazy(() => import('@/pages/BuildingsMap'))
const Sensors = lazy(() => import('@/pages/Sensors'))
const Admin = lazy(() => import('@/pages/Admin'))
const Settings = lazy(() => import('@/pages/Settings'))
const Team = lazy(() => import('@/pages/Team'))
const BuildingCertification = lazy(() => import('@/pages/BuildingCertification'))
const WaterAlerts = lazy(() => import('@/pages/WaterAlerts'))
const Activity = lazy(() => import('@/pages/Activity'))
const Articles = lazy(() => import('@/pages/articles/Articles'))
const ArticleWhatIsWaterMonitoring = lazy(() => import('@/pages/articles/ArticleWhatIsWaterMonitoring'))
const ArticleHowToChoose = lazy(() => import('@/pages/articles/ArticleHowToChoose'))
const ArticleMonitoringVsDetection = lazy(() => import('@/pages/articles/ArticleMonitoringVsDetection'))
const ArticleFourTypes = lazy(() => import('@/pages/articles/ArticleFourTypes'))
const ArticleBestCommercial = lazy(() => import('@/pages/articles/ArticleBestCommercial'))
const ArticleNonInvasiveVsInline = lazy(() => import('@/pages/articles/ArticleNonInvasiveVsInline'))
const ArticleAfterLeakAlert = lazy(() => import('@/pages/articles/ArticleAfterLeakAlert'))
const ArticleLeakDetectionNotEnough = lazy(() => import('@/pages/articles/ArticleLeakDetectionNotEnough'))
const ArticlePropertyManagers = lazy(() => import('@/pages/articles/ArticlePropertyManagers'))
const ArticleWaterIntelligence = lazy(() => import('@/pages/articles/ArticleWaterIntelligence'))

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
          <Route path="/flo-by-moen-alternative" element={<CompareFlo />} />
          <Route path="/phyn-alternative" element={<ComparePhyn />} />
          <Route path="/wint-alternative" element={<CompareWint />} />
          <Route path="/alert-labs-alternative" element={<CompareAlertLabs />} />
          <Route path="/water-alert-alternative" element={<CompareWaterAlert />} />
          <Route path="/flume-alternative" element={<CompareFlume />} />
          <Route path="/best-water-monitoring-systems" element={<WaterMonitoringSystems />} />
          <Route path="/quote" element={<GetQuote />} />
          <Route path="/property-intelligence" element={<PropertyIntelligence />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/what-is-water-monitoring-system" element={<ArticleWhatIsWaterMonitoring />} />
          <Route path="/articles/how-to-choose-water-monitoring-system" element={<ArticleHowToChoose />} />
          <Route path="/articles/water-monitoring-vs-leak-detection" element={<ArticleMonitoringVsDetection />} />
          <Route path="/articles/4-types-of-water-monitoring-systems" element={<ArticleFourTypes />} />
          <Route path="/articles/best-water-monitoring-commercial-buildings" element={<ArticleBestCommercial />} />
          <Route path="/articles/non-invasive-vs-inline-water-monitoring" element={<ArticleNonInvasiveVsInline />} />
          <Route path="/articles/what-happens-after-leak-alert" element={<ArticleAfterLeakAlert />} />
          <Route path="/articles/why-leak-detection-not-enough-commercial" element={<ArticleLeakDetectionNotEnough />} />
          <Route path="/articles/how-property-managers-handle-water-issues" element={<ArticlePropertyManagers />} />
          <Route path="/articles/what-is-water-intelligence-system" element={<ArticleWaterIntelligence />} />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Home />} />
            <Route path="buildings" element={<Buildings />} />
            <Route path="buildings/map" element={<BuildingsMap />} />
            <Route path="buildings/:id" element={<BuildingDetail />} />
            <Route path="buildings/:id/certification" element={<BuildingCertification />} />
            <Route path="fixtures/:buildingId?" element={<Fixtures />} />
            <Route path="reports/:sensorId?" element={<ReportsRedirect />} />
            <Route path="reports/:sensorId/:timeWindow/raw" element={<ReportsRedirect />} />
            <Route path="reports/:sensorId/:timeWindow/flow" element={<ReportsRedirect />} />
            <Route path="reports/:sensorId/:timeWindow" element={<ReportsRedirect />} />
            <Route path="activity" element={<Activity />} />
            <Route path="settings" element={<Settings />} />
            <Route path="team" element={<Team />} />
            <Route element={<AdminRoute />}>
              <Route path="clients" element={<Clients />} />
              <Route path="sensors" element={<Sensors />} />
              <Route path="admin" element={<Admin />} />
              <Route path="mag-reports/:buildingId?" element={<MagReports />} />
              <Route path="engineering/mag/:buildingId?" element={<MagReports />} />
              <Route path="water-alerts" element={<WaterAlerts />} />
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
