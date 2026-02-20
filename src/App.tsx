import { BrowserRouter, Route, Routes } from 'react-router'

import { Provider } from 'react-redux'

import { ThemeProvider } from '@/contexts/ThemeContext'
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import Buildings from '@/pages/Buildings'
import Clients from '@/pages/Clients'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Reports from '@/pages/Reports'
import Sensors from '@/pages/Sensors'
import { store } from '@/redux/store'

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
            </Route>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/buildings" element={<Buildings />} />
              <Route path="/sensors" element={<Sensors />} />
              <Route path="/reports" element={<Reports />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  )
}
