import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type UserRole = 'admin' | 'client'

interface LoginState {
  user_id: string | null
  token: string | null
  isAuthenticated: boolean
  role: UserRole | null
  client_id: string | null
  userData: Record<string, unknown> | null
}

const STORAGE_KEY = 'beluga_auth'

function loadPersistedState(): Partial<LoginState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore corrupt storage */ }
  return {}
}

function persistState(state: LoginState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      user_id: state.user_id,
      token: state.token,
      isAuthenticated: state.isAuthenticated,
      role: state.role,
      client_id: state.client_id,
      userData: state.userData,
    }))
  } catch { /* storage full or blocked */ }
}

const persisted = loadPersistedState()

const initialState: LoginState = {
  user_id: persisted.user_id ?? null,
  token: persisted.token ?? null,
  isAuthenticated: persisted.isAuthenticated ?? false,
  role: (persisted.role as UserRole) ?? null,
  client_id: persisted.client_id ?? null,
  userData: persisted.userData ?? null,
}

const loginSlice = createSlice({
  name: 'login',
  initialState,
  reducers: {
    authenticate(
      state,
      action: PayloadAction<{
        user_id: string
        token: string
        role: UserRole
        client_id: string | null
      }>,
    ) {
      state.user_id = action.payload.user_id
      state.token = action.payload.token
      state.role = action.payload.role
      state.client_id = action.payload.client_id
      state.isAuthenticated = true
      persistState(state)
    },
    setUserData(state, action: PayloadAction<Record<string, unknown>>) {
      state.userData = action.payload
      persistState(state)
    },
    logout(state) {
      state.user_id = null
      state.token = null
      state.isAuthenticated = false
      state.role = null
      state.client_id = null
      state.userData = null
      localStorage.removeItem(STORAGE_KEY)
    },
  },
})

export const { authenticate, setUserData, logout } = loginSlice.actions
export default loginSlice.reducer
