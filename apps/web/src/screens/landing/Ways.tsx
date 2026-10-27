import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

const PRIMARY =
  'inline-flex items-center gap-2 rounded-full bg-saffron px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-saffron/25 transition-transform hover:-translate-y-0.5'

export function Ways({ signedIn }: { signedIn: boolean }) {
  return (
    <Link to={signedIn ? '/' : '/login'} className={PRIMARY}>
      {signedIn ? "Open today's sadhana" : 'Sign in'}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  )
}
