import useAuthStore from '../../auth/store/auth.store';
import './DashboardScreen.scss';

export default function DashboardScreen() {
  const { user } = useAuthStore();

  return (
    <div className="DashboardScreen">
      <h1 className="DashboardScreen__title">
        Welcome, { user?.name || 'Student' }
      </h1>
      <p className="DashboardScreen__subtitle">
        Your training skills will appear here. Start by adding a new skill.
      </p>
      <div className="DashboardScreen__empty">
        No skills yet. Start training to begin your journey.
      </div>
    </div>
  );
}
