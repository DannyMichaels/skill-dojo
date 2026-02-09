import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../../../components/shared/Button';
import Input from '../../../components/shared/Input';
import useAuthStore from '../store/auth.store';
import { registerSchema, type RegisterInput } from '../schemas/auth.schema';

export default function RegisterForm() {
  const navigate = useNavigate();
  const { register, loading, error, clearError } = useAuthStore();
  const [form, setForm] = useState<RegisterInput>({ email: '', password: '', name: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    try {
      await register(result.data);
      navigate('/dashboard');
    } catch {
      // error handled by store
    }
  };

  return (
    <form className="Form" onSubmit={ handleSubmit }>
      <h2 className="Form__title">Create Account</h2>
      { error && <div className="Form__error">{ error }</div> }
      <Input
        name="name"
        label="Name"
        placeholder="Your name"
        value={ form.name }
        onChange={ handleChange }
        error={ fieldErrors.name }
      />
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
        placeholder="At least 8 characters"
        value={ form.password }
        onChange={ handleChange }
        error={ fieldErrors.password }
      />
      <Button type="submit" fullWidth loading={ loading }>
        Create Account
      </Button>
      <p className="Form__footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </form>
  );
}
