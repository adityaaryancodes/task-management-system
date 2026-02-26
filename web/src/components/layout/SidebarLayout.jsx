import { Link, Outlet } from 'react-router-dom';
import { getUser } from '../../lib/auth';

export function SidebarLayout({ items }) {
  const user = getUser();
  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-64 bg-slate-900 text-white p-5">
        <p className="font-semibold text-lg">Workforce IQ</p>
        <p className="text-xs text-slate-300 mt-1">{user?.full_name || user?.email}</p>
        <nav className="mt-6 space-y-2">
          {items.map((item) => (
            <Link key={item.to} to={item.to} className="block rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
