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
import { useT } from '../i18n'

export function SetPasswordScreen() {
  const { setUser } = useAuth()
  const user = useUser()
  const t = useT()
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
        setFailure(t.auth.savePasswordFailed)
      }
    }
  })

  return (
    <AuthCard title={t.auth.choosePassword} subtitle={t.auth.choosePasswordSubtitle(user.name)}>
      <form onSubmit={submit} noValidate className="space-y-5">
        <FormAlert message={failure} />
        <TextField
          id="currentPassword"
          label={t.auth.oneTimePassword}
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <TextField
          id="newPassword"
          label={t.auth.newPassword}
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <TextField
          id="confirm"
          label={t.auth.confirmPassword}
          type="password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t.auth.saving : t.auth.savePassword}
        </Button>
      </form>
    </AuthCard>
  )
}
