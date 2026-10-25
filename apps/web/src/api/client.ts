import { z } from 'zod'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown = undefined,
  ) {
    super(`Request failed with status ${status}`)
  }
}

export const apiUrl = (path: string): string =>
  new URL(path, import.meta.env.VITE_API_URL ?? window.location.origin).href

interface ApiOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

export async function api(path: string, options: ApiOptions = {}): Promise<Response> {
  const response = await fetch(apiUrl(path), {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: { ...(options.body !== undefined && { 'Content-Type': 'application/json' }), ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => undefined))
  return response
}

export async function requestJson<T>(path: string, schema: z.ZodType<T>, options?: ApiOptions): Promise<T> {
  return schema.parse(await (await api(path, options)).json())
}

const FieldIssuesSchema = z.object({
  issues: z.array(z.object({ path: z.array(z.union([z.string(), z.number()])), message: z.string() })),
})

/** Hands each field-level issue of a refused request to `setError`; false when the error carried none. */
export function applyFieldIssues(error: unknown, setError: (field: string, message: string) => void): boolean {
  if (!(error instanceof ApiError)) return false
  const issues = FieldIssuesSchema.safeParse(error.body).data?.issues.filter((issue) => typeof issue.path[0] === 'string') ?? []
  for (const issue of issues) setError(String(issue.path[0]), issue.message)
  return issues.length > 0
}
