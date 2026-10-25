import type { Group } from '../api/contract'

export function GroupSelect({ groups, value, onChange }: { groups: Group[]; value: string; onChange: (id: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-muted">
      Group
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-medium text-ink"
      >
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>
    </label>
  )
}
