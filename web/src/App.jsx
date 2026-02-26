import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { SidebarLayout } from './components/layout/SidebarLayout';
import { getUser } from './lib/auth';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardOverviewPage } from './pages/admin/DashboardOverviewPage';
import { EmployeeListPage } from './pages/admin/EmployeeListPage';
import { TaskManagementPage } from './pages/admin/TaskManagementPage';
import { AttendanceLogsPage } from './pages/admin/AttendanceLogsPage';
import { ActivityAnalyticsPage } from './pages/admin/ActivityAnalyticsPage';
import { ScreenshotViewerPage } from './pages/admin/ScreenshotViewerPage';
import { DesktopAppPage } from './pages/admin/DesktopAppPage';

const adminItems = [
  { to: '/admin/dashboard', label: 'Dashboard Overview' },
  { to: '/admin/employees', label: 'Employee List' },
  { to: '/admin/tasks', label: 'Task Management' },
  { to: '/admin/attendance', label: 'Attendance Logs' },
  { to: '/admin/activity', label: 'Activity Analytics' },
  { to: '/admin/screenshots', label: 'Screenshot Viewer' },
  { to: '/admin/desktop-app', label: 'Desktop App' }
];

function HomeRedirect() {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'employee') return <Navigate to="/desktop-only" replace />;
  return <Navigate to="/admin/dashboard" replace />;
}

function DesktopOnlyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Employee Access Moved to Desktop App</h2>
        <p className="text-sm text-slate-600 mt-2">
          Employee workflows are available in the Hybrid Workforce desktop application. Please login through the installed desktop agent.
        </p>
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
