import { Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { PublicOnly } from './auth/PublicOnly'
import { RequireAuth } from './auth/RequireAuth'
import { RequireCapability } from './auth/RequireCapability'
import { RequirePassword } from './auth/RequirePassword'
import { AdminScreen } from './screens/AdminScreen'
import { CoordinatorScreen } from './screens/CoordinatorScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { EntryScreen } from './screens/EntryScreen'
import { ExportScreen } from './screens/ExportScreen'
import { HelpScreen } from './screens/HelpScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { LandingScreen } from './screens/LandingScreen'
import { LoginScreen } from './screens/LoginScreen'
import { ManageScreen } from './screens/ManageScreen'
import { MoreScreen } from './screens/MoreScreen'
import { NotFoundScreen } from './screens/NotFoundScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { RemindersScreen } from './screens/RemindersScreen'
import { ResetRequestScreen } from './screens/ResetRequestScreen'
import { SetPasswordScreen } from './screens/SetPasswordScreen'
import { SignupScreen } from './screens/SignupScreen'
import { WeekScreen } from './screens/WeekScreen'
import { AppShell } from './shell/AppShell'
import { SyncLayout } from './sync/SyncContext'

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/welcome" element={<LandingScreen />} />
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignupScreen />} />
          <Route path="/reset" element={<ResetRequestScreen />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/password" element={<SetPasswordScreen />} />
          <Route element={<RequirePassword />}>
            <Route element={<SyncLayout />}>
              <Route element={<AppShell />}>
                <Route index element={<DashboardScreen />} />
                <Route path="/entry/:localDate?" element={<EntryScreen />} />
                <Route path="/week/:start?" element={<WeekScreen />} />
                <Route path="/history" element={<HistoryScreen />} />
                <Route path="/profile" element={<ProfileScreen />} />
                <Route path="/reminders" element={<RemindersScreen />} />
                <Route path="/help" element={<HelpScreen />} />
                <Route path="/more" element={<MoreScreen />} />
                <Route element={<RequireCapability capability="VIEW_GROUP_REPORTS" />}>
                  <Route path="/coordinator" element={<CoordinatorScreen />} />
                </Route>
                <Route element={<RequireCapability capability="MANAGE_ROSTER" />}>
                  <Route path="/manage" element={<ManageScreen />} />
                </Route>
                <Route element={<RequireCapability capability="EXPORT_REPORTS" />}>
                  <Route path="/export" element={<ExportScreen />} />
                </Route>
                <Route element={<RequireCapability capability="ADMINISTER" />}>
                  <Route path="/admin" element={<AdminScreen />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </AuthProvider>
  )
}
