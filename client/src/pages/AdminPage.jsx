import { useState, useEffect } from 'react'; // Добавлен useEffect
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { productService } from '../services/productService.js';
import { orderService } from '../services/orderService.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import toast from 'react-hot-toast';
import './AdminPage.css';

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // ===== ЗАПРОСЫ =====
  const { data: productsData, isLoading: productsLoading } = useQuery(
    ['admin-products'],
    () => productService.getProducts({ page: 1, limit: 50 }),
  );

  const { data: ordersData, isLoading: ordersLoading } = useQuery(
    ['admin-orders'],
    () => orderService.getAllOrders(),
  );

  // ===== МУТАЦИИ =====
  const createProductMutation = useMutation(
    (productData) => productService.createProduct(productData),
    {
      onSuccess: () => {
        toast.success('Товар успешно создан');
        queryClient.invalidateQueries(['admin-products']);
      },
      onError: (error) => {
        toast.error(error.message || 'Ошибка при создании товара');
      },
    },
  );

  const deleteProductMutation = useMutation(
    (id) => productService.deleteProduct(id),
    {
      onSuccess: () => {
        toast.success('Товар удалён');
        queryClient.invalidateQueries(['admin-products']);
      },
      onError: (error) => {
        toast.error(error.message || 'Ошибка при удалении товара');
      },
    },
  );

  // ===== ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ ТОВАРОВ =====
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productService.getProducts({ page: 1, limit: 50 });
      setProducts(data.products ?? data);
    } catch (err) {
      console.error('Ошибка загрузки товаров', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ===== ФУНКЦИЯ УДАЛЕНИЯ ТОВАРА (альтернативная) =====
  const handleDelete = async (id) => {
    if (!window.confirm('Точно удалить этот товар?')) return;

    try {
      await productService.deleteProduct(id);
      await fetchProducts();
    } catch (err) {
      console.error('Ошибка удаления товара', err);
    }
  };

  // ===== ФОРМА ДОБАВЛЕНИЯ ТОВАРА =====
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'electronics',
    brand: '',
    imageUrl: '',
    stock: 10,
    discount: 0,
    isFeatured: false,
    tags: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateProduct = (e) => {
    e.preventDefault();

    if (!form.name || !form.price || !form.description || !form.brand || !form.imageUrl) {
      toast.error('Заполни все обязательные поля');
      return;
    }

    const productData = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      category: form.category,
      brand: form.brand,
      images: [form.imageUrl],
      stock: Number(form.stock),
      discount: Number(form.discount) || 0,
      isFeatured: form.isFeatured,
      tags: form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    };

    createProductMutation.mutate(productData, {
      onSuccess: () => {
        setForm({
          name: '',
          description: '',
          price: '',
          category: 'electronics',
          brand: '',
          imageUrl: '',
          stock: 10,
          discount: 0,
          isFeatured: false,
          tags: '',
        });
      },
    });
  };

  const handleDeleteProduct = (id) => {
    if (!window.confirm('Удалить этот товар?')) return;
    deleteProductMutation.mutate(id);
  };

  // ===== РЕНДЕР =====
  const productsFromQuery = productsData?.data?.products || [];
  const orders = ordersData?.data?.orders || [];

  if (productsLoading || ordersLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <h1 className="admin-title">Админ-панель</h1>
        <p className="admin-subtitle">
          Здесь только ты 👑 можешь управлять товарами и заказами
        </p>

        {/* Табы */}
        <div className="admin-tabs">
          <button
            className={activeTab === 'products' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('products')}
          >
            Товары
          </button>
          <button
            className={activeTab === 'orders' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('orders')}
          >
            Заказы
          </button>
        </div>

        {/* КОНТЕНТ ТАБОВ */}
        {activeTab === 'products' && (
          <div className="admin-section">
            <h2>Добавить товар</h2>
            <form className="product-form" onSubmit={handleCreateProduct}>
              <div className="form-row">
                <div className="form-group">
                  <label>Название *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Например: iPhone 15 Pro Max"
                  />
                </div>
                <div className="form-group">
                  <label>Бренд *</label>
                  <input
                    type="text"
                    name="brand"
                    value={form.brand}
                    onChange={handleChange}
                    placeholder="Apple, Samsung..."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Цена (₸) *</label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Скидка (%)</label>
                  <input
                    type="number"
                    name="discount"
                    value={form.discount}
                    onChange={handleChange}
                    min="0"
                    max="90"
                  />
                </div>
                <div className="form-group">
                  <label>В наличии (шт)</label>
                  <input
                    type="number"
                    name="stock"
                    value={form.stock}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Категория</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    <option value="electronics">Электроника</option>
                    <option value="smartphones">Смартфоны</option>
                    <option value="laptops">Ноутбуки</option>
                    <option value="gaming">Игры / Консоли</option>
                    <option value="audio">Аудио</option>
                    <option value="other">Другое</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>URL изображения *</label>
                  <input
                    type="text"
                    name="imageUrl"
                    value={form.imageUrl}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Описание *</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Кратко опиши товар"
                />
              </div>

              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={form.isFeatured}
                      onChange={handleChange}
                    />
                    Сделать хитом (показывать на главной)
                  </label>
                </div>

                <div className="form-group">
                  <label>Теги (через запятую)</label>
                  <input
                    type="text"
                    name="tags"
                    value={form.tags}
                    onChange={handleChange}
                    placeholder="игры, консоль, ps5"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={createProductMutation.isLoading}
              >
                {createProductMutation.isLoading
                  ? 'Сохраняю...'
                  : 'Создать товар'}
              </button>
            </form>

            <hr className="admin-separator" />

            <h2>Список товаров</h2>
            {loading && <p>Загрузка...</p>}
            {!loading && products.length === 0 ? (
              <p>Пока нет товаров. Добавь первый 👇</p>
            ) : (
              <>
                {/* Таблица с использованием React Query */}
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Бренд</th>
                      <th>Цена</th>
                      <th>Скидка</th>
                      <th>В наличии</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsFromQuery.map((p) => (
                      <tr key={p._id}>
                        <td>{p.name}</td>
                        <td>{p.brand}</td>
                        <td>{p.price} ₸</td>
                        <td>{p.discount || 0}%</td>
                        <td>{p.stock}</td>
                        <td>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDeleteProduct(p._id)}
                            disabled={deleteProductMutation.isLoading}
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Альтернативный список с useState */}
                <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
                  <h3>Альтернативный список (через useState)</h3>
                  {!loading && products.map((p) => (
                    <div key={p._id} style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{p.name}</strong> — {p.price} ₸
                      </div>
                      <button 
                        onClick={() => handleDelete(p._id)}
                        style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="admin-section">
            <h2>Заказы</h2>
            {orders.length === 0 ? (
              <p>Пока нет заказов.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Пользователь</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                    <th>Создан</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o._id}>
                      <td>{o._id}</td>
                      <td>{o.user?.name || '—'}</td>
                      <td>{o.totalPrice} ₸</td>
                      <td>{o.status}</td>
                      <td>{new Date(o.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}