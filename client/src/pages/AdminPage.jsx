import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  FiArchive,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiEdit3,
  FiEye,
  FiLayers,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShoppingBag,
  FiTag,
  FiTrash2,
  FiTruck,
  FiXCircle,
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
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const statusTone = {
  pending: 'warn',
  confirmed: 'info',
  processing: 'info',
  shipped: 'info',
  delivered: 'ok',
  cancelled: 'danger',
};

const statusFlow = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const paymentLabels = {
  stripe_card: 'Stripe',
  card: 'Stripe',
  cash: 'Cash',
};

const emptyProduct = {
  name: '',
  brand: '',
  price: '',
  discount: 0,
  stock: 10,
  category: '',
  imageUrls: '',
  videoUrl: '',
  description: '',
  tags: '',
  isFeatured: false,
};

function normalizeProductItems(data) {
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function normalizeCategoryItems(data) {
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function normalizeOrderItems(data) {
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { i18n, t } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');

  const text = useMemo(() => (
    isRu ? {
      title: 'Админ-панель Jola',
      subtitle: 'Управление магазином: товары, заказы, категории и контроль оплаты в одном понятном интерфейсе.',
      refresh: 'Обновить',
      products: 'Товары',
      orders: 'Заказы',
      categories: 'Категории',
      dashboard: 'Сводка',
      newProduct: 'Создание товара',
      productList: 'Каталог товаров',
      productHint: 'Заполните основные данные, добавьте изображения и сразу отправьте товар в каталог.',
      productListHint: 'Быстрый контроль цены, остатка, скидки и удаления.',
      name: 'Название',
      brand: 'Бренд',
      price: 'Цена',
      discount: 'Скидка',
      stock: 'Остаток',
      category: 'Категория',
      images: 'Изображения',
      video: 'Видео-обзор',
      description: 'Описание',
      tags: 'Теги',
      featured: 'Показывать как хит',
      save: 'Сохранить',
      saving: 'Сохранение...',
      delete: 'Удалить',
      emptyProducts: 'Товаров пока нет.',
      createCategory: 'Создание категории',
      categoryList: 'Список категорий',
      key: 'Ключ',
      nameRu: 'Название RU',
      nameEn: 'Название EN',
      emptyCategories: 'Категорий пока нет.',
      fillRequired: 'Заполните обязательные поля.',
      confirmDeleteProduct: 'Удалить этот товар?',
      confirmDeleteOrder: 'Удалить этот заказ?',
      confirmDeleteCategory: 'Удалить эту категорию?',
      productCreated: 'Товар добавлен.',
      productDeleted: 'Товар удалён.',
      categoryCreated: 'Категория добавлена.',
      categoryDeleted: 'Категория удалена.',
      orderUpdated: 'Заказ обновлён.',
      orderDeleted: 'Заказ удалён.',
      orderPanel: 'Управление заказами',
      orderHint: 'Слева список заказов, справа детали выбранного заказа. Быстро меняйте статус, оплату и заметку администратора.',
      searchOrder: 'Поиск по номеру, клиенту, email, городу',
      all: 'Все',
      active: 'Активные',
      paid: 'Оплаченные',
      delivered: 'Доставленные',
      cancelled: 'Отменённые',
      newest: 'Сначала новые',
      oldest: 'Сначала старые',
      totalHigh: 'Сумма: выше',
      totalLow: 'Сумма: ниже',
      totalOrders: 'Всего заказов',
      revenue: 'Оборот',
      activeOrders: 'Активные',
      productsCount: 'Товаров',
      noOrders: 'Заказов не найдено.',
      customer: 'Клиент',
      payment: 'Оплата',
      shipping: 'Доставка',
      items: 'Позиции',
      note: 'Заметка администратора',
      saveNote: 'Сохранить заметку',
      open: 'Открыть',
      orderDetails: 'Детали заказа',
      orderTimeline: 'История статусов',
      noTimeline: 'История пока пустая.',
      customerNote: 'Комментарий клиента',
      adminNote: 'Комментарий админа',
      markPaid: 'Отметить оплаченным',
      markUnpaid: 'Снять оплату',
      orderNumber: 'Номер заказа',
      mediaPreview: 'Предпросмотр медиа',
      cover: 'Обложка',
      noImage: 'Нет изображения',
    } : {
      title: 'Jola Admin Panel',
      subtitle: 'Manage products, orders, categories, and payment control from one clear workspace.',
      refresh: 'Refresh',
      products: 'Products',
      orders: 'Orders',
      categories: 'Categories',
      dashboard: 'Overview',
      newProduct: 'Create product',
      productList: 'Product catalog',
      productHint: 'Fill in the product details, add media, and publish it to the catalog.',
      productListHint: 'Quickly control price, stock, discount, and deletion.',
      name: 'Name',
      brand: 'Brand',
      price: 'Price',
      discount: 'Discount',
      stock: 'Stock',
      category: 'Category',
      images: 'Images',
      video: 'Video review',
      description: 'Description',
      tags: 'Tags',
      featured: 'Show as featured',
      save: 'Save',
      saving: 'Saving...',
      delete: 'Delete',
      emptyProducts: 'No products yet.',
      createCategory: 'Create category',
      categoryList: 'Category list',
      key: 'Key',
      nameRu: 'Name RU',
      nameEn: 'Name EN',
      emptyCategories: 'No categories yet.',
      fillRequired: 'Fill in the required fields.',
      confirmDeleteProduct: 'Delete this product?',
      confirmDeleteOrder: 'Delete this order?',
      confirmDeleteCategory: 'Delete this category?',
      productCreated: 'Product created.',
      productDeleted: 'Product deleted.',
      categoryCreated: 'Category created.',
      categoryDeleted: 'Category deleted.',
      orderUpdated: 'Order updated.',
      orderDeleted: 'Order deleted.',
      orderPanel: 'Order management',
      orderHint: 'Orders are on the left and selected order details are on the right. Update status, payment, and admin note quickly.',
      searchOrder: 'Search by number, customer, email, city',
      all: 'All',
      active: 'Active',
      paid: 'Paid',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      newest: 'Newest first',
      oldest: 'Oldest first',
      totalHigh: 'Total: high',
      totalLow: 'Total: low',
      totalOrders: 'Total orders',
      revenue: 'Revenue',
      activeOrders: 'Active',
      productsCount: 'Products',
      noOrders: 'No orders found.',
      customer: 'Customer',
      payment: 'Payment',
      shipping: 'Shipping',
      items: 'Items',
      note: 'Admin note',
      saveNote: 'Save note',
      open: 'Open',
      orderDetails: 'Order details',
      orderTimeline: 'Status history',
      noTimeline: 'No history yet.',
      customerNote: 'Customer note',
      adminNote: 'Admin note',
      markPaid: 'Mark as paid',
      markUnpaid: 'Mark as unpaid',
      orderNumber: 'Order number',
      mediaPreview: 'Media preview',
      cover: 'Cover',
      noImage: 'No image',
    }
  ), [isRu]);

  const [activeTab, setActiveTab] = useState('products');
  const [productForm, setProductForm] = useState(emptyProduct);
  const [categoryForm, setCategoryForm] = useState({ key: '', nameRu: '', nameEn: '' });
  const [orderFilter, setOrderFilter] = useState('active');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState('newest');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderNotes, setOrderNotes] = useState({});

  const { data: productsData, isLoading: productsLoading } = useQuery(
    ['admin-products'],
    () => productService.getProducts({ page: 1, limit: 60, sort: 'newest' })
  );
  const { data: ordersData, isLoading: ordersLoading } = useQuery(
    ['admin-orders'],
    () => orderService.getAllOrders(),
    { refetchInterval: 12000 }
  );
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery(
    ['admin-categories'],
    () => categoryService.getCategories()
  );

  const products = useMemo(() => normalizeProductItems(productsData), [productsData]);
  const orders = useMemo(() => normalizeOrderItems(ordersData), [ordersData]);
  const categories = useMemo(() => normalizeCategoryItems(categoriesData), [categoriesData]);

  const defaultCategory = categories[0]?.key || '';
  const categoryKey = categoryForm.key || slugify(categoryForm.nameEn || categoryForm.nameRu);

  useEffect(() => {
    if (!productForm.category && defaultCategory) {
      setProductForm((prev) => ({ ...prev, category: defaultCategory }));
    }
  }, [defaultCategory, productForm.category]);

  const invalidateAll = () => {
    queryClient.invalidateQueries(['admin-products']);
    queryClient.invalidateQueries(['admin-orders']);
    queryClient.invalidateQueries(['admin-categories']);
  };

  const createProduct = useMutation((payload) => productService.createProduct(payload), {
    onSuccess: () => {
      toast.success(text.productCreated);
      queryClient.invalidateQueries(['admin-products']);
      setProductForm({ ...emptyProduct, category: defaultCategory });
    },
    onError: (error) => toast.error(error?.message || 'Error'),
  });

  const deleteProduct = useMutation((id) => productService.deleteProduct(id), {
    onSuccess: () => {
      toast.success(text.productDeleted);
      queryClient.invalidateQueries(['admin-products']);
    },
    onError: (error) => toast.error(error?.message || 'Error'),
  });

  const createCategory = useMutation((payload) => categoryService.createCategory(payload), {
    onSuccess: () => {
      toast.success(text.categoryCreated);
      queryClient.invalidateQueries(['admin-categories']);
      setCategoryForm({ key: '', nameRu: '', nameEn: '' });
    },
    onError: (error) => toast.error(error?.message || 'Error'),
  });

  const deleteCategory = useMutation((id) => categoryService.deleteCategory(id), {
    onSuccess: () => {
      toast.success(text.categoryDeleted);
      queryClient.invalidateQueries(['admin-categories']);
    },
    onError: (error) => toast.error(error?.message || 'Error'),
  });

  const updateOrder = useMutation(({ id, body }) => orderService.updateOrderStatus(id, body), {
    onSuccess: () => {
      toast.success(text.orderUpdated);
      queryClient.invalidateQueries(['admin-orders']);
    },
    onError: (error) => toast.error(error?.message || 'Error'),
  });

  const deleteOrder = useMutation((id) => orderService.deleteOrder(id), {
    onSuccess: () => {
      toast.success(text.orderDeleted);
      queryClient.invalidateQueries(['admin-orders']);
    },
    onError: (error) => toast.error(error?.message || 'Error'),
  });

  const stats = useMemo(() => {
    const activeOrders = orders.filter((order) => ['pending', 'confirmed', 'processing', 'shipped'].includes(order.status)).length;
    const revenue = orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
    return {
      products: products.length,
      orders: orders.length,
      revenue,
      activeOrders,
    };
  }, [orders, products]);

  const productImages = useMemo(() => String(productForm.imageUrls || '')
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12), [productForm.imageUrls]);

  const categoryName = (key) => {
    const found = categories.find((category) => category.key === key || category.name === key);
    if (!found) return key || '—';
    return isRu ? (found.nameRu || found.name || found.key) : (found.nameEn || found.name || found.key);
  };

  const orderNumber = (order) => order?.orderNumber || `JOLA-${String(order?._id || '').slice(-6).toUpperCase()}`;

  const orderStatusLabel = (status) => t(`orderStatuses.${status}`, { defaultValue: status });

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    let next = [...orders];

    if (orderFilter === 'active') {
      next = next.filter((order) => ['pending', 'confirmed', 'processing', 'shipped'].includes(order.status));
    }
    if (orderFilter === 'paid') {
      next = next.filter((order) => Boolean(order.isPaid));
    }
    if (orderFilter === 'delivered') {
      next = next.filter((order) => order.status === 'delivered');
    }
    if (orderFilter === 'cancelled') {
      next = next.filter((order) => order.status === 'cancelled');
    }

    if (query) {
      next = next.filter((order) => [
        orderNumber(order),
        order._id,
        order.user?.name,
        order.user?.email,
        order.user?.phone,
        order.shippingAddress?.city,
        order.shippingAddress?.street,
        order.customerNote,
        order.adminNote,
      ].map((value) => String(value || '').toLowerCase()).join(' ').includes(query));
    }

    next.sort((a, b) => {
      if (orderSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (orderSort === 'total-high') return Number(b.totalPrice || 0) - Number(a.totalPrice || 0);
      if (orderSort === 'total-low') return Number(a.totalPrice || 0) - Number(b.totalPrice || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return next;
  }, [orderFilter, orderSearch, orderSort, orders]);

  const selectedOrder = useMemo(() => (
    filteredOrders.find((order) => String(order._id) === String(selectedOrderId)) || filteredOrders[0] || null
  ), [filteredOrders, selectedOrderId]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId('');
      return;
    }
    if (!filteredOrders.some((order) => String(order._id) === String(selectedOrderId))) {
      setSelectedOrderId(String(filteredOrders[0]._id));
    }
  }, [filteredOrders, selectedOrderId]);

  const updateProductField = (event) => {
    const { name, value, checked, type } = event.target;
    setProductForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const submitProduct = (event) => {
    event.preventDefault();
    if (!productForm.name || !productForm.brand || !productForm.price || !productForm.category || !productForm.description || !productForm.imageUrls) {
      toast.error(text.fillRequired);
      return;
    }

    createProduct.mutate({
      name: productForm.name,
      brand: productForm.brand,
      price: Number(productForm.price),
      discount: Number(productForm.discount || 0),
      stock: Number(productForm.stock || 0),
      category: productForm.category,
      imageUrls: productForm.imageUrls,
      videoUrl: productForm.videoUrl,
      description: productForm.description,
      tags: productForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      isFeatured: Boolean(productForm.isFeatured),
    });
  };

  const submitCategory = (event) => {
    event.preventDefault();
    const payload = {
      key: categoryKey,
      nameRu: categoryForm.nameRu.trim(),
      nameEn: categoryForm.nameEn.trim(),
    };
    if (!payload.key || !payload.nameRu || !payload.nameEn) {
      toast.error(text.fillRequired);
      return;
    }
    createCategory.mutate(payload);
  };

  const removeProduct = (id) => {
    if (window.confirm(text.confirmDeleteProduct)) deleteProduct.mutate(id);
  };

  const removeCategory = (id) => {
    if (window.confirm(text.confirmDeleteCategory)) deleteCategory.mutate(id);
  };

  const removeOrder = (id) => {
    if (window.confirm(text.confirmDeleteOrder)) deleteOrder.mutate(id);
  };

  const setOrderStatus = (order, status) => {
    updateOrder.mutate({ id: order._id, body: { status } });
  };

  const setOrderPaid = (order, value) => {
    updateOrder.mutate({ id: order._id, body: { isPaid: value } });
  };

  const saveOrderNote = (order) => {
    updateOrder.mutate({
      id: order._id,
      body: { adminNote: String(orderNotes[order._id] ?? order.adminNote ?? '').slice(0, 500) },
    });
  };

  const renderProducts = () => (
    <section className="admin-workspace admin-workspace--products">
      <article className="admin-panel admin-panel--form">
        <div className="admin-panel__head">
          <div>
            <span><FiPlus /> {text.products}</span>
            <h2>{text.newProduct}</h2>
            <p>{text.productHint}</p>
          </div>
        </div>

        <form className="admin-form" onSubmit={submitProduct}>
          <div className="admin-form__grid admin-form__grid--2">
            <label>
              <span>{text.name} *</span>
              <input name="name" value={productForm.name} onChange={updateProductField} />
            </label>
            <label>
              <span>{text.brand} *</span>
              <input name="brand" value={productForm.brand} onChange={updateProductField} />
            </label>
          </div>

          <div className="admin-form__grid admin-form__grid--4">
            <label>
              <span>{text.price} *</span>
              <input type="number" min="0" name="price" value={productForm.price} onChange={updateProductField} />
            </label>
            <label>
              <span>{text.discount}</span>
              <input type="number" min="0" max="99" name="discount" value={productForm.discount} onChange={updateProductField} />
            </label>
            <label>
              <span>{text.stock}</span>
              <input type="number" min="0" name="stock" value={productForm.stock} onChange={updateProductField} />
            </label>
            <label>
              <span>{text.category} *</span>
              <select name="category" value={productForm.category} onChange={updateProductField}>
                <option value="">{isRu ? 'Выберите' : 'Choose'}</option>
                {categories.map((category) => (
                  <option key={category._id || category.key} value={category.key}>
                    {isRu ? (category.nameRu || category.name || category.key) : (category.nameEn || category.name || category.key)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>{text.images} *</span>
            <textarea
              name="imageUrls"
              rows={4}
              value={productForm.imageUrls}
              onChange={updateProductField}
              placeholder={isRu ? 'Одна ссылка на строку или через запятую' : 'One URL per line or comma-separated'}
            />
          </label>

          {productImages.length > 0 ? (
            <div className="admin-media-preview">
              <div className="admin-media-preview__title">
                <strong>{text.mediaPreview}</strong>
                <span>{productImages.length}</span>
              </div>
              <div className="admin-media-preview__grid">
                {productImages.map((src, index) => (
                  <div className="admin-media-preview__item" key={`${src}-${index}`}>
                    <img src={src} alt={`preview-${index + 1}`} />
                    <span>{index === 0 ? text.cover : `#${index + 1}`}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <label>
            <span>{text.video}</span>
            <input name="videoUrl" value={productForm.videoUrl} onChange={updateProductField} placeholder="https://" />
          </label>

          <label>
            <span>{text.description} *</span>
            <textarea name="description" rows={5} value={productForm.description} onChange={updateProductField} />
          </label>

          <div className="admin-form__grid admin-form__grid--2">
            <label>
              <span>{text.tags}</span>
              <input name="tags" value={productForm.tags} onChange={updateProductField} placeholder="premium, new, sale" />
            </label>
            <label className="admin-check">
              <input type="checkbox" name="isFeatured" checked={productForm.isFeatured} onChange={updateProductField} />
              <span>{text.featured}</span>
            </label>
          </div>

          <button className="btn btn-primary admin-submit" type="submit" disabled={createProduct.isLoading}>
            <FiPlus /> {createProduct.isLoading ? text.saving : text.save}
          </button>
        </form>
      </article>

      <article className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <span><FiPackage /> {text.productList}</span>
            <h2>{text.productList}</h2>
            <p>{text.productListHint}</p>
          </div>
        </div>

        {products.length ? (
          <div className="admin-product-list">
            {products.map((product) => (
              <article className="admin-product-card" key={product._id}>
                {product.images?.[0] ? <img src={product.images[0]} alt={product.name} /> : <div className="admin-product-card__empty">{text.noImage}</div>}
                <div className="admin-product-card__body">
                  <div className="admin-product-card__top">
                    <div>
                      <h3>{product.brand} {product.name}</h3>
                      <p>{categoryName(product.category)}</p>
                    </div>
                    <button type="button" className="admin-danger-icon" onClick={() => removeProduct(product._id)} aria-label={text.delete}>
                      <FiTrash2 />
                    </button>
                  </div>
                  <div className="admin-product-card__meta">
                    <span>{formatPrice(product.price)}</span>
                    <span>{text.stock}: {product.stock}</span>
                    <span>{text.discount}: {product.discount || 0}%</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="admin-empty">{text.emptyProducts}</div>}
      </article>
    </section>
  );

  const renderOrders = () => (
    <section className="admin-orders-layout">
      <article className="admin-panel admin-orders-main">
        <div className="admin-panel__head admin-panel__head--stack">
          <div>
            <span><FiShoppingBag /> {text.orders}</span>
            <h2>{text.orderPanel}</h2>
            <p>{text.orderHint}</p>
          </div>
          <div className="admin-order-tools">
            <label className="admin-search">
              <FiSearch />
              <input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder={text.searchOrder} />
            </label>
            <select value={orderSort} onChange={(event) => setOrderSort(event.target.value)}>
              <option value="newest">{text.newest}</option>
              <option value="oldest">{text.oldest}</option>
              <option value="total-high">{text.totalHigh}</option>
              <option value="total-low">{text.totalLow}</option>
            </select>
          </div>
          <div className="admin-filter-row">
            {[
              ['all', text.all],
              ['active', text.active],
              ['paid', text.paid],
              ['delivered', text.delivered],
              ['cancelled', text.cancelled],
            ].map(([key, label]) => (
              <button key={key} type="button" className={orderFilter === key ? 'active' : ''} onClick={() => setOrderFilter(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredOrders.length ? (
          <div className="admin-order-list">
            {filteredOrders.map((order) => {
              const active = String(order._id) === String(selectedOrder?._id);
              const count = Number(order.orderItems?.length || 0) + Number(order.serviceItems?.length || 0);
              return (
                <button
                  type="button"
                  key={order._id}
                  className={active ? 'admin-order-row active' : 'admin-order-row'}
                  onClick={() => setSelectedOrderId(String(order._id))}
                >
                  <span className={`admin-status-dot admin-status-dot--${statusTone[order.status] || 'warn'}`} />
                  <span className="admin-order-row__main">
                    <strong>{orderNumber(order)}</strong>
                    <small>{order.user?.name || order.user?.email || 'Client'} · {count} {text.items.toLowerCase()}</small>
                  </span>
                  <span className="admin-order-row__side">
                    <strong>{formatPrice(order.totalPrice || 0)}</strong>
                    <small>{orderStatusLabel(order.status || 'pending')}</small>
                  </span>
                </button>
              );
            })}
          </div>
        ) : <div className="admin-empty">{text.noOrders}</div>}
      </article>

      <aside className="admin-panel admin-order-detail">
        {selectedOrder ? (
          <>
            <div className="admin-order-detail__head">
              <div>
                <span>{text.orderDetails}</span>
                <h2>{orderNumber(selectedOrder)}</h2>
                <p>{new Date(selectedOrder.createdAt).toLocaleString(isRu ? 'ru-RU' : 'en-US')}</p>
              </div>
              <Link className="admin-detail-link" to={`/orders/${selectedOrder._id}`} target="_blank" rel="noreferrer">
                <FiEye /> {text.open}
              </Link>
            </div>

            <div className="admin-detail-grid">
              <div>
                <small>{text.customer}</small>
                <strong>{selectedOrder.user?.name || '—'}</strong>
                <span>{selectedOrder.user?.email || selectedOrder.user?.phone || '—'}</span>
              </div>
              <div>
                <small>{text.payment}</small>
                <strong>{paymentLabels[selectedOrder.paymentMethod] || selectedOrder.paymentMethod || '—'}</strong>
                <span>{selectedOrder.isPaid ? (isRu ? 'Оплачен' : 'Paid') : (isRu ? 'Не оплачен' : 'Unpaid')}</span>
              </div>
              <div>
                <small>{text.shipping}</small>
                <strong>{selectedOrder.shippingAddress?.city || '—'}</strong>
                <span>{selectedOrder.shippingAddress?.street || '—'}</span>
              </div>
              <div>
                <small>{text.items}</small>
                <strong>{formatPrice(selectedOrder.totalPrice || 0)}</strong>
                <span>{selectedOrder.deliveryWindow || '—'}</span>
              </div>
            </div>

            <div className="admin-status-actions">
              {statusFlow.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={selectedOrder.status === status ? 'active' : ''}
                  onClick={() => setOrderStatus(selectedOrder, status)}
                  disabled={updateOrder.isLoading}
                >
                  {orderStatusLabel(status)}
                </button>
              ))}
            </div>

            <div className="admin-payment-actions">
              <button type="button" className={selectedOrder.isPaid ? 'active' : ''} onClick={() => setOrderPaid(selectedOrder, true)} disabled={updateOrder.isLoading}>
                <FiCheckCircle /> {text.markPaid}
              </button>
              <button type="button" onClick={() => setOrderPaid(selectedOrder, false)} disabled={updateOrder.isLoading}>
                <FiXCircle /> {text.markUnpaid}
              </button>
            </div>

            <div className="admin-note-box">
              <label>
                <span>{text.note}</span>
                <textarea
                  rows={4}
                  value={orderNotes[selectedOrder._id] ?? selectedOrder.adminNote ?? ''}
                  onChange={(event) => setOrderNotes((prev) => ({ ...prev, [selectedOrder._id]: event.target.value }))}
                />
              </label>
              <button type="button" className="btn btn-primary" onClick={() => saveOrderNote(selectedOrder)} disabled={updateOrder.isLoading}>
                <FiEdit3 /> {text.saveNote}
              </button>
            </div>

            {selectedOrder.customerNote ? (
              <div className="admin-message-box">
                <strong>{text.customerNote}</strong>
                <p>{selectedOrder.customerNote}</p>
              </div>
            ) : null}

            <div className="admin-order-items">
              {[...(selectedOrder.orderItems || []), ...(selectedOrder.serviceItems || [])].map((item, index) => (
                <div key={`${item._id || item.product || item.serviceKey}-${index}`}>
                  <span>{item.name || item.serviceTitle || item.serviceKey}</span>
                  <strong>{formatPrice(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
                </div>
              ))}
            </div>

            <div className="admin-timeline">
              <h3>{text.orderTimeline}</h3>
              {selectedOrder.statusHistory?.length ? selectedOrder.statusHistory.map((item, index) => (
                <div className="admin-timeline__item" key={`${item.status}-${item.at}-${index}`}>
                  <span className={`admin-status-dot admin-status-dot--${statusTone[item.status] || 'warn'}`} />
                  <div>
                    <strong>{orderStatusLabel(item.status)}</strong>
                    <small>{item.at ? new Date(item.at).toLocaleString(isRu ? 'ru-RU' : 'en-US') : '—'}</small>
                    {item.note ? <p>{item.note}</p> : null}
                  </div>
                </div>
              )) : <p className="admin-muted">{text.noTimeline}</p>}
            </div>

            <button type="button" className="admin-delete-order" onClick={() => removeOrder(selectedOrder._id)} disabled={deleteOrder.isLoading}>
              <FiTrash2 /> {text.delete}
            </button>
          </>
        ) : <div className="admin-empty">{text.noOrders}</div>}
      </aside>
    </section>
  );

  const renderCategories = () => (
    <section className="admin-workspace admin-workspace--categories">
      <article className="admin-panel admin-panel--form">
        <div className="admin-panel__head">
          <div>
            <span><FiTag /> {text.categories}</span>
            <h2>{text.createCategory}</h2>
            <p>{isRu ? 'Категории помогают держать каталог понятным и быстрым для клиента.' : 'Categories keep the catalog clear and fast for customers.'}</p>
          </div>
        </div>

        <form className="admin-form" onSubmit={submitCategory}>
          <label>
            <span>{text.nameRu} *</span>
            <input value={categoryForm.nameRu} onChange={(event) => setCategoryForm((prev) => ({ ...prev, nameRu: event.target.value }))} />
          </label>
          <label>
            <span>{text.nameEn} *</span>
            <input value={categoryForm.nameEn} onChange={(event) => setCategoryForm((prev) => ({ ...prev, nameEn: event.target.value }))} />
          </label>
          <label>
            <span>{text.key} *</span>
            <input value={categoryForm.key || categoryKey} onChange={(event) => setCategoryForm((prev) => ({ ...prev, key: event.target.value }))} />
          </label>
          <button className="btn btn-primary admin-submit" type="submit" disabled={createCategory.isLoading}>
            <FiPlus /> {createCategory.isLoading ? text.saving : text.save}
          </button>
        </form>
      </article>

      <article className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <span><FiLayers /> {text.categoryList}</span>
            <h2>{text.categoryList}</h2>
            <p>{categories.length} {isRu ? 'категорий' : 'categories'}</p>
          </div>
        </div>

        {categories.length ? (
          <div className="admin-category-list">
            {categories.map((category) => (
              <article className="admin-category-card" key={category._id || category.key}>
                <div>
                  <strong>{isRu ? (category.nameRu || category.name || category.key) : (category.nameEn || category.name || category.key)}</strong>
                  <span>{category.key}</span>
                </div>
                <button type="button" className="admin-danger-icon" onClick={() => removeCategory(category._id)} aria-label={text.delete}>
                  <FiTrash2 />
                </button>
              </article>
            ))}
          </div>
        ) : <div className="admin-empty">{text.emptyCategories}</div>}
      </article>
    </section>
  );

  if (productsLoading || ordersLoading || categoriesLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="admin-page">
      <div className="container admin-container">
        <section className="admin-hero">
          <div>
            <div className="admin-kicker"><FiArchive /> {text.dashboard}</div>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <button type="button" className="admin-refresh" onClick={invalidateAll}>
            <FiRefreshCw /> {text.refresh}
          </button>
        </section>

        <section className="admin-stats">
          <article>
            <FiPackage />
            <span>{text.productsCount}</span>
            <strong>{stats.products}</strong>
          </article>
          <article>
            <FiShoppingBag />
            <span>{text.totalOrders}</span>
            <strong>{stats.orders}</strong>
          </article>
          <article>
            <FiBarChart2 />
            <span>{text.revenue}</span>
            <strong>{formatPrice(stats.revenue)}</strong>
          </article>
          <article>
            <FiClock />
            <span>{text.activeOrders}</span>
            <strong>{stats.activeOrders}</strong>
          </article>
        </section>

        <nav className="admin-nav" aria-label="Admin sections">
          {[
            ['products', FiPackage, text.products],
            ['orders', FiShoppingBag, text.orders],
            ['categories', FiLayers, text.categories],
          ].map(([key, Icon, label]) => (
            <button key={key} type="button" className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>
              <Icon /> {label}
            </button>
          ))}
        </nav>

        {activeTab === 'products' ? renderProducts() : null}
        {activeTab === 'orders' ? renderOrders() : null}
        {activeTab === 'categories' ? renderCategories() : null}
      </div>
    </div>
  );
}
