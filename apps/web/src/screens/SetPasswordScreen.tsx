import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router'
import { applyFieldIssues } from '../api/client'
import { useAuth, useUser } from '../auth/AuthContext'
import { NewPasswordSchema, type NewPasswordInput } from '../auth/forms'
import { setPassword } from '../auth/session'
import { AuthCard } from '../components/AuthCard'
import { Button } from '../components/Button'
import { FormAlert } from '../components/FormAlert'
import { TextField } from '../components/TextField'

export function SetPasswordScreen() {
  const { setUser } = useAuth()
  const user = useUser()
  const [failure, setFailure] = useState<string>()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordInput>({ resolver: zodResolver(NewPasswordSchema) })

  if (!user.mustChangePassword) return <Navigate to="/" replace />

  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setFailure(undefined)
    try {
      setUser(await setPassword(currentPassword, newPassword))
    } catch (error) {
      if (!applyFieldIssues(error, (field, message) => setError(field as 'currentPassword', { message }))) {
        setFailure("We couldn't save your password. Check your connection and try again.")
      }
    }
  })

  return (
    <AuthCard
      title="Choose your own password"
      subtitle={`Haribol, ${user.name}. You signed in with a one-time password. Pick one only you know, at least 8 characters long.`}
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <FormAlert message={failure} />
        <TextField
          id="currentPassword"
          label="One-time password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <TextField
          id="newPassword"
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <TextField
          id="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save password'}
        </Button>
      </form>
    </AuthCard>
  )
}
