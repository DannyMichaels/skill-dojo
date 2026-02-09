import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../../../components/shared/Button';
import Input from '../../../components/shared/Input';
import useAuthStore from '../store/auth.store';
import { loginSchema, type LoginInput } from '../schemas/auth.schema';

export default function LoginForm() {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuthStore();
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    try {
      await login(result.data);
      navigate('/dashboard');
    } catch {
      // error handled by store
    }
  };

  return (
    <form className="Form" onSubmit={ handleSubmit }>
      <h2 className="Form__title">Welcome Back</h2>
      { error && <div className="Form__error">{ error }</div> }
      <Input
        name="email"
        type="email"
        label="Email"
        placeholder="you@example.com"
        value={ form.email }
        onChange={ handleChange }
        error={ fieldErrors.email }
      />
      <Input
        name="password"
        type="password"
        label="Password"
        placeholder="Your password"
        value={ form.password }
        onChange={ handleChange }
        error={ fieldErrors.password }
      />
      <Button type="submit" fullWidth loading={ loading }>
        Sign In
      </Button>
      <p className="Form__footer">
        Don't have an account? <Link to="/register">Sign up</Link>
      </p>
    </form>
  );
}
