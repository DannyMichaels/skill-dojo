import { createBrowserRouter, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';
import LoginScreen from '../features/auth/screens/LoginScreen';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import VerifyEmailScreen from '../features/auth/screens/VerifyEmailScreen';
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../features/auth/screens/ResetPasswordScreen';
import DashboardScreen from '../features/dashboard/screens/DashboardScreen';
import SkillDetailScreen from '../features/skills/screens/SkillDetailScreen';
import TrainingScreen from '../features/training/screens/TrainingScreen';
import SessionReviewScreen from '../features/training/screens/SessionReviewScreen';
import PublicProfileScreen from '../features/profile/screens/PublicProfileScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import FeedScreen from '../features/feed/screens/FeedScreen';
import SearchResultsScreen from '../features/social/screens/SearchResultsScreen';

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginScreen /> },
      { path: '/register', element: <RegisterScreen /> },
      { path: '/verify-email', element: <VerifyEmailScreen /> },
      { path: '/forgot-password', element: <ForgotPasswordScreen /> },
      { path: '/reset-password', element: <ResetPasswordScreen /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: '/feed', element: <FeedScreen /> },
      { path: '/dashboard', element: <DashboardScreen /> },
      { path: '/search', element: <SearchResultsScreen /> },
      { path: '/skills/:id', element: <SkillDetailScreen /> },
      { path: '/train/:skillId', element: <TrainingScreen /> },
      { path: '/train/:skillId/:sessionId', element: <TrainingScreen /> },
      { path: '/train/:skillId/:sessionId/review', element: <SessionReviewScreen /> },
      { path: '/u/:username', element: <PublicProfileScreen /> },
      { path: '/settings', element: <SettingsScreen /> },
    ],
  },
  { path: '/', element: <Navigate to="/feed" replace /> },
]);

export default router;
