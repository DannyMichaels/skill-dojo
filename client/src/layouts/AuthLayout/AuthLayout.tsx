import { Outlet, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../features/auth/store/auth.store';
import { APP_NAME, BrandIcon } from '../../constants/app';
import './AuthLayout.scss';

export default function AuthLayout() {
  const { token, user } = useAuthStore();
  const location = useLocation();

  const isVerifyPage = location.pathname === '/verify-email';
  const isForgotPage = location.pathname === '/forgot-password';
  const isResetPage = location.pathname === '/reset-password';

  // Unauthenticated pages: forgot-password and reset-password are always accessible
  if (isForgotPage || isResetPage) {
    return (
      <div className="AuthLayout">
        <div className="AuthLayout__card">
          <h1 className="AuthLayout__logo">
            <BrandIcon size={36} />
            {APP_NAME}
          </h1>
          <Outlet />
        </div>
      </div>
    );
  }

  // If logged in + unverified → redirect to verify page (unless already there)
  if (token && user && !user.emailVerified && !isVerifyPage) {
    return <Navigate to="/verify-email" replace />;
  }

  // If on verify page but no token → redirect to login
  if (isVerifyPage && !token) {
    return <Navigate to="/login" replace />;
  }

  // If logged in + verified → redirect to dashboard (but not from verify page while processing)
  if (token && user?.emailVerified && !isForgotPage && !isResetPage) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="AuthLayout">
      <div className="AuthLayout__card">
        <h1 className="AuthLayout__logo">
          <BrandIcon size={36} />
          {APP_NAME}
        </h1>
        <Outlet />
      </div>
    </div>
  );
}
