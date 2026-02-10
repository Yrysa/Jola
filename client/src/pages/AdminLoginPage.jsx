import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService } from '../services/adminService.js';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await adminService.login(form.email, form.password);
      localStorage.setItem('token', data.token);
      toast.success('Вход выполнен');
      navigate('/admin');
      window.location.reload();
    } catch (error) {
      toast.error(error?.message || 'Ошибка входа администратора');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Admin Login</h1>
        <p>Вход только для администраторов.</p>

        <form onSubmit={onSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input name="password" type="password" value={form.password} onChange={onChange} required />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Вход...' : 'Войти в админку'}
          </button>
        </form>
      </div>
    </div>
  );
}
