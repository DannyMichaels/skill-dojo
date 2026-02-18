import { useState, useCallback } from 'react';
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import Button from '../../../components/shared/Button';
import Input from '../../../components/shared/Input';
import CodeInput from '../components/CodeInput';
import * as authService from '../services/auth.service';

export default function ResetPasswordScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as any)?.email as string | undefined;

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!email || code.length !== 6) return;
      setError('');
      setFieldErrors({});

      if (newPassword.length < 8) {
        setFieldErrors({ newPassword: 'Password must be at least 8 characters' });
        return;
      }

      setLoading(true);
      try {
        await authService.resetPassword({ email, code, newPassword });
        navigate('/login', { state: { message: 'Password reset! You can now log in.' } });
      } catch (err: any) {
        setError(err.response?.data?.error || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    },
    [email, code, newPassword, navigate],
  );

  if (!email) {
    return <Navigate to="/forgot-password" replace />;
  }

  return (
    <form className="Form" onSubmit={handleSubmit}>
      <h2 className="Form__title">Reset Password</h2>
      <p className="Form__subtitle">
        Enter the code sent to <strong>{email}</strong> and your new password.
      </p>
      {error && <div className="Form__error">{error}</div>}
      <CodeInput value={code} onChange={setCode} disabled={loading} error={!!error} />
      <Input
        name="newPassword"
        type="password"
        label="New Password"
        placeholder="At least 8 characters"
        value={newPassword}
        onChange={(e) => {
          setNewPassword(e.target.value);
          setFieldErrors({});
          setError('');
        }}
        error={fieldErrors.newPassword}
      />
      <Button type="submit" fullWidth loading={loading} disabled={code.length !== 6}>
        Reset Password
      </Button>
      <p className="Form__footer">
        <Link to="/login">Back to login</Link>
      </p>
    </form>
  );
}
