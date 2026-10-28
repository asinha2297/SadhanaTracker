import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { ResetRequestSchema, type ResetRequestInput } from '../auth/forms'
import { requestReset } from '../auth/session'
import { AuthCard } from '../components/AuthCard'
import { Button } from '../components/Button'
import { FormAlert } from '../components/FormAlert'
import { TextField } from '../components/TextField'
import { useT } from '../i18n'

export function ResetRequestScreen() {
  const t = useT()
  const [sent, setSent] = useState(false)
  const [failure, setFailure] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetRequestInput>({ resolver: zodResolver(ResetRequestSchema) })

  const submit = handleSubmit(async ({ identifier }) => {
    setFailure(undefined)
    try {
      await requestReset(identifier)
      setSent(true)
    } catch {
      setFailure(t.auth.resetFailed)
    }
  })

  const backToSignIn = (
    <p className="text-center text-sm">
      <Link to="/login" className="font-medium text-saffron-text">
        {t.auth.backToSignIn}
      </Link>
    </p>
  )

  if (sent) {
    return (
      <AuthCard title={t.auth.requestReceived} subtitle={t.auth.requestReceivedSubtitle}>
        {backToSignIn}
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t.auth.forgotten} subtitle={t.auth.resetSubtitle}>
      <form onSubmit={submit} noValidate className="space-y-5">
        <FormAlert message={failure} />
        <TextField
          id="identifier"
          label={t.auth.identifier}
          autoComplete="username"
          autoCapitalize="none"
          inputMode="email"
          spellCheck={false}
          error={errors.identifier?.message}
          {...register('identifier')}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t.auth.sending : t.auth.requestReset}
        </Button>
        {backToSignIn}
      </form>
    </AuthCard>
  )
}
