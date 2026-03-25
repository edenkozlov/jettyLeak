import { useCallback } from 'react'

import { useAppDispatch, useAppSelector } from '@/hooks/useAppSelector'
import {
  authenticate,
  logout as logoutAction,
  setUserData,
  type UserRole,
} from '@/redux/loginSlice'
import { supabase } from '@/lib/supabase'
import { logger } from '@/utils/logger/logger'

async function fetchUser(userId: string): Promise<{ role: UserRole; client_id: string | null } | null> {
  const { data: { session } } = await supabase.auth.getSession()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    logger.error('AUTH', 'Failed to fetch user', { error, userId, hasSession: !!session })
    return null
  }

  const role = (data.role as UserRole) ?? 'client'
  return {
    role,
    client_id: data.client_id ?? null,
  }
}

export async function restoreSession(dispatch: ReturnType<typeof useAppDispatch>) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const user = await fetchUser(session.user.id)
    if (!user) return

    dispatch(authenticate({
      user_id: session.user.id,
      token: session.access_token,
      role: user.role,
      client_id: user.client_id,
    }))
    dispatch(setUserData({
      email: session.user.email,
      name: session.user.user_metadata?.name ?? session.user.email,
    }))
  } catch (err) {
    logger.error('AUTH', 'Session restore failed', err)
  }
}

export default function useAuth() {
  const dispatch = useAppDispatch()
  const { user_id, userData, token, isAuthenticated, role, client_id } = useAppSelector(
    (state) => state.login,
  )

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error || !data.session) {
          return { success: false, error: error?.message ?? 'Login failed' }
        }

        const user = await fetchUser(data.user.id)
        if (!user) {
          await supabase.auth.signOut()
          return { success: false, error: 'No user record found for this account' }
        }

        dispatch(authenticate({
          user_id: data.user.id,
          token: data.session.access_token,
          role: user.role,
          client_id: user.client_id,
        }))
        dispatch(setUserData({
          email: data.user.email,
          name: data.user.user_metadata?.name ?? data.user.email,
        }))

        return { success: true, error: null }
      } catch (err: any) {
        logger.error('AUTH', 'Login failed', err)
        return { success: false, error: err?.message ?? 'Login failed' }
      }
    },
    [dispatch],
  )

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      logger.error('AUTH', 'Logout failed', err)
    }
    dispatch(logoutAction())
  }, [dispatch])

  return { user_id, userData, token, isAuthenticated, role, client_id, login, logout }
}
