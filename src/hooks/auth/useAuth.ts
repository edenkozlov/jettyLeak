import { useCallback } from 'react'

import { useAppDispatch, useAppSelector } from '@/hooks/useAppSelector'
import {
  authenticate,
  logout as logoutAction,
  setUserData,
} from '@/redux/loginSlice'
import { supabase } from '@/lib/supabase'
import { logger } from '@/utils/logger/logger'

export default function useAuth() {
  const dispatch = useAppDispatch()
  const { user_id, userData, token, isAuthenticated } = useAppSelector(
    (state) => state.login,
  )

  const login = useCallback(
    async (_email: string, _password: string) => {
      dispatch(
        authenticate({
          user_id: 'demo-user',
          token: 'demo-token',
        }),
      )
      dispatch(setUserData({ email: _email, name: 'Demo User' }))
      return { success: true, error: null }
    },
    [dispatch],
  )

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      dispatch(logoutAction())
    } catch (err) {
      logger.error('AUTH', 'Logout failed', err)
    }
  }, [dispatch])

  return { user_id, userData, token, isAuthenticated, login, logout }
}
