import { Outlet, Navigate } from 'react-router-dom';
import useAuthStore from '../features/auth/store/auth.store';
import './AppLayout.scss';

export default function AppLayout() {
  const { token, user, logout } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="AppLayout">
      <aside className="AppLayout__sidebar">
        <div className="AppLayout__brand">Code Dojo</div>
        <nav className="AppLayout__nav">
          <a href="/dashboard" className="AppLayout__link">Dashboard</a>
        </nav>
        <div className="AppLayout__user">
          <span className="AppLayout__username">{ user?.name || user?.email }</span>
          <button className="AppLayout__logout" onClick={ logout }>
            Logout
          </button>
        </div>
      </aside>
      <main className="AppLayout__main">
        <Outlet />
      </main>
    </div>
  );
}
