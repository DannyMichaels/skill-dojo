import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../components/shared/Button';
import Input from '../../../components/shared/Input';
import { forgotPasswordSchema } from '../schemas/auth.schema';
import * as authService from '../services/auth.service';

export default function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      navigate('/reset-password', { state: { email } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="Form" onSubmit={handleSubmit}>
      <h2 className="Form__title">Forgot Password</h2>
      <p className="Form__subtitle">Enter your email and we'll send you a reset code.</p>
      {error && <div className="Form__error">{error}</div>}
      <Input
        name="email"
        type="email"
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setFieldErrors({});
          setError('');
        }}
        error={fieldErrors.email}
      />
      <Button type="submit" fullWidth loading={loading}>
        Send Reset Code
      </Button>
      <p className="Form__footer">
        <Link to="/login">Back to login</Link>
      </p>
    </form>
  );
}
