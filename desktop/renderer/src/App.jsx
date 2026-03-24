import { LoginScreen } from './components/layout/LoginScreen';
import { WorkspaceShell } from './components/layout/WorkspaceShell';
import { useWorkspaceState } from './hooks/useWorkspaceState';
import { ActivityPage } from './pages/ActivityPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { ScreenshotsPage } from './pages/ScreenshotsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TasksPage } from './pages/TasksPage';
import { formatCompactDuration } from './utils/workspace';

function renderWorkspaceView(workspace) {
  const durationProps = {
    activeDuration: formatCompactDuration(workspace.activeSecondsToday),
    idleDuration: formatCompactDuration(workspace.idleSecondsToday),
    trackedDuration: formatCompactDuration(workspace.trackedSecondsToday)
  };

  const reportUsage = workspace.appUsage.map((item) => ({
    ...item,
    displayDuration: formatCompactDuration(item.seconds)
  }));

  switch (workspace.activeView) {
    case 'tasks':
      return (
        <TasksPage
          currentTask={workspace.currentTask}
          completedTasks={workspace.completedTasks}
          taskCompletionRatio={workspace.taskCompletionRatio}
          isEmployee={workspace.isEmployee}
          tasksLoading={workspace.tasksLoading}
          onReloadTasks={() => workspace.loadTasks()}
          taskError={workspace.taskError}
          tasks={workspace.tasks}
          updatingTaskId={workspace.updatingTaskId}
          onUpdateTaskStatus={workspace.updateTaskStatus}
        />
      );
    case 'activity':
      return (
        <ActivityPage
          activeSecondsToday={durationProps.activeDuration}
          idleSecondsToday={durationProps.idleDuration}
          currentFocus={workspace.currentFocus}
          currentFocusDetail={workspace.currentFocusTitle}
          websiteSignal={workspace.websiteSignal}
          appUsage={workspace.appUsage}
          websiteUsage={workspace.websiteUsage}
          activityFeed={workspace.activityFeed}
          now={workspace.now}
        />
      );
    case 'screenshots':
      return (
        <ScreenshotsPage
          status={workspace.status}
          lastScreenshotState={workspace.lastScreenshotState}
          screenshotFeed={workspace.screenshotFeed}
          now={workspace.now}
        />
      );
    case 'reports':
      return (
        <ReportsPage
          status={workspace.status}
          trackedSecondsToday={durationProps.trackedDuration}
          activeSecondsToday={durationProps.activeDuration}
          idleSecondsToday={durationProps.idleDuration}
          completedTasks={workspace.completedTasks}
          inProgressTasks={workspace.inProgressTasks}
          tasks={workspace.tasks}
          appUsage={reportUsage}
          productivityScore={workspace.productivityScore}
          currentFocus={workspace.currentFocus}
          websiteSignal={workspace.websiteSignal}
          currentTask={workspace.currentTask}
        />
      );
    case 'settings':
      return (
        <SettingsPage
          status={workspace.status}
          settingsMessage={workspace.settingsMessage}
          setSettingsMessage={workspace.setSettingsMessage}
          onToggleTracking={workspace.toggleTracking}
          onToggleBreak={workspace.toggleBreak}
          canToggleBreak={workspace.canToggleBreak}
          onLogout={workspace.logout}
          proofName={workspace.proofName}
          proofStatus={workspace.proofStatus}
          onProofSelection={workspace.handleProofSelection}
        />
      );
    case 'dashboard':
    default:
      return (
        <DashboardPage
          workTimer={workspace.workTimer}
          productivityScore={workspace.productivityScore}
          currentFocus={workspace.currentFocus}
          currentFocusDetail={workspace.currentFocusTitle}
          currentTask={workspace.currentTask}
          status={workspace.status}
          syncStateLabel={workspace.syncStateLabel}
          now={workspace.now}
          onToggleTracking={workspace.toggleTracking}
          onToggleBreak={workspace.toggleBreak}
          canToggleBreak={workspace.canToggleBreak}
          proofName={workspace.proofName}
          proofStatus={workspace.proofStatus}
          onProofSelection={workspace.handleProofSelection}
          activeSecondsToday={durationProps.activeDuration}
          idleSecondsToday={durationProps.idleDuration}
          activeRatio={workspace.activeRatio}
          completedTasks={workspace.completedTasks}
          tasks={workspace.tasks}
          taskCompletionRatio={workspace.taskCompletionRatio}
          websiteSignal={workspace.websiteSignal}
          isEmployee={workspace.isEmployee}
          tasksLoading={workspace.tasksLoading}
          onReloadTasks={() => workspace.loadTasks()}
          taskError={workspace.taskError}
          activityFeed={workspace.activityFeed}
        />
      );
  }
}

export function App() {
  const workspace = useWorkspaceState();

  if (!workspace.status.loggedIn) {
    return (
      <LoginScreen
        email={workspace.email}
        setEmail={workspace.setEmail}
        password={workspace.password}
        setPassword={workspace.setPassword}
        loginError={workspace.loginError}
        loading={workspace.loading}
        onSubmit={workspace.login}
      />
    );
  }

  return (
    <WorkspaceShell
      status={workspace.status}
      workTimer={workspace.workTimer}
      syncStateLabel={workspace.syncStateLabel}
      actionStatusLabel={workspace.actionStatusLabel}
      visibleNavItems={workspace.visibleNavItems}
      activeView={workspace.activeView}
      setActiveView={workspace.setActiveView}
      currentView={workspace.currentView}
      productivityScore={workspace.productivityScore}
      todayLabel={workspace.todayLabel}
      onToggleTracking={workspace.toggleTracking}
      onLogout={workspace.logout}
    >
      {renderWorkspaceView(workspace)}
    </WorkspaceShell>
  );
}
