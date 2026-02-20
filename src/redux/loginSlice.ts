import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface LoginState {
  user_id: string | null
  token: string | null
  isAuthenticated: boolean
  userData: Record<string, unknown> | null
}

const initialState: LoginState = {
  user_id: null,
  token: null,
  isAuthenticated: false,
  userData: null,
}

const loginSlice = createSlice({
  name: 'login',
  initialState,
  reducers: {
    authenticate(
      state,
      action: PayloadAction<{ user_id: string; token: string }>,
    ) {
      state.user_id = action.payload.user_id
      state.token = action.payload.token
      state.isAuthenticated = true
    },
    setUserData(state, action: PayloadAction<Record<string, unknown>>) {
      state.userData = action.payload
    },
    logout(state) {
      state.user_id = null
      state.token = null
      state.isAuthenticated = false
      state.userData = null
    },
  },
})

export const { authenticate, setUserData, logout } = loginSlice.actions
export default loginSlice.reducer
