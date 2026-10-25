import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

const PRIMARY =
  'inline-flex items-center gap-2 rounded-full bg-saffron px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-saffron/25 transition-transform hover:-translate-y-0.5'
const SECONDARY =
  'inline-flex items-center rounded-full border border-line bg-card/70 px-6 py-3 text-sm font-semibold text-ink backdrop-blur transition-colors hover:border-saffron/50'

export function Ways({ signedIn, light = false }: { signedIn: boolean; light?: boolean }) {
  if (signedIn) {
    return (
      <Link to="/" className={PRIMARY}>
        Open today's sadhana
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    )
  }
  return (
    <div className="flex flex-wrap gap-3">
      <Link to="/signup" className={PRIMARY}>
        Create an account
        <ArrowRight className="size-4" aria-hidden />
      </Link>
      <Link to="/login" className={light ? `${SECONDARY} border-white/30 bg-white/10 text-white` : SECONDARY}>
        Sign in
      </Link>
    </div>
  )
}
