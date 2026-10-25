import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { applyFieldIssues } from '../api/client'
import { publicGroupsQuery } from '../api/groups'
import { SignupSchema, toSignupInput, type SignupFormOutput, type SignupFormValues } from '../auth/forms'
import { signup } from '../auth/session'
import { AuthCard } from '../components/AuthCard'
import { Button } from '../components/Button'
import { FormAlert } from '../components/FormAlert'
import { SelectField } from '../components/SelectField'
import { SendCode } from '../components/SendCode'
import { TextField } from '../components/TextField'

type Field = 'phone' | 'email' | 'code'

const backToSignIn = (
  <p className="text-center text-sm text-ink-muted">
    Already have an account?{' '}
    <Link to="/login" className="font-medium text-saffron-text">
      Sign in
    </Link>
  </p>
)

export function SignupScreen() {
  const groups = useQuery(publicGroupsQuery)
  const [devoteeId, setDevoteeId] = useState<string>()
  const [failure, setFailure] = useState<string>()
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues, unknown, SignupFormOutput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { name: '', groupId: '', phone: '', code: '', email: '', password: '', confirm: '' },
  })
  const phone = useWatch({ control, name: 'phone' })

  const submit = handleSubmit(async (values) => {
    setFailure(undefined)
    try {
      setDevoteeId(await signup(toSignupInput(values)))
    } catch (error) {
      if (!applyFieldIssues(error, (field, message) => setError(field as Field, { message }))) {
        setFailure("We couldn't create your account. Check your connection and try again.")
      }
    }
  })

  if (devoteeId) {
    return (
      <AuthCard
        title="Request received"
        subtitle="Your coordinator will approve your account, usually within a day. After that, sign in with your mobile number or email and the password you chose."
      >
        <p className="text-xs uppercase tracking-wider text-ink-muted">Your devotee ID</p>
        <p className="mt-1 font-mono text-3xl text-ink">{devoteeId}</p>
        <div className="mt-6">{backToSignIn}</div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Welcome, Haribol." subtitle="Create your account. Your group coordinator will approve it before you can sign in.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormAlert message={failure} />
        <TextField id="name" label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <SelectField id="groupId" label="Group" error={errors.groupId?.message} {...register('groupId')}>
          <option value="">Select…</option>
          {groups.data?.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </SelectField>
        <div className="space-y-2">
          <TextField id="phone" label="Mobile number" type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
          <SendCode phone={phone} onPhoneError={(message) => setError('phone', { message })} />
        </div>
        <TextField
          id="code"
          label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          error={errors.code?.message}
          {...register('code')}
        />
        <TextField id="email" label="Email (optional)" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
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
          {isSubmitting ? 'Creating…' : 'Create account'}
        </Button>
        {backToSignIn}
      </form>
    </AuthCard>
  )
}
