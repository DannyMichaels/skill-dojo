import { useState, useEffect, useCallback } from 'react';
import Button from '../../../components/shared/Button';
import CodeInput from '../components/CodeInput';
import useAuthStore from '../store/auth.store';

export default function VerifyEmailScreen() {
  const { user, loading, error, verifyEmail, resendVerification, logout, clearError } = useAuthStore();
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState('');

  const handleSubmit = useCallback(
    async (submittedCode: string) => {
      if (submittedCode.length !== 6 || loading) return;
      clearError();
      try {
        await verifyEmail(submittedCode);
      } catch {
        // error handled by store
      }
    },
    [loading, verifyEmail, clearError],
  );

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (newCode.length === 6) {
      handleSubmit(newCode);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    clearError();
    setResendMsg('');
    try {
      await resendVerification();
      setResendMsg('Code sent!');
      setCooldown(60);
    } catch {
      // error handled by store
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  return (
    <form
      className="Form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(code);
      }}
    >
      <h2 className="Form__title">Verify Your Email</h2>
      <p className="Form__subtitle">
        We sent a 6-digit code to <strong>{user?.email}</strong>
      </p>
      {error && <div className="Form__error">{error}</div>}
      {resendMsg && <div className="Form__success">{resendMsg}</div>}
      <CodeInput value={code} onChange={handleCodeChange} disabled={loading} error={!!error} />
      <Button type="submit" fullWidth loading={loading} disabled={code.length !== 6}>
        Verify
      </Button>
      <p className="Form__footer">
        <button
          type="button"
          className="Form__link"
          onClick={handleResend}
          disabled={cooldown > 0 || loading}
        >
          {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
        </button>
      </p>
      <p className="Form__footer">
        <button type="button" className="Form__link" onClick={logout}>
          Logout
        </button>
      </p>
    </form>
  );
}
