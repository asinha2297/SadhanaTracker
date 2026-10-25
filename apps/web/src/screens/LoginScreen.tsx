import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { LoginSchema, loginErrorMessage, type LoginInput } from '../auth/forms'
import { login } from '../auth/session'
import { AuthCard } from '../components/AuthCard'
import { Button } from '../components/Button'
import { FormAlert } from '../components/FormAlert'
import { TextField } from '../components/TextField'

export function LoginScreen() {
  const { setUser } = useAuth()
  const [failure, setFailure] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) })

  const submit = handleSubmit(async (input) => {
    setFailure(undefined)
    try {
      setUser(await login(input))
    } catch (error) {
      setFailure(loginErrorMessage(error))
    }
  })

  return (
    <AuthCard title="Haribol." subtitle="Sign in to record today's sadhana.">
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
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-sm">
          <Link to="/reset" className="font-medium text-saffron-text">
            Forgotten your password?
          </Link>
        </p>
        <p className="text-center text-sm text-ink-muted">
          New here?{' '}
          <Link to="/signup" className="font-medium text-saffron-text">
            Create an account
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
