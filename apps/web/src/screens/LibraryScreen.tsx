import { PageHeader } from '../components/PageHeader'
import { useT } from '../i18n'
import { LibraryManager } from './library/LibraryManager'
import { MasterAdminTabs } from './MasterAdminTabs'

export function LibraryScreen() {
  const t = useT()
  return (
    <div className="mx-auto max-w-5xl space-y-5 py-6 md:py-10">
      <PageHeader title={t.library.title} subtitle={t.library.subtitle} />
      <MasterAdminTabs />
      <LibraryManager />
    </div>
  )
}
