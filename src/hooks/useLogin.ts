import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'

import useAuth from '@/hooks/auth/useAuth'

export function useLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value)
    },
    [],
  )

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value)
    },
    [],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setLoading(true)
      setError(null)

      const result = await login(email, password)

      if (result.success) {
        navigate('/', { replace: true })
      } else {
        setError(result.error ?? 'Login failed')
      }

      setLoading(false)
    },
    [email, password, login, navigate],
  )

  return {
    email,
    password,
    loading,
    error,
    handleEmailChange,
    handlePasswordChange,
    handleSubmit,
  }
}

export default useLogin
