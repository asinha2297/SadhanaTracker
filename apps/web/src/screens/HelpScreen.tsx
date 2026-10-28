import { EDIT_WINDOW_DAYS } from '@sadhana/domain'
import { renderRich, useT } from '../i18n'
import { useFormat } from '../i18n/format'

export function HelpScreen() {
  const t = useT()
  const fmt = useFormat()
  return (
    <article className="mx-auto max-w-2xl py-8 md:py-12">
      <h1 className="font-serif text-3xl text-ink md:text-4xl">{t.help.title}</h1>
      <p className="mt-3 text-ink-muted">{t.help.intro}</p>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">{t.help.whoTitle}</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed">
          <li>{renderRich(t.help.you)}</li>
          <li>{renderRich(t.help.coordinators)}</li>
          <li>{renderRich(t.help.administrators)}</li>
          <li>{t.help.reflections}</li>
          <li>{t.help.nobody}</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">{t.help.helpTitle}</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed">
          <li>{t.help.newcomer}</li>
          <li>{t.help.questions}</li>
          <li>{t.help.forgotten}</li>
          <li>{t.help.correct(fmt.number(EDIT_WINDOW_DAYS))}</li>
        </ul>
      </section>

      <p className="mt-12 font-serif text-lg italic text-ink-muted">{t.help.hareKrishna}</p>
    </article>
  )
}
