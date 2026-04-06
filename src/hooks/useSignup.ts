import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'

import useAuth from '@/hooks/auth/useAuth'

export function useSignup() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value)
    },
    [],
  )

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

  const handleInviteCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInviteCode(e.target.value)
    },
    [],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setLoading(true)
      setError(null)

      const result = await signup(name, email, password, inviteCode)

      if (result.success) {
        navigate('/dashboard', { replace: true })
      } else {
        setError(result.error ?? 'Signup failed')
      }

      setLoading(false)
    },
    [name, email, password, inviteCode, signup, navigate],
  )

  return {
    name,
    email,
    password,
    inviteCode,
    loading,
    error,
    handleNameChange,
    handleEmailChange,
    handlePasswordChange,
    handleInviteCodeChange,
    handleSubmit,
  }
}

export default useSignup
