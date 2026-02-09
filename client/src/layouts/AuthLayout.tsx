import { Outlet, Navigate } from 'react-router-dom';
import useAuthStore from '../features/auth/store/auth.store';
import './AuthLayout.scss';

export default function AuthLayout() {
  const { token } = useAuthStore();

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="AuthLayout">
      <div className="AuthLayout__card">
        <h1 className="AuthLayout__logo">Code Dojo</h1>
        <Outlet />
      </div>
    </div>
  );
}
