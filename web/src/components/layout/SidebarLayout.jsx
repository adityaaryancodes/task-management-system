import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getUser, signOutSession } from '../../lib/auth';
import { useTheme } from '../theme/ThemeProvider';

function initialsFor(name, email) {
  const source = String(name || email || 'WF').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function SidebarLayout({ items }) {
  const user = getUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let active = true;

    const loadNotifications = () => {
      api
        .get('/policy/alerts', { params: { limit: 6, unresolved_only: true } })
        .then((res) => {
          if (!active) return;
          setNotifications(res.data.data || []);
        })
        .catch(() => {
          if (!active) return;
          setNotifications([]);
        });
    };

    loadNotifications();
    const intervalId = setInterval(loadNotifications, 60000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  async function handleSignOut() {
    await signOutSession();
    navigate('/login', { replace: true });
  }

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => `${item.label} ${item.description || ''} ${item.section || ''}`.toLowerCase().includes(needle));
  }, [items, query]);

  const groupedItems = useMemo(
    () =>
      filteredItems.reduce((acc, item) => {
        const key = item.section || 'Workspace';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {}),
    [filteredItems]
  );

  const currentItem = items.find((item) => location.pathname.startsWith(item.to)) || items[0];
  const unresolvedCount = notifications.length;
  const avatarText = initialsFor(user?.full_name, user?.email);
  const isDark = theme === 'dark';
  const shellClass = isDark
    ? 'bg-[radial-gradient(circle_at_top,_#111827_0%,_#020617_52%,_#01030f_100%)] text-slate-100'
    : 'bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#edf4ff_44%,_#d8e6ff_100%)] text-slate-900';
  const sidebarClass = isDark
    ? 'border-slate-800 bg-[linear-gradient(180deg,#0b1e46_0%,#102b63_58%,#0f2451_100%)] text-white'
    : 'border-sky-200 bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_55%,#c7dbff_100%)] text-slate-900';
  const sidebarPanelClass = isDark
    ? 'border-white/10 bg-white/5 backdrop-blur'
    : 'border-white/80 bg-white/65 shadow-[0_20px_60px_rgba(148,163,184,0.18)] backdrop-blur';
  const sidebarMetaClass = isDark ? 'text-sky-100/75' : 'text-slate-600';
  const sectionLabelClass = isDark ? 'text-sky-200/55' : 'text-sky-800/55';
  const inactiveNavClass = isDark
    ? 'bg-white/5 text-sky-100/85 hover:bg-white/10'
    : 'bg-white/45 text-slate-700 hover:bg-white/75';
  const activeNavClass = isDark
    ? 'bg-white text-slate-900 shadow-lg'
    : 'bg-slate-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]';
  const sidebarActionClass = isDark
    ? 'border-white/10 bg-white/5 text-sky-100/85 hover:bg-white/10'
    : 'border-white/80 bg-white/65 text-slate-700 shadow-[0_16px_35px_rgba(148,163,184,0.18)] hover:bg-white';
  const primaryHeaderClass = isDark
    ? 'border-slate-800 bg-slate-950/75'
    : 'border-white/70 bg-white/72 shadow-[0_12px_30px_rgba(148,163,184,0.12)]';
  const secondaryButtonClass = isDark
    ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
    : 'border-slate-200 bg-white/90 text-slate-700 hover:bg-white';
  const dropdownClass = isDark
    ? 'border-slate-800 bg-slate-900'
    : 'border-slate-200 bg-white/95 shadow-2xl';
  const dropdownItemClass = isDark
    ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
    : 'border-slate-200 text-slate-700 hover:bg-slate-50';
  const searchInputClass = isDark
    ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-400'
    : 'border-slate-200 bg-white/90 text-slate-900 placeholder:text-slate-400';
  const mobileNavClass = isDark
    ? 'border-slate-800 bg-slate-950/65'
    : 'border-white/70 bg-white/70 shadow-[0_12px_30px_rgba(148,163,184,0.12)]';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${shellClass}`}>
      <div className="flex min-h-screen">
        <aside className={`hidden w-[290px] flex-col border-r px-5 py-6 transition-colors duration-300 lg:flex ${sidebarClass}`}>
          <div className={`rounded-[28px] border p-5 ${sidebarPanelClass}`}>
            <p className={`text-xs uppercase tracking-[0.22em] ${isDark ? 'text-sky-200/70' : 'text-sky-800/60'}`}>Workforce Intelligence</p>
            <h1 className="mt-3 text-2xl font-semibold">Control Center</h1>
            <p className={`mt-2 text-sm ${sidebarMetaClass}`}>
              Productivity, insights, work patterns, and operational visibility in one place.
            </p>
            <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${isDark ? 'bg-white/8 text-sky-100/80' : 'bg-white/72 text-slate-700'}`}>
              <p className="font-medium">{user?.full_name || user?.email}</p>
              <p className={`mt-1 text-xs uppercase tracking-[0.18em] ${isDark ? 'text-sky-200/60' : 'text-slate-500'}`}>{user?.role || 'Admin'}</p>
            </div>
          </div>

          <div className="mt-6 flex-1 overflow-y-auto pr-1">
            {Object.entries(groupedItems).map(([section, sectionItems]) => (
              <div key={section} className="mb-6">
                <p className={`mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] ${sectionLabelClass}`}>{section}</p>
                <nav className="space-y-2">
                  {sectionItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        [
                          'block rounded-2xl px-4 py-3 transition',
                          isActive ? activeNavClass : inactiveNavClass
                        ].join(' ')
                      }
                    >
                      <p className="text-sm font-medium">{item.label}</p>
                      {item.description ? (
                        <p className="mt-1 text-xs text-inherit opacity-70">{item.description}</p>
                      ) : null}
                    </NavLink>
                  ))}
                </nav>
              </div>
            ))}
            {!filteredItems.length ? (
              <div className={`rounded-2xl border border-dashed px-4 py-5 text-sm ${isDark ? 'border-white/10 text-sky-100/70' : 'border-sky-200 text-slate-600'}`}>
                No navigation results for "{query}".
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${sidebarActionClass}`}
              onClick={toggleTheme}
            >
              Theme: {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
            <button
              type="button"
              className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${isDark ? 'border-white/10 bg-white text-slate-900 hover:bg-slate-100' : 'border-white/80 bg-slate-900 text-white hover:bg-slate-800'}`}
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className={`sticky top-0 z-20 border-b backdrop-blur transition-colors duration-300 ${primaryHeaderClass}`}>
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className={`text-xs uppercase tracking-[0.22em] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Operations Workspace</p>
                <h2 className={`mt-2 text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentItem?.label || 'Dashboard'}</h2>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{currentItem?.description || 'Workforce intelligence surface'}</p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative min-w-[280px]">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search navigation, reports, settings..."
                    className={`w-full rounded-2xl border py-3 pl-4 pr-4 text-sm shadow-sm transition ${searchInputClass}`}
                  />
                </div>

                <button
                  type="button"
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition ${secondaryButtonClass}`}
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>

                <div className="relative">
                  <button
                    type="button"
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition ${secondaryButtonClass}`}
                    onClick={() => setNotificationsOpen((prev) => !prev)}
                  >
                    Notifications {unresolvedCount ? `(${unresolvedCount})` : ''}
                  </button>
                  {notificationsOpen ? (
                    <div className={`absolute right-0 mt-3 w-[340px] rounded-[24px] border p-4 ${dropdownClass}`}>
                      <div className="mb-3 flex items-center justify-between">
                        <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Open Alerts</p>
                        <button
                          type="button"
                          className="text-xs text-brand-700 dark:text-brand-300"
                          onClick={() => navigate('/admin/notifications')}
                        >
                          View all
                        </button>
                      </div>
                      <div className="space-y-3">
                        {notifications.length ? (
                          notifications.map((alert) => (
                            <div key={alert.id} className="surface-subtle px-3 py-3">
                              <p className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                {alert.full_name || alert.email || 'Employee'} opened {alert.app_name}
                              </p>
                              <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {new Date(alert.detected_at).toLocaleString()}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No unresolved alerts right now.</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left shadow-sm transition ${secondaryButtonClass}`}
                    onClick={() => setProfileOpen((prev) => !prev)}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-sm font-semibold text-white">
                      {avatarText}
                    </span>
                    <span className="hidden md:block">
                      <span className={`block text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{user?.full_name || user?.email}</span>
                      <span className={`block text-xs uppercase tracking-[0.16em] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{user?.role}</span>
                    </span>
                  </button>
                  {profileOpen ? (
                    <div className={`absolute right-0 mt-3 w-64 rounded-[24px] border p-4 ${dropdownClass}`}>
                      <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{user?.full_name || user?.email}</p>
                      <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email}</p>
                      <div className="mt-4 space-y-2">
                        <button
                          type="button"
                          className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${dropdownItemClass}`}
                          onClick={() => navigate('/admin/settings')}
                        >
                          Organization settings
                        </button>
                        <button
                          type="button"
                          className={`w-full rounded-2xl px-3 py-2 text-left text-sm font-medium text-white transition ${isDark ? 'bg-brand-500 hover:bg-brand-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                          onClick={handleSignOut}
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <div className={`border-b px-4 py-3 backdrop-blur transition-colors duration-300 lg:hidden ${mobileNavClass}`}>
            <div className="flex gap-2 overflow-x-auto">
              {filteredItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'whitespace-nowrap rounded-full px-3 py-2 text-sm transition',
                      isActive
                        ? 'bg-brand-500 text-white'
                        : isDark
                          ? 'border border-slate-700 bg-slate-900 text-slate-300'
                          : 'border border-slate-200 bg-white/90 text-slate-600'
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <main className="flex-1 px-4 py-6 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
