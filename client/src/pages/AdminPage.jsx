import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiLayers,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShoppingBag,
  FiTrash2,
  FiTruck,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { productService } from '../services/productService.js';
import { orderService } from '../services/orderService.js';
import categoryService from '../services/categoryService.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { formatPrice } from '../utils/formatPrice.js';
import { useTranslation } from 'react-i18next';
import './AdminPage.css';

const slugify = (str) => String(str || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9\-]/g, '')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const getStatusTone = (status) => {
  if (status === 'delivered') return 'ok';
  if (status === 'cancelled') return 'danger';
  if (status === 'processing' || status === 'shipped') return 'info';
  return 'warn';
};

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { i18n, t } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');
  const labels = useMemo(() => (
    isRu
      ? {
          title: 'Админка Jola',
          subtitle: 'Чистая панель для товаров, заказов и категорий без лишнего шума.',
          tabs: { products: 'Товары', orders: 'Заказы', categories: 'Категории' },
          stats: { products: 'Товаров', orders: 'Заказов', revenue: 'Оборот', pending: 'Ожидают' },
          addProduct: 'Новый товар',
          save: 'Сохранить',
          saving: 'Сохраняю…',
          productList: 'Текущий каталог',
          emptyProducts: 'Пока нет товаров.',
          ordersTitle: 'Управление заказами',
          emptyOrders: 'Заказов пока нет.',
          categoriesTitle: 'Категории каталога',
          emptyCategories: 'Категорий пока нет.',
          createCategory: 'Добавить категорию',
          delete: 'Удалить',
          update: 'Обновить',
          note: 'Комментарий для заказа',
          filterAll: 'Все',
          filterPending: 'Активные',
          filterDone: 'Доставленные',
          filterCancelled: 'Отменённые',
          confirmDeleteProduct: 'Удалить товар?',
          confirmDeleteOrder: 'Удалить заказ?',
          confirmDeleteCategory: 'Удалить категорию?',
          fillRequired: 'Заполни обязательные поля',
          name: 'Название',
          brand: 'Бренд',
          price: 'Цена',
          category: 'Категория',
          description: 'Описание',
          image: 'Ссылки на изображения',
          video: 'Видео-обзор',
          stock: 'Остаток',
          discount: 'Скидка',
          tags: 'Теги',
          featured: 'Показывать как хит',
          key: 'Ключ',
          nameRu: 'Название RU',
          nameEn: 'Название EN',
          orderSum: 'Сумма',
          orderCreated: 'Создан',
          customer: 'Клиент',
          items: 'Позиций',
          delivery: 'Доставка',
          searchOrders: 'Поиск по заказу, email, клиенту',
          sortNewest: 'Сначала новые',
          sortOldest: 'Сначала старые',
          sortHigh: 'Сумма: выше',
          sortLow: 'Сумма: ниже',
          openOrder: 'Открыть заказ',
          orderDetails: 'Детали заказа',
          timeline: 'История статусов',
          noHistory: 'История пока пустая',
          files: 'Файлы',
          payment: 'Оплата',
        }
      : {
          title: 'Jola Admin',
          subtitle: 'A updated panel for products, orders, and categories with less clutter.',
          tabs: { products: 'Products', orders: 'Orders', categories: 'Categories' },
          stats: { products: 'Products', orders: 'Orders', revenue: 'Revenue', pending: 'Pending' },
          addProduct: 'New product',
          save: 'Save',
          saving: 'Saving…',
          productList: 'Current catalog',
          emptyProducts: 'No products yet.',
          ordersTitle: 'Order management',
          emptyOrders: 'No orders yet.',
          categoriesTitle: 'Catalog categories',
          emptyCategories: 'No categories yet.',
          createCategory: 'Create category',
          delete: 'Delete',
          update: 'Update',
          note: 'Order note',
          filterAll: 'All',
          filterPending: 'Active',
          filterDone: 'Delivered',
          filterCancelled: 'Cancelled',
          confirmDeleteProduct: 'Delete this product?',
          confirmDeleteOrder: 'Delete this order?',
          confirmDeleteCategory: 'Delete this category?',
          fillRequired: 'Fill in the required fields',
          name: 'Name',
          brand: 'Brand',
          price: 'Price',
          category: 'Category',
          description: 'Description',
          image: 'Image URLs',
          video: 'Video review',
          stock: 'Stock',
          discount: 'Discount',
          tags: 'Tags',
          featured: 'Show as featured',
          key: 'Key',
          nameRu: 'Name RU',
          nameEn: 'Name EN',
          orderSum: 'Total',
          orderCreated: 'Created',
          customer: 'Customer',
          items: 'Items',
          delivery: 'Delivery',
          searchOrders: 'Search by order, email, customer',
          sortNewest: 'Newest first',
          sortOldest: 'Oldest first',
          sortHigh: 'Total: high',
          sortLow: 'Total: low',
          openOrder: 'Open order',
          orderDetails: 'Order details',
          timeline: 'Status history',
          noHistory: 'No history yet',
          files: 'Files',
          payment: 'Payment',
        }
  ), [isRu]);

  const [activeTab, setActiveTab] = useState('products');
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState('newest');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderEdits, setOrderEdits] = useState({});

  const { data: productsData, isLoading: productsLoading } = useQuery(['admin-products'], () => productService.getProducts({ page: 1, limit: 100 }));
  const { data: ordersData, isLoading: ordersLoading } = useQuery(['admin-orders'], () => orderService.getAllOrders(), { refetchInterval: 5000 });
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery(['admin-categories'], () => categoryService.getCategories());

  const products = productsData?.products || [];
  const orders = ordersData?.orders || [];
  const categories = categoriesData?.categories || [];

  const createProductMutation = useMutation((payload) => productService.createProduct(payload), {
    onSuccess: () => {
      toast.success(isRu ? 'Товар добавлен' : 'Product created');
      queryClient.invalidateQueries(['admin-products']);
    },
    onError: (error) => toast.error(error.message || 'Error'),
  });

  const deleteProductMutation = useMutation((id) => productService.deleteProduct(id), {
    onSuccess: () => {
      toast.success(isRu ? 'Товар удалён' : 'Product deleted');
      queryClient.invalidateQueries(['admin-products']);
    },
    onError: (error) => toast.error(error.message || 'Error'),
  });

  const updateOrderMutation = useMutation(({ id, body }) => orderService.updateOrderStatus(id, body), {
    onSuccess: () => {
      toast.success(isRu ? 'Заказ обновлён' : 'Order updated');
      queryClient.invalidateQueries(['admin-orders']);
    },
    onError: (error) => toast.error(error.message || 'Error'),
  });

  const deleteOrderMutation = useMutation((id) => orderService.deleteOrder(id), {
    onSuccess: () => {
      toast.success(isRu ? 'Заказ удалён' : 'Order deleted');
      queryClient.invalidateQueries(['admin-orders']);
    },
    onError: (error) => toast.error(error.message || 'Error'),
  });

  const createCategoryMutation = useMutation((payload) => categoryService.createCategory(payload), {
    onSuccess: () => {
      toast.success(isRu ? 'Категория добавлена' : 'Category created');
      queryClient.invalidateQueries(['admin-categories']);
      queryClient.invalidateQueries(['admin-products']);
      setCategoryForm({ key: '', nameRu: '', nameEn: '' });
    },
    onError: (error) => toast.error(error.message || 'Error'),
  });

  const deleteCategoryMutation = useMutation((id) => categoryService.deleteCategory(id), {
    onSuccess: () => {
      toast.success(isRu ? 'Категория удалена' : 'Category deleted');
      queryClient.invalidateQueries(['admin-categories']);
      queryClient.invalidateQueries(['admin-products']);
    },
    onError: (error) => toast.error(error.message || 'Error'),
  });

  const defaultCategoryKey = useMemo(() => categories[0]?.key || '', [categories]);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    brand: '',
    imageUrls: '',
    videoUrl: '',
    stock: 10,
    discount: 0,
    isFeatured: false,
    tags: '',
  });

  useEffect(() => {
    if (categories.length && !form.category) {
      setForm((prev) => ({ ...prev, category: defaultCategoryKey }));
    }
  }, [categories.length, defaultCategoryKey, form.category]);

  const [categoryForm, setCategoryForm] = useState({ key: '', nameRu: '', nameEn: '' });
  const autoCategoryKey = useMemo(() => slugify(categoryForm.nameEn || categoryForm.nameRu), [categoryForm.nameEn, categoryForm.nameRu]);

  const summary = useMemo(() => {
    const revenue = orders.reduce((acc, order) => acc + Number(order.totalPrice || 0), 0);
    const pending = orders.filter((order) => ['pending', 'confirmed', 'processing', 'shipped'].includes(String(order.status || 'pending'))).length;
    return {
      revenue,
      pending,
      products: products.length,
      orders: orders.length,
    };
  }, [orders, products]);

  const orderStageSummary = useMemo(() => ({
    active: orders.filter((order) => ['pending', 'confirmed', 'processing', 'shipped'].includes(String(order.status || 'pending'))).length,
    delivered: orders.filter((order) => String(order.status) === 'delivered').length,
    cancelled: orders.filter((order) => String(order.status) === 'cancelled').length,
    paid: orders.filter((order) => Boolean(order.isPaid)).length,
  }), [orders]);

  const filteredOrders = useMemo(() => {
    const search = String(orderSearch || '').trim().toLowerCase();
    let nextOrders = [...orders];

    if (orderFilter === 'done') nextOrders = nextOrders.filter((o) => String(o.status) === 'delivered');
    if (orderFilter === 'cancelled') nextOrders = nextOrders.filter((o) => String(o.status) === 'cancelled');
    if (orderFilter === 'pending') nextOrders = nextOrders.filter((o) => ['pending', 'confirmed', 'processing', 'shipped'].includes(String(o.status || 'pending')));

    if (search) {
      nextOrders = nextOrders.filter((order) => {
        const haystack = [
          order._id,
          order.user?.name,
          order.user?.email,
          order.shippingAddress?.city,
          order.customerNote,
          order.adminNote,
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ');
        return haystack.includes(search);
      });
    }

    nextOrders.sort((a, b) => {
      if (orderSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (orderSort === 'total-high') return Number(b.totalPrice || 0) - Number(a.totalPrice || 0);
      if (orderSort === 'total-low') return Number(a.totalPrice || 0) - Number(b.totalPrice || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return nextOrders;
  }, [orderFilter, orderSearch, orderSort, orders]);

  const selectedOrder = useMemo(() => (
    filteredOrders.find((order) => String(order._id) === String(selectedOrderId)) || filteredOrders[0] || null
  ), [filteredOrders, selectedOrderId]);

  const mediaPreview = useMemo(() => {
    const images = String(form.imageUrls || '')
      .split(/\r?\n|,|;/)
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 12);
    const video = String(form.videoUrl || '').trim();
    return { images, video };
  }, [form.imageUrls, form.videoUrl]);

  const categoryLabel = (categoryKey) => {
    const match = categories.find((item) => item.key === categoryKey || item.name === categoryKey);
    if (!match) return categoryKey || '—';
    return isRu ? (match.nameRu || match.name || match.key) : (match.nameEn || match.name || match.key);
  };

  const handleProductChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateProduct = (event) => {
    event.preventDefault();
    if (!form.name || !form.price || !form.description || !form.brand || !form.imageUrls || !form.category) {
      toast.error(labels.fillRequired);
      return;
    }

    createProductMutation.mutate({
      name: form.name,
      description: form.description,
      price: Number(form.price),
      category: form.category,
      brand: form.brand,
      imageUrls: form.imageUrls,
      videoUrl: form.videoUrl,
      stock: Number(form.stock),
      discount: Number(form.discount) || 0,
      isFeatured: form.isFeatured,
      tags: form.tags ? form.tags.split(',').map((item) => item.trim()).filter(Boolean) : [],
    }, {
      onSuccess: () => {
        setForm({
          name: '',
          description: '',
          price: '',
          category: defaultCategoryKey,
          brand: '',
          imageUrls: '',
    videoUrl: '',
          stock: 10,
          discount: 0,
          isFeatured: false,
          tags: '',
        });
      },
    });
  };

  const handleDeleteProduct = (id) => {
    if (!window.confirm(labels.confirmDeleteProduct)) return;
    deleteProductMutation.mutate(id);
  };

  const handleCreateCategory = (event) => {
    event.preventDefault();
    const payload = {
      key: String(categoryForm.key || autoCategoryKey || '').trim(),
      nameRu: String(categoryForm.nameRu || '').trim(),
      nameEn: String(categoryForm.nameEn || '').trim(),
    };

    if (!payload.key || !payload.nameRu || !payload.nameEn) {
      toast.error(labels.fillRequired);
      return;
    }

    createCategoryMutation.mutate(payload);
  };

  const handleDeleteCategory = (id) => {
    if (!window.confirm(labels.confirmDeleteCategory)) return;
    deleteCategoryMutation.mutate(id);
  };

  const setOrderField = (orderId, patch) => {
    setOrderEdits((prev) => ({ ...prev, [orderId]: { ...(prev[orderId] || {}), ...patch } }));
  };

  const getOrderField = (order, fieldName) => {
    return orderEdits[order._id]?.[fieldName] ?? order[fieldName] ?? '';
  };


  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId('');
      return;
    }
    if (!filteredOrders.some((order) => String(order._id) === String(selectedOrderId))) {
      setSelectedOrderId(String(filteredOrders[0]._id));
    }
  }, [filteredOrders, selectedOrderId]);

  const saveOrderNote = (order) => {
    updateOrderMutation.mutate({ id: order._id, body: { adminNote: String(getOrderField(order, 'adminNote')).slice(0, 500) } });
  };

  const setOrderStatus = (orderId, status) => {
    updateOrderMutation.mutate({ id: orderId, body: { status } });
  };

  const handleDeleteOrder = (orderId) => {
    if (!window.confirm(labels.confirmDeleteOrder)) return;
    deleteOrderMutation.mutate(orderId);
  };

  if (productsLoading || ordersLoading || categoriesLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="admin-page admin-page--v2 admin-page--v3">
      <div className="container admin-wrap">
        <section className="admin-hero">
          <div>
            <div className="admin-kicker">Jola Control</div>
            <h1>{labels.title}</h1>
            <p>{labels.subtitle}</p>
          </div>
          <button type="button" className="admin-refresh" onClick={() => {
            queryClient.invalidateQueries(['admin-products']);
            queryClient.invalidateQueries(['admin-orders']);
            queryClient.invalidateQueries(['admin-categories']);
          }}>
            <FiRefreshCw /> {isRu ? 'Обновить' : 'Refresh'}
          </button>
        </section>

        <section className="admin-stats-grid">
          <article className="admin-stat-card">
            <span className="admin-stat-icon"><FiPackage /></span>
            <div>
              <div className="admin-stat-label">{labels.stats.products}</div>
              <div className="admin-stat-value">{summary.products}</div>
            </div>
          </article>
          <article className="admin-stat-card">
            <span className="admin-stat-icon"><FiShoppingBag /></span>
            <div>
              <div className="admin-stat-label">{labels.stats.orders}</div>
              <div className="admin-stat-value">{summary.orders}</div>
            </div>
          </article>
          <article className="admin-stat-card">
            <span className="admin-stat-icon"><FiBarChart2 /></span>
            <div>
              <div className="admin-stat-label">{labels.stats.revenue}</div>
              <div className="admin-stat-value">{formatPrice(summary.revenue)}</div>
            </div>
          </article>
          <article className="admin-stat-card">
            <span className="admin-stat-icon"><FiTruck /></span>
            <div>
              <div className="admin-stat-label">{labels.stats.pending}</div>
              <div className="admin-stat-value">{summary.pending}</div>
            </div>
          </article>
        </section>

        <section className="admin-tabs admin-tabs--v2">
          {['products', 'orders', 'categories'].map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              className={activeTab === tabKey ? 'tab active' : 'tab'}
              onClick={() => setActiveTab(tabKey)}
            >
              {labels.tabs[tabKey]}
            </button>
          ))}
        </section>

        {activeTab === 'products' ? (
          <section className="admin-grid-layout">
            <article className="admin-panel admin-panel--form">
              <div className="admin-panel-head">
                <div>
                  <h2>{labels.addProduct}</h2>
                  <p>{isRu ? 'Быстрый способ добавить товар в магазин.' : 'A faster way to add a product to the store.'}</p>
                </div>
              </div>

              <form className="admin-form-modern" onSubmit={handleCreateProduct}>
                <div className="admin-form-grid two">
                  <label>
                    <span>{labels.name} *</span>
                    <input type="text" name="name" value={form.name} onChange={handleProductChange} />
                  </label>
                  <label>
                    <span>{labels.brand} *</span>
                    <input type="text" name="brand" value={form.brand} onChange={handleProductChange} />
                  </label>
                </div>

                <div className="admin-form-grid four">
                  <label>
                    <span>{labels.price} *</span>
                    <input type="number" name="price" min="0" value={form.price} onChange={handleProductChange} />
                  </label>
                  <label>
                    <span>{labels.discount}</span>
                    <input type="number" name="discount" min="0" max="99" value={form.discount} onChange={handleProductChange} />
                  </label>
                  <label>
                    <span>{labels.stock}</span>
                    <input type="number" name="stock" min="0" value={form.stock} onChange={handleProductChange} />
                  </label>
                  <label>
                    <span>{labels.category} *</span>
                    <select name="category" value={form.category} onChange={handleProductChange}>
                      {categories.map((category) => (
                        <option key={category._id} value={category.key}>{isRu ? (category.nameRu || category.name || category.key) : (category.nameEn || category.name || category.key)}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  <span>{labels.image} *</span>
                  <textarea
                    name="imageUrls"
                    rows="4"
                    value={form.imageUrls}
                    onChange={handleProductChange}
                    placeholder={isRu ? 'Одна ссылка на строку или через запятую. Можно 4–12 изображений.' : 'One URL per line or comma-separated. Supports 4–12 images.'}
                  />
                  <small className="admin-field-hint">{isRu ? 'Первое изображение станет обложкой. Остальные попадут в галерею товара.' : 'The first image becomes the card cover. The rest go into the product gallery.'}</small>
                </label>

                <label>
                  <span>{labels.video}</span>
                  <input
                    type="url"
                    name="videoUrl"
                    value={form.videoUrl}
                    onChange={handleProductChange}
                    placeholder={isRu ? 'YouTube / mp4 / webm ссылка' : 'YouTube / mp4 / webm URL'}
                  />
                </label>

                {(mediaPreview.images.length || mediaPreview.video) ? (
                  <div className="admin-media-preview">
                    <div className="admin-media-preview__head">
                      <strong>{isRu ? 'Предпросмотр медиа' : 'Media preview'}</strong>
                      <span>{isRu ? `${mediaPreview.images.length} фото${mediaPreview.video ? ' • есть видео' : ''}` : `${mediaPreview.images.length} images${mediaPreview.video ? ' • video added' : ''}`}</span>
                    </div>
                    {mediaPreview.images.length ? (
                      <div className="admin-media-preview__grid">
                        {mediaPreview.images.map((src, idx) => (
                          <div key={`${src}-${idx}`} className="admin-media-preview__item">
                            <img src={src} alt={`preview-${idx + 1}`} loading="lazy" />
                            <span>{idx === 0 ? (isRu ? 'Обложка' : 'Cover') : `#${idx + 1}`}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {mediaPreview.video ? (
                      <a className="admin-media-preview__video" href={mediaPreview.video} target="_blank" rel="noreferrer">
                        {isRu ? 'Открыть видео-обзор' : 'Open video review'}
                      </a>
                    ) : null}
                  </div>
                ) : null}

                <label>
                  <span>{labels.description} *</span>
                  <textarea name="description" rows="5" value={form.description} onChange={handleProductChange} />
                </label>

                <div className="admin-form-grid two">
                  <label>
                    <span>{labels.tags}</span>
                    <input type="text" name="tags" value={form.tags} onChange={handleProductChange} placeholder={isRu ? 'iphone, premium, 512gb' : 'iphone, premium, 512gb'} />
                  </label>
                  <label className="admin-checkbox-row">
                    <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleProductChange} />
                    <span>{labels.featured}</span>
                  </label>
                </div>

                <button type="submit" className="btn btn-primary" disabled={createProductMutation.isLoading}>
                  <FiPlus /> {createProductMutation.isLoading ? labels.saving : labels.save}
                </button>
              </form>
            </article>

            <article className="admin-panel">
              <div className="admin-panel-head">
                <div>
                  <h2>{labels.productList}</h2>
                  <p>{products.length} {isRu ? 'позиций в каталоге' : 'items in the catalog'}</p>
                </div>
              </div>

              {products.length === 0 ? (
                <div className="admin-empty-state">{labels.emptyProducts}</div>
              ) : (
                <div className="admin-product-list">
                  {products.map((product) => (
                    <article key={product._id} className="admin-product-card">
                      <img src={product.images?.[0] || '/placeholder-product.svg'} alt={product.name} />
                      <div className="admin-product-card__content">
                        <div className="admin-product-card__top">
                          <div>
                            <h3>{product.brand} {product.name}</h3>
                            <p>{categoryLabel(product.category)}</p>
                          </div>
                          <button type="button" className="admin-icon-btn" onClick={() => handleDeleteProduct(product._id)} aria-label={labels.delete}>
                            <FiTrash2 />
                          </button>
                        </div>
                        <div className="admin-product-meta">
                          <span>{formatPrice(product.price)}</span>
                          <span>{labels.stock}: {product.stock}</span>
                          <span>{labels.discount}: {product.discount || 0}%</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        ) : null}

        {activeTab === 'orders' ? (
          <section className="admin-orders-shell">
            <article className="admin-panel admin-orders-list-panel">
              <div className="admin-panel-head admin-panel-head--stack">
                <div>
                  <h2>{labels.ordersTitle}</h2>
                  <p>{isRu ? 'Теперь список заказов читается быстрее: фильтры, поиск, быстрые статусы и живая карточка деталей справа.' : 'Orders are easier to scan now: filters, search, quick statuses, and a live detail panel on the right.'}</p>
                </div>
                <div className="admin-orders-toolbar">
                  <label className="admin-search-field">
                    <FiSearch />
                    <input
                      type="search"
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder={labels.searchOrders}
                    />
                  </label>
                  <select value={orderSort} onChange={(event) => setOrderSort(event.target.value)}>
                    <option value="newest">{labels.sortNewest}</option>
                    <option value="oldest">{labels.sortOldest}</option>
                    <option value="total-high">{labels.sortHigh}</option>
                    <option value="total-low">{labels.sortLow}</option>
                  </select>
                </div>
                <div className="admin-filter-row">
                  {[
                    ['all', labels.filterAll],
                    ['pending', labels.filterPending],
                    ['done', labels.filterDone],
                    ['cancelled', labels.filterCancelled],
                  ].map(([key, label]) => (
                    <button key={key} type="button" className={orderFilter === key ? 'admin-filter active' : 'admin-filter'} onClick={() => setOrderFilter(key)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-orders-overview">
                <article className="admin-orders-overview__card">
                  <small>{isRu ? 'Активные' : 'Active'}</small>
                  <strong>{orderStageSummary.active}</strong>
                  <span>{isRu ? 'требуют внимания' : 'need attention'}</span>
                </article>
                <article className="admin-orders-overview__card">
                  <small>{isRu ? 'Оплаченные' : 'Paid'}</small>
                  <strong>{orderStageSummary.paid}</strong>
                  <span>{isRu ? 'можно быстро проверить' : 'ready to verify'}</span>
                </article>
                <article className="admin-orders-overview__card">
                  <small>{isRu ? 'Доставленные' : 'Delivered'}</small>
                  <strong>{orderStageSummary.delivered}</strong>
                  <span>{isRu ? 'закрытых заказов' : 'closed successfully'}</span>
                </article>
                <article className="admin-orders-overview__card">
                  <small>{isRu ? 'Отменённые' : 'Cancelled'}</small>
                  <strong>{orderStageSummary.cancelled}</strong>
                  <span>{isRu ? 'нужны для анализа' : 'worth reviewing'}</span>
                </article>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="admin-empty-state">{labels.emptyOrders}</div>
              ) : (
                <div className="admin-order-list admin-order-list--enhanced">
                  {filteredOrders.map((order) => {
                    const status = String(order.status || 'pending');
                    const idShort = String(order._id || '').slice(-6);
                    const itemsCount = (order.orderItems?.length || 0) + (order.serviceItems?.length || 0);
                    const isActive = String(selectedOrder?._id || '') === String(order._id);
                    return (
                      <article
                        key={order._id}
                        className={isActive ? 'admin-order-card admin-order-card--compact is-active' : 'admin-order-card admin-order-card--compact'}
                        onClick={() => setSelectedOrderId(String(order._id))}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedOrderId(String(order._id));
                          }
                        }}
                      >
                        <div className="admin-order-card__top">
                          <div>
                            <div className="admin-order-id">#{idShort}</div>
                            <h3>{order.user?.name || '—'}</h3>
                            <p>{order.user?.email || '—'}</p>
                          </div>
                          <div className={`admin-status-pill tone-${getStatusTone(status)}`}>
                            {t(`orderStatuses.${status}`, { defaultValue: status })}
                          </div>
                        </div>

                        <div className="admin-order-grid admin-order-grid--compact">
                          <div>
                            <span>{labels.orderSum}</span>
                            <strong>{formatPrice(order.totalPrice)}</strong>
                          </div>
                          <div>
                            <span>{labels.items}</span>
                            <strong>{itemsCount}</strong>
                          </div>
                          <div>
                            <span>{labels.payment}</span>
                            <strong>{order.isPaid ? (isRu ? 'Оплачен' : 'Paid') : (isRu ? 'Ожидает' : 'Pending')}</strong>
                          </div>
                          <div>
                            <span>{labels.orderCreated}</span>
                            <strong>{new Date(order.createdAt).toLocaleDateString()}</strong>
                          </div>
                        </div>

                        {order.customerNote ? <div className="admin-order-note admin-order-note--customer">{order.customerNote}</div> : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </article>

            <article className="admin-panel admin-order-detail-panel">
              {!selectedOrder ? (
                <div className="admin-empty-state">{labels.emptyOrders}</div>
              ) : (
                <>
                  <div className="admin-panel-head admin-panel-head--stack">
                    <div>
                      <h2>{labels.orderDetails}</h2>
                      <p>{isRu ? `Заказ #${String(selectedOrder._id).slice(-6)} · ${selectedOrder.user?.name || 'Клиент'}` : `Order #${String(selectedOrder._id).slice(-6)} · ${selectedOrder.user?.name || 'Customer'}`}</p>
                    </div>
                    <div className="admin-order-detail__meta">
                      <div className={`admin-status-pill tone-${getStatusTone(String(selectedOrder.status || 'pending'))}`}>
                        {t(`orderStatuses.${selectedOrder.status}`, { defaultValue: selectedOrder.status })}
                      </div>
                      <a href={`/orders/${selectedOrder._id}`} className="btn btn-secondary" target="_blank" rel="noreferrer">
                        <FiExternalLink /> {labels.openOrder}
                      </a>
                    </div>
                  </div>

                  <div className="admin-order-grid">
                    <div>
                      <span>{labels.customer}</span>
                      <strong>{selectedOrder.user?.name || '—'}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <strong>{selectedOrder.user?.email || '—'}</strong>
                    </div>
                    <div>
                      <span>{labels.orderSum}</span>
                      <strong>{formatPrice(selectedOrder.totalPrice)}</strong>
                    </div>
                    <div>
                      <span>{labels.delivery}</span>
                      <strong>{selectedOrder.deliveryWindow || '—'}</strong>
                    </div>
                  </div>

                  <div className="admin-order-actions admin-order-actions--status">
                    {['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((nextStatus) => (
                      <button key={nextStatus} type="button" className="btn btn-secondary" onClick={() => setOrderStatus(selectedOrder._id, nextStatus)}>
                        {t(`orderStatuses.${nextStatus}`, { defaultValue: nextStatus })}
                      </button>
                    ))}
                  </div>

                  {selectedOrder.customerNote ? <div className="admin-order-note admin-order-note--customer">{selectedOrder.customerNote}</div> : null}

                  <div className="admin-order-detail-section">
                    <div className="admin-order-detail-section__head">
                      <strong>{labels.timeline}</strong>
                      <span><FiClock /> {Array.isArray(selectedOrder.statusHistory) ? selectedOrder.statusHistory.length : 0}</span>
                    </div>
                    <div className="admin-order-timeline">
                      {(selectedOrder.statusHistory || []).length ? (
                        (selectedOrder.statusHistory || []).slice().reverse().map((entry, idx) => (
                          <div key={`${entry.status}-${entry.at}-${idx}`} className="admin-order-timeline__item">
                            <span className={`admin-order-timeline__dot tone-${getStatusTone(entry.status)}`} />
                            <div>
                              <strong>{t(`orderStatuses.${entry.status}`, { defaultValue: entry.status })}</strong>
                              <p>{entry.note || (isRu ? 'Статус обновлён' : 'Status updated')}</p>
                              <small>{entry.at ? new Date(entry.at).toLocaleString() : '—'}</small>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="admin-empty-state">{labels.noHistory}</div>
                      )}
                    </div>
                  </div>

                  <div className="admin-order-detail-section">
                    <div className="admin-order-detail-section__head">
                      <strong>{labels.files}</strong>
                      <span>{(selectedOrder.serviceItems || []).reduce((acc, item) => acc + (item.files?.length || 0), 0)}</span>
                    </div>
                    {(selectedOrder.serviceItems || []).length ? (
                      <div className="admin-order-service-list">
                        {(selectedOrder.serviceItems || []).map((service, index) => (
                          <div key={`${service.serviceKey}-${index}`} className="admin-order-service-card">
                            <div className="admin-order-service-card__head">
                              <strong>{service.serviceTitle}</strong>
                              <span>{formatPrice(service.price)}</span>
                            </div>
                            <p>{service.files?.length || 0} {isRu ? 'файлов' : 'files'} · {service.options?.copies || 1} {isRu ? 'копий' : 'copies'}</p>
                            <ul>
                              {(service.files || []).slice(0, 5).map((file) => (
                                <li key={String(file.fileId || file.url || file.originalName)}>
                                  {file.url ? <a href={file.url} target="_blank" rel="noreferrer">{file.originalName}</a> : <span>{file.originalName}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="admin-empty-state">{isRu ? 'В этом заказе нет загруженных файлов.' : 'This order has no uploaded files.'}</div>
                    )}
                  </div>

                  <div className="admin-order-footer">
                    <textarea
                      rows="4"
                      value={getOrderField(selectedOrder, 'adminNote')}
                      onChange={(event) => setOrderField(selectedOrder._id, { adminNote: event.target.value })}
                      placeholder={labels.note}
                    />
                    <div className="admin-order-footer__buttons">
                      <button type="button" className="btn btn-primary" onClick={() => saveOrderNote(selectedOrder)}>
                        <FiCheckCircle /> {labels.update}
                      </button>
                      <button type="button" className="btn btn-danger" onClick={() => handleDeleteOrder(selectedOrder._id)}>
                        <FiTrash2 /> {labels.delete}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </article>
          </section>
        ) : null}

        {activeTab === 'categories' ? (
          <section className="admin-grid-layout admin-grid-layout--compact">
            <article className="admin-panel admin-panel--form">
              <div className="admin-panel-head">
                <div>
                  <h2>{labels.createCategory}</h2>
                  <p>{isRu ? 'Держи категории короткими и понятными.' : 'Keep categories short and clear.'}</p>
                </div>
              </div>
              <form className="admin-form-modern" onSubmit={handleCreateCategory}>
                <div className="admin-form-grid two">
                  <label>
                    <span>{labels.nameRu} *</span>
                    <input type="text" value={categoryForm.nameRu} onChange={(event) => setCategoryForm((prev) => ({ ...prev, nameRu: event.target.value }))} />
                  </label>
                  <label>
                    <span>{labels.nameEn} *</span>
                    <input type="text" value={categoryForm.nameEn} onChange={(event) => setCategoryForm((prev) => ({ ...prev, nameEn: event.target.value }))} />
                  </label>
                </div>
                <label>
                  <span>{labels.key} *</span>
                  <input type="text" value={categoryForm.key} onChange={(event) => setCategoryForm((prev) => ({ ...prev, key: event.target.value }))} placeholder={autoCategoryKey || 'laptops'} />
                </label>
                <button type="submit" className="btn btn-primary" disabled={createCategoryMutation.isLoading}>
                  <FiLayers /> {createCategoryMutation.isLoading ? labels.saving : labels.save}
                </button>
              </form>
            </article>

            <article className="admin-panel">
              <div className="admin-panel-head">
                <div>
                  <h2>{labels.categoriesTitle}</h2>
                  <p>{categories.length} {isRu ? 'категорий в каталоге' : 'categories in the catalog'}</p>
                </div>
              </div>
              {categories.length === 0 ? (
                <div className="admin-empty-state">{labels.emptyCategories}</div>
              ) : (
                <div className="admin-category-list">
                  {categories.map((category) => (
                    <article key={category._id} className="admin-category-card">
                      <div>
                        <strong>{isRu ? (category.nameRu || category.name || category.key) : (category.nameEn || category.name || category.key)}</strong>
                        <span>{category.key}</span>
                      </div>
                      <button type="button" className="admin-icon-btn" onClick={() => handleDeleteCategory(category._id)} aria-label={labels.delete}>
                        <FiTrash2 />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        ) : null}
      </div>
    </div>
  );
}
