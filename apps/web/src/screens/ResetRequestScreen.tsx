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

const backToSignIn = (
  <p className="text-center text-sm">
    <Link to="/login" className="font-medium text-saffron-text">
      Back to sign in
    </Link>
  </p>
)

export function ResetRequestScreen() {
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
      setFailure("We couldn't send your request. Check your connection and try again.")
    }
  })

  if (sent) {
    return (
      <AuthCard
        title="Request received"
        subtitle="If that account exists, your coordinator or an administrator will share a one-time password with you in person."
      >
        {backToSignIn}
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Forgotten your password?"
      subtitle="Enter the email or mobile number you sign in with. Your coordinator or an administrator will share a one-time password with you in person; nobody can see your current one."
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <FormAlert message={failure} />
        <TextField
          id="identifier"
          label="Email or mobile number"
          autoComplete="username"
          autoCapitalize="none"
          inputMode="email"
          spellCheck={false}
          error={errors.identifier?.message}
          {...register('identifier')}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Request one-time password'}
        </Button>
        {backToSignIn}
      </form>
    </AuthCard>
  )
}
