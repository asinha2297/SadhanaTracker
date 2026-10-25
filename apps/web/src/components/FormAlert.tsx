export function FormAlert({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
      {message}
    </p>
  )
}
