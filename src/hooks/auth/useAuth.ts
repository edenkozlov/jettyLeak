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
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          logger.error('AUTH', 'Login failed', error)
          return { success: false, error: error.message }
        }

        if (data.session) {
          dispatch(
            authenticate({
              user_id: data.session.user.id,
              token: data.session.access_token,
            }),
          )
          dispatch(
            setUserData(
              data.session.user as unknown as Record<string, unknown>,
            ),
          )
        }

        return { success: true, error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        logger.error('AUTH', message, err)
        return { success: false, error: message }
      }
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
