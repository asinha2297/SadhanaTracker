import { EDIT_WINDOW_DAYS } from '@sadhana/domain'

export function HelpScreen() {
  return (
    <article className="mx-auto max-w-2xl py-8 md:py-12">
      <h1 className="font-serif text-3xl text-ink md:text-4xl">Help, support &amp; privacy</h1>
      <p className="mt-3 text-ink-muted">
        Your sadhana record is personal. Here is exactly who can see it, and where to turn when you need a hand.
      </p>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Who can see your record</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed">
          <li>
            <strong>You</strong> see everything you record, including your reflections.
          </li>
          <li>
            <strong>Coordinators</strong> see weekly participation totals for the congregation. They can open your
            individual numbers only if an administrator has granted them record review.
          </li>
          <li>
            <strong>Administrators</strong> manage accounts, roles and recommended targets. They can start a
            password reset for you without ever seeing a password, and every such action is written to a permanent
            audit log.
          </li>
          <li>Your reflections are never shown to anyone else.</li>
          <li>Nobody outside the Sharanagati congregation has access.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Getting help</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed">
          <li>
            New to the congregation? A coordinator or an administrator creates your account and hands you a one-time
            password in person; you choose your own password at your first sign-in.
          </li>
          <li>For questions about targets or reports, speak with your coordinator.</li>
          <li>
            Forgotten your password? Ask your coordinator or an administrator for a one-time password; you will choose
            a new one when you sign in.
          </li>
          <li>Need to correct an entry? Entries from the last {EDIT_WINDOW_DAYS} days can be edited from your History.</li>
        </ul>
      </section>

      <p className="mt-12 font-serif text-lg italic text-ink-muted">Hare Kṛṣṇa.</p>
    </article>
  )
}
