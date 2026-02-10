import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { formatPrice } from '../utils/formatPrice.js';
import { adminService } from '../services/adminService.js';
import './AdminPage.css';

const ORDER_STATUSES = ['new', 'paid', 'shipped', 'canceled'];

const initialProductForm = {
  name: '',
  description: '',
  price: '',
  category: 'electronics',
  brand: '',
  imageUrl: '',
  stock: 0,
};

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('products');
  const [form, setForm] = useState(initialProductForm);
  const [editId, setEditId] = useState(null);

  const { data: products = [], isLoading: productsLoading } = useQuery(['admin-products'], adminService.getProducts);
  const { data: orders = [], isLoading: ordersLoading } = useQuery(['admin-orders'], adminService.getOrders);
  const { data: users = [], isLoading: usersLoading } = useQuery(['admin-users'], adminService.getUsers);
  const { data: sales, isLoading: statsLoading } = useQuery(['admin-stats'], adminService.getStats);

  const loading = productsLoading || ordersLoading || usersLoading || statsLoading;

  const saveProductMutation = useMutation(
    (payload) => (editId ? adminService.updateProduct(editId, payload) : adminService.createProduct(payload)),
    {
      onSuccess: () => {
        toast.success(editId ? 'Товар обновлён' : 'Товар создан');
        setEditId(null);
        setForm(initialProductForm);
        queryClient.invalidateQueries(['admin-products']);
      },
      onError: (error) => toast.error(error?.message || 'Ошибка сохранения товара'),
    }
  );

  const hideMutation = useMutation(({ id, isHidden }) => adminService.hideProduct(id, isHidden), {
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-products']);
      toast.success('Видимость товара обновлена');
    },
    onError: (error) => toast.error(error?.message || 'Ошибка обновления товара'),
  });

  const orderMutation = useMutation(({ id, status }) => adminService.updateOrderStatus(id, status), {
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-orders']);
      queryClient.invalidateQueries(['admin-stats']);
      toast.success('Статус заказа обновлён');
    },
    onError: (error) => toast.error(error?.message || 'Ошибка изменения статуса'),
  });

  const userMutation = useMutation(({ id, payload }) => adminService.updateUser(id, payload), {
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('Пользователь обновлён');
    },
    onError: (error) => toast.error(error?.message || 'Ошибка обновления пользователя'),
  });

  const onProductSubmit = (e) => {
    e.preventDefault();
    saveProductMutation.mutate({
      name: form.name,
      description: form.description,
      price: Number(form.price),
      category: form.category,
      brand: form.brand,
      images: [form.imageUrl],
      stock: Number(form.stock),
    });
  };

  const salesCards = useMemo(() => [
    { label: 'День', value: sales?.day ?? 0 },
    { label: 'Неделя', value: sales?.week ?? 0 },
    { label: 'Месяц', value: sales?.month ?? 0 },
  ], [sales]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="admin-page">
      <div className="container">
        <h1>Админка (MVP)</h1>

        <div className="stats-grid">
          {salesCards.map((item) => (
            <div key={item.label} className="stat-card">
              <strong>Продажи за {item.label}:</strong>
              <span>{formatPrice(item.value)}</span>
            </div>
          ))}
        </div>

        <div className="admin-tabs">
          <button className={activeTab === 'products' ? 'tab active' : 'tab'} onClick={() => setActiveTab('products')}>Товары</button>
          <button className={activeTab === 'orders' ? 'tab active' : 'tab'} onClick={() => setActiveTab('orders')}>Заказы</button>
          <button className={activeTab === 'users' ? 'tab active' : 'tab'} onClick={() => setActiveTab('users')}>Пользователи</button>
        </div>

        {activeTab === 'products' && (
          <div className="admin-content">
            <h2>{editId ? 'Редактировать товар' : 'Создать товар'}</h2>
            <form className="product-form" onSubmit={onProductSubmit}>
              <input placeholder="Название" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input placeholder="Бренд" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
              <input type="number" placeholder="Цена" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              <input type="number" placeholder="Остаток" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
              <input placeholder="URL изображения" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} required />
              <textarea placeholder="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              <button className="btn btn-primary" disabled={saveProductMutation.isLoading}>{editId ? 'Сохранить' : 'Создать'}</button>
            </form>

            <table>
              <thead><tr><th>Название</th><th>Цена</th><th>Остаток</th><th>Видимость</th><th>Действия</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td>{formatPrice(p.price)}</td>
                    <td>{p.stock}</td>
                    <td>{p.isHidden ? 'Скрыт' : 'Показывается'}</td>
                    <td className="action-buttons">
                      <button className="btn btn-secondary" onClick={() => {
                        setEditId(p._id);
                        setForm({
                          name: p.name,
                          description: p.description,
                          price: p.price,
                          category: p.category,
                          brand: p.brand,
                          imageUrl: p.images?.[0] || '',
                          stock: p.stock,
                        });
                      }}>Изменить</button>
                      <button className="btn btn-danger" onClick={() => hideMutation.mutate({ id: p._id, isHidden: !p.isHidden })}>
                        {p.isHidden ? 'Показать' : 'Скрыть'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="admin-content">
            <h2>Заказы</h2>
            <table>
              <thead><tr><th>ID</th><th>Клиент</th><th>Сумма</th><th>Статус</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td>{o._id.slice(-8)}</td>
                    <td>{o.user?.name || '—'}</td>
                    <td>{formatPrice(o.totalPrice)}</td>
                    <td>
                      <select value={o.status} onChange={(e) => orderMutation.mutate({ id: o._id, status: e.target.value })}>
                        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-content">
            <h2>Пользователи</h2>
            <table>
              <thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Бан</th><th>Действия</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.isBanned ? 'Да' : 'Нет'}</td>
                    <td className="action-buttons">
                      <button className="btn btn-secondary" onClick={() => userMutation.mutate({ id: u._id, payload: { role: u.role === 'admin' ? 'user' : 'admin' } })}>
                        Роль: {u.role === 'admin' ? 'user' : 'admin'}
                      </button>
                      <button className="btn btn-danger" onClick={() => userMutation.mutate({ id: u._id, payload: { isBanned: !u.isBanned } })}>
                        {u.isBanned ? 'Разбан' : 'Бан'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
