import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { SidebarLayout } from './components/layout/SidebarLayout';
import { getUser, signOutSession } from './lib/auth';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardOverviewPage } from './pages/admin/DashboardOverviewPage';
import { EmployeeListPage } from './pages/admin/EmployeeListPage';
import { TaskManagementPage } from './pages/admin/TaskManagementPage';
import { AttendanceLogsPage } from './pages/admin/AttendanceLogsPage';
import { ActivityAnalyticsPage } from './pages/admin/ActivityAnalyticsPage';
import { ScreenshotViewerPage } from './pages/admin/ScreenshotViewerPage';
import { DesktopAppPage } from './pages/admin/DesktopAppPage';
import { TimelinePage } from './pages/admin/TimelinePage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { DevicesPage } from './pages/admin/DevicesPage';
import { PoliciesPage } from './pages/admin/PoliciesPage';
import { NotificationsPage } from './pages/admin/NotificationsPage';
import { OrganizationSettingsPage } from './pages/admin/OrganizationSettingsPage';

const adminItems = [
  { to: '/admin/dashboard', label: 'Dashboard', section: 'Overview', description: 'KPI cards, trends, live activity' },
  { to: '/admin/employees', label: 'Employees', section: 'Overview', description: 'Onboard and manage workforce members' },
  { to: '/admin/tasks', label: 'Tasks', section: 'Execution', description: 'Assign work and review output' },
  { to: '/admin/attendance', label: 'Attendance', section: 'Execution', description: 'Session logs and workforce presence' },
  { to: '/admin/activity', label: 'Activity', section: 'Insights', description: 'Productivity score and usage analytics' },
  { to: '/admin/screenshots', label: 'Screenshots', section: 'Insights', description: 'Captured evidence and visual review' },
  { to: '/admin/timeline', label: 'Timeline', section: 'Insights', description: 'Unified work playback surface' },
  { to: '/admin/reports', label: 'Reports', section: 'Operations', description: 'Export-ready workforce reporting' },
  { to: '/admin/devices', label: 'Devices', section: 'Operations', description: 'Connected hardware and live state' },
  { to: '/admin/policies', label: 'Policies', section: 'Operations', description: 'Violations, rules, and review queue' },
  { to: '/admin/notifications', label: 'Notifications', section: 'Operations', description: 'Alert center and activity feed' },
  { to: '/admin/settings', label: 'Organization Settings', section: 'Configuration', description: 'Monitoring rules and retention controls' },
  { to: '/admin/desktop-app', label: 'Desktop App', section: 'Configuration', description: 'Installer distribution and rollout' }
];

function HomeRedirect() {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'employee') return <Navigate to="/desktop-only" replace />;
  return <Navigate to="/admin/dashboard" replace />;
}

function DesktopOnlyPage() {
  const navigate = useNavigate();
  const user = getUser();

  async function handleSignOut() {
    await signOutSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Employee Access Moved to Desktop App</h2>
        <p className="text-sm text-slate-600 mt-2">
          Employee workflows are available in the Hybrid Workforce desktop application. Please login through the installed desktop agent.
        </p>
        <p className="text-sm text-slate-500 mt-4">Signed in as {user?.full_name || user?.email}</p>
        <button
          type="button"
          className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['owner', 'manager']}>
            <SidebarLayout items={adminItems} />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardOverviewPage />} />
        <Route path="employees" element={<EmployeeListPage />} />
        <Route path="tasks" element={<TaskManagementPage />} />
        <Route path="attendance" element={<AttendanceLogsPage />} />
        <Route path="activity" element={<ActivityAnalyticsPage />} />
        <Route path="screenshots" element={<ScreenshotViewerPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="policies" element={<PoliciesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<OrganizationSettingsPage />} />
        <Route path="desktop-app" element={<DesktopAppPage />} />
      </Route>

      <Route
        path="/desktop-only"
        element={
          <ProtectedRoute roles={['employee']}>
            <DesktopOnlyPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
