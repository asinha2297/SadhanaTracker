import { translateMessage, useT } from '../i18n'

export function FormAlert({ message }: { message?: string }) {
  const text = translateMessage(useT(), message)
  if (!text) return null
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {text}
    </p>
  )
}
