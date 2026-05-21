import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiBell,
  FiBookOpen,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiCopy,
  FiCreditCard,
  FiExternalLink,
  FiFilter,
  FiGift,
  FiGrid,
  FiHeart,
  FiHelpCircle,
  FiHome,
  FiLayers,
  FiLoader,
  FiPackage,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
  FiSettings,
  FiShoppingBag,
  FiSliders,
  FiStar,
  FiTrash2,
  FiTruck,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { telegramMiniApi, setTelegramMiniTokens, getTelegramMiniTokens, createTelegramMiniEventStream } from './api.js';
import { mockBootstrap, mockSession } from './mockData.js';
import {
  configureBackButton,
  configureClosingConfirmation,
  getTelegramWebApp,
  haptic,
  initTelegramChrome,
  isTelegramEnvironment,
  onTelegramEvent,
  openExternalLink,
  setViewportCssVars,
  useTelegramMainButton,
} from './telegram.js';
import { miniStorage } from './storage.js';

const formatMoney = (value) => new Intl.NumberFormat('ru-RU').format(Number(value || 0));
const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const debounce = (fn, ms = 500) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

const baseTabs = [
  { key: 'home', label: 'Главная', icon: FiHome },
  { key: 'catalog', label: 'Каталог', icon: FiGrid },
  { key: 'orders', label: 'Заказы', icon: FiPackage },
  { key: 'promos', label: 'Акции', icon: FiGift },
  { key: 'notifications', label: 'Уведомления', icon: FiBell },
  { key: 'profile', label: 'Профиль', icon: FiUser },
  { key: 'support', label: 'Поддержка', icon: FiHelpCircle },
];

const DEMO_NOTICE = 'Открыто вне Telegram. Работает безопасный демо-режим без доступа к реальным данным.';


const emptyCheckoutDraft = {
  items: [],
  address: { street: '', city: '', zipCode: '', country: '' },
  paymentMethod: 'stripe_card',
  promoCode: '',
  customerNote: '',
  deliveryWindow: '1–2 дня',
};

function SectionHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="tgm-section-header">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actionLabel ? <button type="button" className="tgm-ghost-btn" onClick={onAction}>{actionLabel}</button> : null}
    </div>
  );
}

function Pill({ children, tone = 'default' }) {
  return <span className={`tgm-pill tgm-pill--${tone}`}>{children}</span>;
}

function SkeletonCard({ height = 88 }) {
  return <div className="tgm-skeleton" style={{ height }} />;
}

function ProductCard({ product, onOpen, onToggleFavorite, compact = false }) {
  return (
    <article className={`tgm-product-card ${compact ? 'is-compact' : ''}`}>
      <button type="button" className="tgm-product-card__fav" onClick={() => onToggleFavorite(product)} aria-label="favorite">
        <FiHeart className={product.isFavorite ? 'is-active' : ''} />
      </button>
      <img src={product.photo} alt={product.name} onClick={() => onOpen(product)} />
      <div className="tgm-product-card__content" onClick={() => onOpen(product)}>
        <strong>{product.name}</strong>
        <span>{product.category || 'товар'}</span>
        <div className="tgm-product-card__price">
          <strong>{formatMoney(product.price)} ₸</strong>
          {product.oldPrice ? <small>{formatMoney(product.oldPrice)} ₸</small> : null}
        </div>
        <div className="tgm-product-card__meta">
          <Pill tone={product.stock <= 0 ? 'danger' : product.stock <= 5 ? 'warn' : 'success'}>{product.availability}</Pill>
          {product.discountPercent ? <Pill tone="accent">-{product.discountPercent}%</Pill> : null}
        </div>
      </div>
    </article>
  );
}

function OrderCard({ order, onOpen, onRepeat }) {
  return (
    <article className="tgm-order-card">
      <div className="tgm-order-card__head">
        <div>
          <strong>{order.number}</strong>
          <span>{formatDate(order.date)}</span>
        </div>
        <Pill tone={/достав/.test(order.status) ? 'success' : /отмен/.test(order.status) ? 'danger' : 'accent'}>{order.status}</Pill>
      </div>
      <div className="tgm-order-card__body">
        <div className="tgm-kv-line"><span>Сумма</span><strong>{formatMoney(order.amount)} ₸</strong></div>
        <div className="tgm-kv-line"><span>Оплата</span><strong>{order.paymentMethod || '—'}</strong></div>
        <div className="tgm-kv-line"><span>Доставка</span><strong>{order.deliveryMethod || '—'}</strong></div>
      </div>
      <div className="tgm-order-card__footer">
        <button type="button" className="tgm-ghost-btn" onClick={() => onOpen(order)}>Открыть</button>
        <button type="button" className="tgm-primary-btn tgm-primary-btn--small" onClick={() => onRepeat(order)}>
          <FiRotateCcw /> Повторить
        </button>
      </div>
    </article>
  );
}

function PromoCard({ promo, selected, onSelect }) {
  return (
    <article className={`tgm-promo-card ${selected ? 'is-selected' : ''}`} onClick={() => onSelect(promo)}>
      <div className="tgm-promo-card__head">
        <small>{promo.code}</small>
        {promo.validNow ? <Pill tone="success">активен</Pill> : <Pill tone="warn">проверить</Pill>}
      </div>
      <strong>{promo.title}</strong>
      <p>{promo.description || 'Персональное предложение для Telegram Mini App'}</p>
      <div className="tgm-promo-card__foot">
        <span>{promo.type === 'percent' ? `${promo.value}%` : `${formatMoney(promo.value)} ₸`}</span>
        {promo.expiresAt ? <em>до {formatDate(promo.expiresAt)}</em> : null}
      </div>
    </article>
  );
}


function NotificationCard({ item }) {
  return (
    <article className={`tgm-note-card tgm-note-card--${item.severity || 'info'}`}>
      <div className="tgm-note-card__head">
        <strong>{item.title}</strong>
        <span>{formatDateTime(item.createdAt)}</span>
      </div>
      <p>{item.body}</p>
      <div className="tgm-note-card__foot">
        <Pill>{item.group || item.type}</Pill>
      </div>
    </article>
  );
}

function CheckoutItemRow({ item, onChangeQuantity, onRemove }) {
  return (
    <article className="tgm-checkout-item">
      <img src={item.image || item.photo || '/placeholder-product.svg'} alt={item.name} />
      <div className="tgm-checkout-item__content">
        <strong>{item.name}</strong>
        <span>{formatMoney(item.price)} ₸</span>
        <div className="tgm-stepper">
          <button type="button" onClick={() => onChangeQuantity(item.productId || item.id, Math.max(1, Number(item.quantity || 1) - 1))}>−</button>
          <span>{item.quantity}</span>
          <button type="button" onClick={() => onChangeQuantity(item.productId || item.id, Number(item.quantity || 1) + 1)}>+</button>
        </div>
      </div>
      <button type="button" className="tgm-icon-btn" onClick={() => onRemove(item.productId || item.id)} aria-label="Удалить">
        <FiTrash2 />
      </button>
    </article>
  );
}

function MetricCard({ title, value, hint }) {
  return (
    <article className="tgm-stat-card">
      <strong>{value}</strong>
      <span>{title}</span>
      {hint ? <small className="tgm-muted-text">{hint}</small> : null}
    </article>
  );
}

function useDemoMode() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!isTelegramEnvironment() || params.get('demo') === '1') setDemo(true);
  }, []);
  return demo;
}

function useTelegramSession(isDemo) {
  const [state, setState] = useState({ status: 'idle', error: '', config: mockSession.config, profile: mockSession.user.profile, wallet: mockSession.user.wallet });

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      if (isDemo) {
        setTelegramMiniTokens(mockSession);
        setState({ status: 'ready', error: '', config: mockSession.config, profile: mockSession.user.profile, wallet: mockSession.user.wallet });
        return;
      }

      const tg = getTelegramWebApp();
      const initData = tg?.initData || '';
      if (!tg || !initData) {
        setState({ status: 'error', error: 'Откройте приложение из Telegram или включите ?demo=1 для демо.', config: mockSession.config, profile: null, wallet: null });
        return;
      }

      try {
        setState((prev) => ({ ...prev, status: 'loading', error: '' }));
        const data = await telegramMiniApi.createSession(initData);
        if (!mounted) return;
        setTelegramMiniTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken, sessionId: data.sessionId });
        setState({
          status: 'ready',
          error: '',
          config: data.config || mockSession.config,
          profile: data.user?.profile || null,
          wallet: data.user?.wallet || null,
        });
      } catch (error) {
        if (!mounted) return;
        setState({ status: 'error', error: error?.response?.data?.message || error?.message || 'Не удалось открыть Mini App', config: mockSession.config, profile: null, wallet: null });
      }
    };

    bootstrap();
    return () => { mounted = false; };
  }, [isDemo]);

  return state;
}

function buildTabs(permissions) {
  const role = permissions?.role || 'client';
  return ['admin', 'manager', 'observer'].includes(role)
    ? [...baseTabs, { key: 'admin', label: 'Управление', icon: FiSettings }]
    : baseTabs;
}

function useAnalytics(isDemo) {
  const queueRef = useRef([]);
  const flush = async () => {
    const events = queueRef.current.splice(0, queueRef.current.length);
    if (!events.length || isDemo) return;
    try { await telegramMiniApi.trackAnalytics(events); } catch {}
  };
  useEffect(() => {
    const timer = setInterval(flush, 10000);
    const onHide = () => flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, [isDemo]);
  return {
    track(event, screen, payload = {}) {
      queueRef.current.push({ event, screen, payload, at: new Date().toISOString() });
    },
    flush,
  };
}

export default function App() {
  const isDemo = useDemoMode();
  const session = useTelegramSession(isDemo);
  const queryClient = useQueryClient();
  const analytics = useAnalytics(isDemo);
  const [activeTab, setActiveTab] = useState('home');
  const [stack, setStack] = useState([{ type: 'tab', key: 'home' }]);
  const [productSearch, setProductSearch] = useState('');
  const [productSort, setProductSort] = useState('featured');
  const [availability, setAvailability] = useState('');
  const [category, setCategory] = useState('');
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [promoSubtotal, setPromoSubtotal] = useState('39490');
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: { street: '', city: '', zipCode: '', country: '' } });
  const [checkoutDraft, setCheckoutDraft] = useState(emptyCheckoutDraft);
  const [adminDraft, setAdminDraft] = useState(null);
  const [adminPanelTab, setAdminPanelTab] = useState('overview');
  const [uiLoaded, setUiLoaded] = useState(false);
  const revisionsRef = useRef({});

  useEffect(() => {
    miniStorage.getJson('ui-state', null).then((saved) => {
      if (saved?.activeTab) {
        setActiveTab(saved.activeTab);
        setStack([{ type: 'tab', key: saved.activeTab }]);
      }
      if (saved?.catalog) {
        setProductSearch(saved.catalog.search || '');
        setProductSort(saved.catalog.sort || 'featured');
        setAvailability(saved.catalog.availability || '');
        setCategory(saved.catalog.category || '');
      }
      if (saved?.promoSubtotal) setPromoSubtotal(String(saved.promoSubtotal));
      miniStorage.getJson('cart-draft', null).then((draft) => {
        if (draft) {
          setCheckoutDraft((prev) => ({
            ...prev,
            ...draft,
            items: Array.isArray(draft.items) ? draft.items : prev.items,
            address: { ...(prev.address || {}), ...(draft.address || draft.shippingAddress || {}) },
          }));
        }
        setUiLoaded(true);
      });
    });
  }, []);

  useEffect(() => {
    if (!uiLoaded) return;
    miniStorage.setJson('ui-state', {
      activeTab,
      catalog: { search: productSearch, sort: productSort, availability, category },
      promoSubtotal,
    });
    miniStorage.setJson('cart-draft', checkoutDraft);
  }, [uiLoaded, activeTab, productSearch, productSort, availability, category, promoSubtotal, checkoutDraft]);

  useEffect(() => {
    const config = session.config?.settings || mockSession.config.settings;
    const { tg } = initTelegramChrome({
      headerColor: config.theme?.headerColor || 'bg_color',
      backgroundColor: config.theme?.backgroundColor || 'bg_color',
    });
    setViewportCssVars();
    const offViewport = onTelegramEvent('viewportChanged', setViewportCssVars);
    const offTheme = onTelegramEvent('themeChanged', () => {
      applyTheme(tg?.themeParams || {}, config.theme?.brandColor || '#0b5bd3');
      setViewportCssVars();
    });
    const offSettings = onTelegramEvent('settingsButtonClicked', () => {
      if ((session.config?.permissions?.canManageMiniApp || false) || session.config?.permissions?.readOnlyMiniAppAdmin) goTo('admin');
    });
    applyTheme(tg?.themeParams || {}, config.theme?.brandColor || '#0b5bd3');
    if (tg?.SettingsButton) {
      try {
        if ((session.config?.permissions?.canManageMiniApp || false) || session.config?.permissions?.readOnlyMiniAppAdmin) tg.SettingsButton.show();
        else tg.SettingsButton.hide();
      } catch {}
    }
    return () => {
      offViewport();
      offTheme();
      offSettings();
    };
  }, [session.config]);

  const tabs = useMemo(() => buildTabs(session.config?.permissions), [session.config?.permissions]);
  const role = session.config?.permissions?.role || 'client';
  const canManageMiniApp = Boolean(session.config?.permissions?.canManageMiniApp);
  const readOnlyMiniAppAdmin = Boolean(session.config?.permissions?.readOnlyMiniAppAdmin);

  const bootstrapQuery = useQuery(['tgm-bootstrap'], async () => (isDemo ? mockBootstrap : telegramMiniApi.getBootstrap()), {
    enabled: session.status === 'ready',
    staleTime: 10000,
  });
  const configQuery = useQuery(['tgm-config'], async () => (isDemo ? mockSession.config : telegramMiniApi.getConfig()), {
    enabled: session.status === 'ready',
    staleTime: 30000,
  });
  const syncQuery = useQuery(['tgm-sync'], async () => (isDemo ? mockSession.config.sync : telegramMiniApi.getSync()), {
    enabled: session.status === 'ready' && !isDemo && (session.config?.settings?.featureFlags?.realtimeSync !== false),
    refetchInterval: 12000,
    staleTime: 5000,
    onSuccess: (data) => {
      const prev = revisionsRef.current;
      if (!prev.ordersRevision) {
        revisionsRef.current = data || {};
        return;
      }
      if (data?.ordersRevision && data.ordersRevision !== prev.ordersRevision) queryClient.invalidateQueries(['tgm-orders']);
      if (data?.productsRevision && data.productsRevision !== prev.productsRevision) {
        queryClient.invalidateQueries(['tgm-products']);
        queryClient.invalidateQueries(['tgm-bootstrap']);
      }
      if (data?.profileRevision && data.profileRevision !== prev.profileRevision) {
        queryClient.invalidateQueries(['tgm-profile']);
        queryClient.invalidateQueries(['tgm-bootstrap']);
      }
      if (data?.promosRevision && data.promosRevision !== prev.promosRevision) {
        queryClient.invalidateQueries(['tgm-promos']);
        queryClient.invalidateQueries(['tgm-bootstrap']);
      }
      if (data?.settingsRevision && data.settingsRevision !== prev.settingsRevision) {
        queryClient.invalidateQueries(['tgm-config']);
        queryClient.invalidateQueries(['tgm-admin-settings']);
      }
      revisionsRef.current = data || {};
    },
  });

  const productsQuery = useQuery(['tgm-products', productSearch, productSort, availability, category], async () => {
    if (isDemo) return { products: [], filters: { categories: ['одежда', 'обувь'] }, page: 1, limit: 20, total: 0, hasMore: false };
    return telegramMiniApi.getProducts({ search: productSearch, sort: productSort, availability, category, limit: 24 });
  }, {
    enabled: session.status === 'ready' && (activeTab === 'catalog' || stack[stack.length - 1]?.type === 'product'),
    keepPreviousData: true,
  });

  const currentScreen = stack[stack.length - 1] || { type: 'tab', key: activeTab };
  const selectedProductId = currentScreen.type === 'product' ? currentScreen.id : null;
  const selectedOrderId = currentScreen.type === 'order' ? currentScreen.id : null;

  const productDetailQuery = useQuery(['tgm-product', selectedProductId], async () => {
    if (isDemo) return { product: { id: selectedProductId, name: 'Демо товар', price: 14990, oldPrice: 18990, stock: 4, category: 'одежда', availability: 'мало на складе', photo: '/placeholder-product.svg', gallery: ['/placeholder-product.svg'], discountPercent: 20, isFavorite: false }, description: 'Демо описание', brand: 'Jola', tags: ['demo'], recommendations: [] };
    return telegramMiniApi.getProductDetails(selectedProductId);
  }, {
    enabled: Boolean(selectedProductId) && session.status === 'ready',
    onSuccess: () => {
      if (!isDemo && selectedProductId) telegramMiniApi.markProductViewed(selectedProductId).catch(() => {});
    },
  });

  const ordersQuery = useQuery(['tgm-orders', currentScreen.type === 'tab' ? activeTab : 'detail'], async () => {
    if (isDemo) return { orders: [] };
    return telegramMiniApi.getOrders({ limit: 30 });
  }, {
    enabled: session.status === 'ready' && (activeTab === 'orders' || currentScreen.type === 'order' || activeTab === 'home'),
  });

  const orderDetailQuery = useQuery(['tgm-order', selectedOrderId], async () => {
    if (isDemo) return { order: { id: selectedOrderId, number: 'ORD-DEMO', amount: 39490, status: 'в обработке', date: new Date().toISOString(), paymentMethod: 'Kaspi', deliveryMethod: 'курьер', timeline: [] }, items: [], shippingAddress: {}, customerNote: '', adminNote: '' };
    return telegramMiniApi.getOrderDetails(selectedOrderId);
  }, { enabled: Boolean(selectedOrderId) && session.status === 'ready' });

  const notificationsQuery = useQuery(['tgm-notifications'], async () => (isDemo ? { notifications: [] } : telegramMiniApi.getNotifications()), {
    enabled: session.status === 'ready' && (activeTab === 'notifications' || activeTab === 'home'),
  });

  const supportQuery = useQuery(['tgm-support'], async () => (isDemo ? { support: mockSession.config.settings.support } : telegramMiniApi.getSupport()), {
    enabled: session.status === 'ready' && activeTab === 'support',
    staleTime: 60000,
  });

  const profileQuery = useQuery(['tgm-profile'], async () => (isDemo ? { profile: mockSession.user.profile, wallet: mockSession.user.wallet, address: {} } : telegramMiniApi.getProfile()), {
    enabled: session.status === 'ready' && activeTab === 'profile',
    staleTime: 15000,
    onSuccess: (data) => {
      setProfileForm((prev) => ({
        ...prev,
        name: data?.profile?.name || '',
        phone: data?.profile?.phone || '',
        address: data?.address || prev.address,
      }));
    },
  });

  const promosQuery = useQuery(['tgm-promos', promoSubtotal], async () => (isDemo ? { promoCodes: [] } : telegramMiniApi.getPromoCodes({ subtotal: Number(promoSubtotal || 0) })), {
    enabled: session.status === 'ready' && (activeTab === 'promos' || activeTab === 'home'),
  });

  const adminSettingsQuery = useQuery(['tgm-admin-settings'], async () => (isDemo ? { settings: mockSession.config.settings } : telegramMiniApi.getAdminSettings()), {
    enabled: session.status === 'ready' && activeTab === 'admin' && (canManageMiniApp || readOnlyMiniAppAdmin),
    onSuccess: (data) => {
      if (!adminDraft) setAdminDraft(data?.settings || null);
    },
  });
  const adminOverviewQuery = useQuery(['tgm-admin-overview'], async () => (isDemo ? { overview: { activeSessions: 4, orders24h: 7, delivered24h: 3, openOrders: 9, totalProducts: 48, lowStockProducts: 4, totalPromoCodes: 5, conversion24h: 32.4, warnings24h: 2, errors24h: 0 }, recentEvents: [] } : telegramMiniApi.getAdminOverview()), {
    enabled: session.status === 'ready' && activeTab === 'admin' && (canManageMiniApp || readOnlyMiniAppAdmin),
    staleTime: 15000,
  });
  const checkoutPreviewQuery = useQuery(['tgm-checkout-preview', JSON.stringify(checkoutDraft)], async () => {
    if (isDemo) {
      const items = (checkoutDraft.items || []).map((item) => ({ ...item, name: item.name || 'Демо товар', price: Number(item.price || 14990), image: item.image || '/placeholder-product.svg' }));
      const itemsPrice = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
      return {
        items,
        address: checkoutDraft.address,
        paymentMethod: checkoutDraft.paymentMethod,
        customerNote: checkoutDraft.customerNote,
        promo: checkoutDraft.promoCode ? { code: checkoutDraft.promoCode, title: 'Демо промокод', discount: 1500 } : null,
        totals: { itemsPrice, promoDiscount: checkoutDraft.promoCode ? 1500 : 0, shippingPrice: 300, taxPrice: Math.round(itemsPrice * 0.08), totalPrice: Math.max(0, itemsPrice - (checkoutDraft.promoCode ? 1500 : 0) + 300 + Math.round(itemsPrice * 0.08)) },
        paymentOptions: [{ key: 'stripe_card', label: 'Карта', enabled: true }, { key: 'cash', label: 'Наличные', enabled: true }, { key: 'kaspi', label: 'Kaspi', enabled: true }],
      };
    }
    return telegramMiniApi.previewCheckout(checkoutDraft);
  }, {
    enabled: session.status === 'ready' && currentScreen.type === 'checkout' && (checkoutDraft.items || []).length > 0,
    keepPreviousData: true,
    staleTime: 3000,
  });

  const favoriteMutation = useMutation(async ({ productId, isFavorite }) => {
    if (isDemo) return { favoriteProductIds: [] };
    return isFavorite ? telegramMiniApi.removeFavorite(productId) : telegramMiniApi.addFavorite(productId);
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries(['tgm-products']);
      queryClient.invalidateQueries(['tgm-product']);
      queryClient.invalidateQueries(['tgm-bootstrap']);
      haptic('selection');
    },
  });

  const profileMutation = useMutation(async (payload) => (isDemo ? { profile: payload, wallet: mockSession.user.wallet, address: payload.address } : telegramMiniApi.updateProfile(payload)), {
    onSuccess: () => {
      queryClient.invalidateQueries(['tgm-profile']);
      queryClient.invalidateQueries(['tgm-bootstrap']);
      analytics.track('profile_saved', 'profile');
      haptic('notification', 'success');
    },
  });

  const promoPreviewMutation = useMutation(async ({ code, subtotal }) => (isDemo ? { discount: 1500, finalAmount: Number(subtotal || 0) - 1500, promoCode: { code, title: 'Демо промо' } } : telegramMiniApi.previewPromoCode({ code, subtotal })), {
    onSuccess: () => {
      analytics.track('promo_checked', 'promos', { code: selectedPromo?.code || '' });
      haptic('notification', 'success');
    },
  });

  const repeatOrderMutation = useMutation(async (orderId) => (isDemo ? { draft: { sourceOrderId: orderId, items: [] } } : telegramMiniApi.repeatOrder(orderId)), {
    onSuccess: async (data) => {
      const nextDraft = {
        ...emptyCheckoutDraft,
        ...(data?.draft || {}),
        items: Array.isArray(data?.draft?.items) ? data.draft.items : [],
        address: { ...emptyCheckoutDraft.address, ...(data?.draft?.shippingAddress || data?.draft?.address || {}) },
        promoCode: data?.draft?.promoCode || '',
      };
      setCheckoutDraft(nextDraft);
      await miniStorage.setJson('cart-draft', nextDraft);
      analytics.track('order_repeat', 'orders', { orderId: data?.draft?.sourceOrderId || '' });
      setStack((prev) => [...prev.filter((item) => item.type !== 'checkout'), { type: 'checkout' }]);
      haptic('notification', 'success');
    },
  });

  const checkoutCommitMutation = useMutation(async (payload) => (isDemo
    ? { order: { id: 'demo-order', number: 'ORD-DEMO', amount: 39490, status: 'создан', paymentMethod: payload.paymentMethod || 'stripe_card', isPaid: false }, orderId: 'demo-order', paymentSession: payload.paymentMethod === 'cash' ? null : { provider: payload.paymentMethod || 'stripe_card', mode: 'redirect', url: 'https://example.com/pay' } }
    : telegramMiniApi.commitCheckout(payload)), {
    onSuccess: async (data) => {
      setCheckoutDraft(emptyCheckoutDraft);
      await miniStorage.setJson('cart-draft', emptyCheckoutDraft);
      queryClient.invalidateQueries(['tgm-orders']);
      queryClient.invalidateQueries(['tgm-bootstrap']);
      analytics.track('checkout_completed', 'checkout', { orderId: data?.orderId || data?.order?.id || '' });
      if (data?.orderId || data?.order?.id) setStack([{ type: 'tab', key: 'orders' }, { type: 'order', id: data.orderId || data.order.id }]);
      if (data?.paymentSession?.url) openExternalLink(data.paymentSession.url);
      haptic('notification', 'success');
    },
  });

  const paymentSessionMutation = useMutation(async (orderId) => (isDemo ? { paymentSession: { provider: 'stripe_card', mode: 'redirect', url: 'https://example.com/pay' } } : telegramMiniApi.createOrderPaymentSession(orderId)), {
    onSuccess: (data) => {
      analytics.track('payment_session_created', 'order_detail', { orderId: selectedOrderId || '' });
      if (data?.paymentSession?.url) openExternalLink(data.paymentSession.url);
      haptic('notification', 'success');
    },
  });

  const adminSettingsMutation = useMutation(async (payload) => (isDemo ? { settings: payload } : telegramMiniApi.updateAdminSettings(payload)), {
    onSuccess: () => {
      queryClient.invalidateQueries(['tgm-admin-settings']);
      queryClient.invalidateQueries(['tgm-config']);
      haptic('notification', 'success');
    },
  });


  const openProduct = (product) => {
    setStack((prev) => [...prev.filter((item, index) => index === 0 || item.type !== 'product'), { type: 'product', id: product.id }]);
    analytics.track('open_product', 'catalog', { productId: product.id });
    haptic('selection');
  };
  const openOrder = (order) => {
    setStack((prev) => [...prev.filter((item, index) => index === 0 || item.type !== 'order'), { type: 'order', id: order.id }]);
    analytics.track('open_order', 'orders', { orderId: order.id });
    haptic('selection');
  };
  const openCheckout = () => {
    setStack((prev) => [...prev.filter((item) => item.type !== 'checkout'), { type: 'checkout' }]);
    analytics.track('checkout_started', 'checkout', { items: (checkoutDraft.items || []).length });
    haptic('selection');
  };
  const addProductToCheckout = (product, quantity = 1) => {
    setCheckoutDraft((prev) => {
      const currentItems = Array.isArray(prev.items) ? [...prev.items] : [];
      const idx = currentItems.findIndex((item) => String(item.productId || item.id) === String(product.id));
      if (idx >= 0) currentItems[idx] = { ...currentItems[idx], quantity: Number(currentItems[idx].quantity || 0) + quantity, name: product.name, price: product.price, image: product.photo };
      else currentItems.unshift({ productId: product.id, id: product.id, quantity, name: product.name, price: product.price, image: product.photo });
      return { ...prev, items: currentItems };
    });
    openCheckout();
  };
  const updateCheckoutItemQuantity = (productId, quantity) => {
    setCheckoutDraft((prev) => ({
      ...prev,
      items: (prev.items || []).map((item) => String(item.productId || item.id) === String(productId) ? { ...item, quantity: Math.max(1, Number(quantity || 1)) } : item),
    }));
  };
  const removeCheckoutItem = (productId) => {
    setCheckoutDraft((prev) => ({
      ...prev,
      items: (prev.items || []).filter((item) => String(item.productId || item.id) !== String(productId)),
    }));
  };
  const goTo = (tabKey) => {
    setActiveTab(tabKey);
    setStack([{ type: 'tab', key: tabKey }]);
    analytics.track('open_tab', tabKey, { tabKey });
    haptic('selection');
  };
  const goBack = () => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      return next;
    });
    haptic('selection');
  };

  useEffect(() => {
    if (currentScreen.type === 'tab' && currentScreen.key !== activeTab) setActiveTab(currentScreen.key);
  }, [currentScreen, activeTab]);

  const profileDirty = useMemo(() => {
    const source = profileQuery.data;
    if (!source) return false;
    return JSON.stringify({ name: profileForm.name, phone: profileForm.phone, address: profileForm.address || {} })
      !== JSON.stringify({ name: source.profile?.name || '', phone: source.profile?.phone || '', address: source.address || {} });
  }, [profileForm, profileQuery.data]);

  const adminDirty = useMemo(() => JSON.stringify(adminDraft || {}) !== JSON.stringify(adminSettingsQuery.data?.settings || {}), [adminDraft, adminSettingsQuery.data?.settings]);
  const checkoutDirty = currentScreen.type === 'checkout' && (checkoutDraft.items || []).length > 0;
  const shouldConfirmClose = profileDirty || adminDirty || repeatOrderMutation.isLoading || checkoutCommitMutation.isLoading || checkoutDirty;

  useEffect(() => {
    configureClosingConfirmation(shouldConfirmClose);
  }, [shouldConfirmClose]);

  useEffect(() => configureBackButton({ visible: stack.length > 1, onClick: goBack }), [stack]);

  const mainButtonAction = useMemo(() => {
    const currentSelectedProduct = productDetailQuery.data?.product || null;
    const currentSelectedOrder = orderDetailQuery.data?.order || null;
    if (currentScreen.type === 'product' && currentSelectedProduct) {
      return {
        visible: true,
        text: 'В заказ',
        onClick: () => addProductToCheckout(currentSelectedProduct, 1),
        progress: false,
      };
    }
    if (currentScreen.type === 'checkout' && (checkoutDraft.items || []).length) {
      return {
        visible: true,
        text: checkoutCommitMutation.isLoading ? 'Оформляю…' : 'Оформить заказ',
        onClick: () => checkoutCommitMutation.mutate(checkoutDraft),
        progress: checkoutCommitMutation.isLoading,
      };
    }
    if (currentScreen.type === 'order' && selectedOrderId) {
      if (!currentSelectedOrder?.isPaid && ['stripe_card', 'kaspi', 'paypal', 'freedom_pay'].includes(String(currentSelectedOrder?.paymentMethod || '').toLowerCase())) {
        return {
          visible: true,
          text: paymentSessionMutation.isLoading ? 'Открываю оплату…' : 'Оплатить',
          onClick: () => paymentSessionMutation.mutate(selectedOrderId),
          progress: paymentSessionMutation.isLoading,
        };
      }
      return {
        visible: true,
        text: repeatOrderMutation.isLoading ? 'Подготовка…' : 'Повторить заказ',
        onClick: () => repeatOrderMutation.mutate(selectedOrderId),
        progress: repeatOrderMutation.isLoading,
      };
    }
    if (activeTab === 'profile' && profileDirty) {
      return {
        visible: true,
        text: profileMutation.isLoading ? 'Сохраняю…' : 'Сохранить профиль',
        onClick: () => profileMutation.mutate(profileForm),
        progress: profileMutation.isLoading,
      };
    }
    if ((activeTab === 'promos' || currentScreen.type === 'checkout') && (selectedPromo?.code || checkoutDraft.promoCode)) {
      const code = selectedPromo?.code || checkoutDraft.promoCode;
      return {
        visible: true,
        text: promoPreviewMutation.isLoading ? 'Проверка…' : `Проверить ${code}`,
        onClick: () => promoPreviewMutation.mutate({ code, subtotal: Number(checkoutPreviewQuery.data?.totals?.itemsPrice || promoSubtotal || 0) }),
        progress: promoPreviewMutation.isLoading,
      };
    }
    if (activeTab === 'admin' && canManageMiniApp && adminDirty) {
      return {
        visible: true,
        text: adminSettingsMutation.isLoading ? 'Сохраняю…' : 'Сохранить настройки',
        onClick: () => adminSettingsMutation.mutate(adminDraft),
        progress: adminSettingsMutation.isLoading,
      };
    }
    return { visible: false, text: '', onClick: null, progress: false };
  }, [currentScreen, productDetailQuery.data, orderDetailQuery.data, selectedOrderId, activeTab, profileDirty, profileMutation.isLoading, profileForm, selectedPromo, promoSubtotal, promoPreviewMutation.isLoading, adminDirty, canManageMiniApp, adminSettingsMutation.isLoading, adminDraft, repeatOrderMutation.isLoading, checkoutDraft, checkoutCommitMutation.isLoading, checkoutPreviewQuery.data, paymentSessionMutation.isLoading]);

  useEffect(() => useTelegramMainButton({
    visible: mainButtonAction.visible,
    text: mainButtonAction.text,
    onClick: mainButtonAction.onClick,
    isProgressVisible: mainButtonAction.progress,
  }), [mainButtonAction]);

  useEffect(() => {
    if (session.status !== 'ready' || isDemo || configQuery.data?.settings?.featureFlags?.realtimeSync === false) return undefined;
    const stream = createTelegramMiniEventStream();
    if (!stream) return undefined;

    const applySyncSnapshot = (data) => {
      const prev = revisionsRef.current || {};
      if (!prev.ordersRevision) {
        revisionsRef.current = data || {};
        return;
      }
      if (data?.ordersRevision && data.ordersRevision !== prev.ordersRevision) queryClient.invalidateQueries(['tgm-orders']);
      if (data?.productsRevision && data.productsRevision !== prev.productsRevision) {
        queryClient.invalidateQueries(['tgm-products']);
        queryClient.invalidateQueries(['tgm-bootstrap']);
      }
      if (data?.profileRevision && data.profileRevision !== prev.profileRevision) {
        queryClient.invalidateQueries(['tgm-profile']);
        queryClient.invalidateQueries(['tgm-bootstrap']);
      }
      if (data?.promosRevision && data.promosRevision !== prev.promosRevision) {
        queryClient.invalidateQueries(['tgm-promos']);
        queryClient.invalidateQueries(['tgm-bootstrap']);
      }
      if (data?.settingsRevision && data.settingsRevision !== prev.settingsRevision) {
        queryClient.invalidateQueries(['tgm-config']);
        queryClient.invalidateQueries(['tgm-admin-settings']);
      }
      revisionsRef.current = data || {};
    };

    stream.addEventListener('ready', (event) => {
      try { applySyncSnapshot(JSON.parse(event.data || '{}').sync || {}); } catch {}
    });
    stream.addEventListener('sync', (event) => {
      try { applySyncSnapshot(JSON.parse(event.data || '{}')); } catch {}
    });
    stream.onerror = () => { try { stream.close(); } catch {} };
    return () => { try { stream.close(); } catch {} };
  }, [session.status, isDemo, configQuery.data, queryClient]);

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries(['tgm-bootstrap']),
      queryClient.invalidateQueries(['tgm-products']),
      queryClient.invalidateQueries(['tgm-orders']),
      queryClient.invalidateQueries(['tgm-notifications']),
      queryClient.invalidateQueries(['tgm-support']),
      queryClient.invalidateQueries(['tgm-promos']),
      queryClient.invalidateQueries(['tgm-profile']),
      queryClient.invalidateQueries(['tgm-admin-settings']),
      queryClient.invalidateQueries(['tgm-admin-overview']),
      queryClient.invalidateQueries(['tgm-checkout-preview']),
      queryClient.invalidateQueries(['tgm-config']),
    ]);
    haptic('selection');
  };

  const allProducts = productsQuery.data?.products || [];
  const bootstrap = bootstrapQuery.data || mockBootstrap;
  const config = (configQuery.data?.settings || session.config?.settings || mockSession.config.settings);
  const notifications = notificationsQuery.data?.notifications || bootstrap.notifications || [];
  const orders = ordersQuery.data?.orders || bootstrap.recentOrders || [];
  const promos = promosQuery.data?.promoCodes || bootstrap.promoCodes || [];
  const support = supportQuery.data?.support || bootstrap.support || mockSession.config.settings.support;
  const selectedProduct = productDetailQuery.data?.product || null;
  const selectedOrder = orderDetailQuery.data?.order || null;
  const checkoutPreview = checkoutPreviewQuery.data || { items: checkoutDraft.items || [], totals: { itemsPrice: 0, promoDiscount: 0, shippingPrice: 0, taxPrice: 0, totalPrice: 0 }, paymentOptions: [] };
  const adminOverview = adminOverviewQuery.data?.overview || null;
  const adminEvents = adminOverviewQuery.data?.recentEvents || [];
  const draftItemsCount = (checkoutDraft.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const favoriteIds = new Set([...(bootstrap.favorites || []).map((item) => item.id), ...allProducts.filter((item) => item.isFavorite).map((item) => item.id)]);

  const groupedNotifications = useMemo(() => notifications.reduce((acc, item) => {
    const key = item.group || 'general';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {}), [notifications]);

  const isLoadingShell = session.status === 'loading' || (session.status === 'ready' && bootstrapQuery.isLoading);
  const errorText = session.error;

  useEffect(() => {
    if (currentScreen.type === 'tab') analytics.track('screen_view', currentScreen.key);
    if (currentScreen.type === 'product') analytics.track('screen_view', 'product_detail', { productId: currentScreen.id });
    if (currentScreen.type === 'order') analytics.track('screen_view', 'order_detail', { orderId: currentScreen.id });
    if (currentScreen.type === 'checkout') analytics.track('screen_view', 'checkout');
  }, [currentScreen]);

  const toggleFavorite = async (product) => {
    favoriteMutation.mutate({ productId: product.id, isFavorite: Boolean(product.isFavorite || favoriteIds.has(product.id)) });
    analytics.track('favorite_toggle', currentScreen.type === 'product' ? 'product_detail' : 'catalog', { productId: product.id });
  };

  if (session.status === 'error') {
    return <div className="tgm-shell"><div className="tgm-center-card"><h1>Jola Mini App</h1><p>{errorText}</p></div></div>;
  }

  return (
    <div className="tgm-shell">
      <header className="tgm-topbar">
        <div>
          <small>{isDemo ? 'Демо вне Telegram' : 'Telegram Mini App'}</small>
          <strong>{currentScreen.type === 'tab' ? tabs.find((item) => item.key === activeTab)?.label || 'Jola' : currentScreen.type === 'product' ? 'Товар' : currentScreen.type === 'checkout' ? 'Оформление' : 'Заказ'}</strong>
        </div>
        <div className="tgm-topbar__actions">
          <button type="button" className="tgm-icon-btn tgm-icon-btn--badge" onClick={openCheckout} aria-label="Оформление">
            <FiShoppingBag />
            {draftItemsCount ? <span className="tgm-badge">{draftItemsCount}</span> : null}
          </button>
          <button type="button" className="tgm-icon-btn" onClick={refreshAll} aria-label="Обновить"><FiRefreshCw /></button>
        </div>
      </header>

      {isDemo ? <div className="tgm-banner tgm-banner--demo"><FiAlertCircle /> <span>{DEMO_NOTICE}</span></div> : null}

      <main className="tgm-main">
        {isLoadingShell ? (
          <div className="tgm-stack">
            <SkeletonCard height={110} />
            <SkeletonCard height={150} />
            <SkeletonCard height={240} />
          </div>
        ) : null}

        {!isLoadingShell && currentScreen.type === 'tab' && activeTab === 'home' ? (
          <div className="tgm-stack">
            <section className="tgm-hero">
              <div>
                <small>Здравствуйте</small>
                <h1>{bootstrap.profile?.name || session.profile?.name || 'Пользователь'}</h1>
                <p>Баланс, бонусы, заказы и промокоды в одном Telegram-интерфейсе.</p>
              </div>
              <Pill tone="accent">{session.profile?.role || 'клиент'}</Pill>
            </section>

            {bootstrap.dashboard?.banners?.length ? (
              <div className="tgm-banner-strip">
                {bootstrap.dashboard.banners.map((banner) => (
                  <button type="button" key={banner.id} className="tgm-banner-card" onClick={() => goTo(banner.targetView || banner.actionValue || 'catalog')}>
                    <small>{banner.badge || 'Jola'}</small>
                    <strong>{banner.title}</strong>
                    <p>{banner.subtitle}</p>
                    {banner.ctaLabel ? <span>{banner.ctaLabel} <FiChevronRight /></span> : null}
                  </button>
                ))}
              </div>
            ) : null}

            <section className="tgm-grid tgm-grid--stats">
              <article className="tgm-stat-card"><FiCreditCard /><strong>{formatMoney(bootstrap.wallet?.balance)} ₸</strong><span>Баланс</span></article>
              <article className="tgm-stat-card"><FiStar /><strong>{formatMoney(bootstrap.wallet?.bonuses)}</strong><span>Бонусы</span></article>
              <article className="tgm-stat-card"><FiPackage /><strong>{bootstrap.dashboard?.summary?.activeOrders || 0}</strong><span>Активные заказы</span></article>
              <article className="tgm-stat-card"><FiGift /><strong>{bootstrap.dashboard?.summary?.promoCount || 0}</strong><span>Промокоды</span></article>
            </section>

            {config.blocks?.favorites !== false ? (
              <section className="tgm-card">
                <SectionHeader title="Избранное" subtitle="Быстрый доступ к сохранённым товарам" actionLabel="Каталог" onAction={() => goTo('catalog')} />
                <div className="tgm-product-strip">
                  {(bootstrap.favorites || []).length ? bootstrap.favorites.map((product) => (
                    <ProductCard key={product.id} product={product} onOpen={openProduct} onToggleFavorite={toggleFavorite} compact />
                  )) : <p className="tgm-empty">Добавляйте товары в избранное прямо из каталога.</p>}
                </div>
              </section>
            ) : null}

            {config.blocks?.recentlyViewed !== false ? (
              <section className="tgm-card">
                <SectionHeader title="Недавно просмотренные" subtitle="Вернуться к последним товарам" />
                <div className="tgm-product-strip">
                  {(bootstrap.recentlyViewed || []).length ? bootstrap.recentlyViewed.map((product) => (
                    <ProductCard key={product.id} product={product} onOpen={openProduct} onToggleFavorite={toggleFavorite} compact />
                  )) : <p className="tgm-empty">После просмотра товаров они появятся здесь.</p>}
                </div>
              </section>
            ) : null}

            <section className="tgm-card">
              <SectionHeader title="Мои заказы" subtitle="Текущие и недавние покупки" actionLabel="Все заказы" onAction={() => goTo('orders')} />
              <div className="tgm-list">
                {(bootstrap.recentOrders || []).length ? bootstrap.recentOrders.map((order) => <OrderCard key={order.id} order={order} onOpen={openOrder} onRepeat={(item) => repeatOrderMutation.mutate(item.id)} />) : <p className="tgm-empty">Пока заказов нет.</p>}
              </div>
            </section>

            <section className="tgm-card">
              <SectionHeader title="Для вас" subtitle="Живые подборки из backend Telegram слоя" />
              <div className="tgm-collections">
                {(bootstrap.dashboard?.collections || []).map((collection) => (
                  <div key={collection.id} className="tgm-collection-block">
                    <div className="tgm-collection-head"><strong>{collection.title}</strong></div>
                    <div className="tgm-product-strip">
                      {(collection.items || []).length ? collection.items.map((product) => (
                        <ProductCard key={product.id} product={product} onOpen={openProduct} onToggleFavorite={toggleFavorite} compact />
                      )) : <p className="tgm-empty">Подборка пока пустая.</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {!isLoadingShell && currentScreen.type === 'tab' && activeTab === 'catalog' ? (
          <div className="tgm-stack">
            <section className="tgm-search-box"><FiSearch /><input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Поиск по товарам" /></section>
            <section className="tgm-filter-bar">
              <label><FiSliders /><select value={productSort} onChange={(e) => setProductSort(e.target.value)}><option value="featured">Сначала важные</option><option value="price_asc">Цена ↑</option><option value="price_desc">Цена ↓</option><option value="discount_desc">Скидка</option></select></label>
              <label><FiFilter /><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Все категории</option>{(productsQuery.data?.filters?.categories || []).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <div className="tgm-chip-row">
                {['', 'in-stock', 'low-stock', 'out-of-stock'].map((item) => (
                  <button key={item || 'all'} type="button" className={`tgm-chip ${availability === item ? 'is-active' : ''}`} onClick={() => setAvailability(item)}>{item === '' ? 'Все' : item === 'in-stock' ? 'В наличии' : item === 'low-stock' ? 'Мало' : 'Нет'}</button>
                ))}
              </div>
            </section>
            <section className="tgm-product-grid">
              {productsQuery.isLoading ? Array.from({ length: 6 }).map((_, idx) => <SkeletonCard key={idx} height={220} />) : null}
              {!productsQuery.isLoading && allProducts.map((product) => <ProductCard key={product.id} product={product} onOpen={openProduct} onToggleFavorite={toggleFavorite} />)}
              {!productsQuery.isLoading && !allProducts.length ? <div className="tgm-empty-card">Ничего не найдено. Попробуйте изменить фильтры.</div> : null}
            </section>
          </div>
        ) : null}

        {!isLoadingShell && currentScreen.type === 'product' ? (
          <div className="tgm-stack">
            <button type="button" className="tgm-inline-back" onClick={goBack}><FiArrowLeft /> Назад</button>
            <section className="tgm-card tgm-card--product-detail">
              <div className="tgm-gallery">
                {(productDetailQuery.data?.product?.gallery || selectedProduct?.gallery || ['/placeholder-product.svg']).map((src, idx) => <img key={`${src}-${idx}`} src={src} alt={selectedProduct?.name || 'product'} />)}
              </div>
              <div className="tgm-product-detail__head">
                <div>
                  <h2>{selectedProduct?.name}</h2>
                  <p>{productDetailQuery.data?.brand || 'Jola'}</p>
                </div>
                <button type="button" className="tgm-icon-btn" onClick={() => selectedProduct && toggleFavorite(selectedProduct)}><FiHeart className={selectedProduct?.isFavorite ? 'is-active' : ''} /></button>
              </div>
              <div className="tgm-product-detail__price"><strong>{formatMoney(selectedProduct?.price)} ₸</strong>{selectedProduct?.oldPrice ? <small>{formatMoney(selectedProduct.oldPrice)} ₸</small> : null}</div>
              <div className="tgm-chip-row"><Pill tone={selectedProduct?.stock <= 0 ? 'danger' : selectedProduct?.stock <= 5 ? 'warn' : 'success'}>{selectedProduct?.availability}</Pill>{selectedProduct?.discountPercent ? <Pill tone="accent">-{selectedProduct.discountPercent}%</Pill> : null}</div>
              <p className="tgm-description">{productDetailQuery.data?.description}</p>
              {(productDetailQuery.data?.tags || []).length ? <div className="tgm-chip-row">{productDetailQuery.data.tags.map((tag) => <Pill key={tag}>{tag}</Pill>)}</div> : null}
            </section>
            <section className="tgm-card">
              <SectionHeader title="Рекомендации" subtitle="Похожие товары из той же категории" />
              <div className="tgm-product-strip">
                {(productDetailQuery.data?.recommendations || []).length ? productDetailQuery.data.recommendations.map((product) => <ProductCard key={product.id} product={product} onOpen={openProduct} onToggleFavorite={toggleFavorite} compact />) : <p className="tgm-empty">Пока рекомендаций нет.</p>}
              </div>
            </section>
          </div>
        ) : null}

        {!isLoadingShell && currentScreen.type === 'tab' && activeTab === 'orders' ? (
          <div className="tgm-stack">
            <section className="tgm-card">
              <SectionHeader title="Мои заказы" subtitle="История, статусы и быстрый повтор" />
              <div className="tgm-list">
                {ordersQuery.isLoading ? <SkeletonCard height={180} /> : null}
                {!ordersQuery.isLoading && orders.map((order) => <OrderCard key={order.id} order={order} onOpen={openOrder} onRepeat={(item) => repeatOrderMutation.mutate(item.id)} />)}
                {!ordersQuery.isLoading && !orders.length ? <p className="tgm-empty">Заказов пока нет.</p> : null}
              </div>
            </section>
          </div>
        ) : null}

        {!isLoadingShell && currentScreen.type === 'order' ? (
          <div className="tgm-stack">
            <button type="button" className="tgm-inline-back" onClick={goBack}><FiArrowLeft /> Назад</button>
            <section className="tgm-card">
              <SectionHeader title={selectedOrder?.number || 'Заказ'} subtitle={formatDate(selectedOrder?.date)} actionLabel="Повторить" onAction={() => selectedOrder && repeatOrderMutation.mutate(selectedOrder.id)} />
              <div className="tgm-kv-grid">
                <div><span>Сумма</span><strong>{formatMoney(selectedOrder?.amount)} ₸</strong></div>
                <div><span>Статус</span><strong>{selectedOrder?.status || '—'}</strong></div>
                <div><span>Оплата</span><strong>{selectedOrder?.paymentMethod || '—'}</strong></div>
                <div><span>Доставка</span><strong>{selectedOrder?.deliveryMethod || '—'}</strong></div>
              </div>
              <div className="tgm-order-timeline">
                {(selectedOrder?.timeline || []).length ? selectedOrder.timeline.map((item, index) => (
                  <div key={`${item.rawStatus}-${index}`} className="tgm-timeline-item">
                    <div className="tgm-timeline-item__dot" />
                    <div>
                      <strong>{item.status}</strong>
                      <p>{formatDateTime(item.at)}</p>
                      {item.note ? <small>{item.note}</small> : null}
                    </div>
                  </div>
                )) : <p className="tgm-empty">История статусов пока пустая.</p>}
              </div>
              {(orderDetailQuery.data?.items || []).length ? <div className="tgm-order-items">{orderDetailQuery.data.items.map((item) => <div key={`${item.id}-${item.name}`} className="tgm-list-line"><span>{item.name} × {item.quantity}</span><strong>{formatMoney(item.price)} ₸</strong></div>)}</div> : null}
            </section>
          </div>
        ) : null}

        {!isLoadingShell && currentScreen.type === 'checkout' ? (
          <div className="tgm-stack">
            <button type="button" className="tgm-inline-back" onClick={goBack}><FiArrowLeft /> Назад</button>
            {(checkoutDraft.items || []).length ? (
              <>
                <section className="tgm-card">
                  <SectionHeader title="Оформление заказа" subtitle="Черновик сохраняется локально и в Cloud Storage Telegram" actionLabel="Очистить" onAction={() => setCheckoutDraft(emptyCheckoutDraft)} />
                  <div className="tgm-list">
                    {(checkoutPreview.items || checkoutDraft.items || []).map((item) => <CheckoutItemRow key={item.productId || item.id} item={item} onChangeQuantity={updateCheckoutItemQuantity} onRemove={removeCheckoutItem} />)}
                  </div>
                </section>
                <section className="tgm-card">
                  <SectionHeader title="Доставка и оплата" subtitle="Mini App обращается к серверу и считает сумму на backend" />
                  <div className="tgm-form-grid">
                    <label>Улица<input value={checkoutDraft.address?.street || ''} onChange={(e) => setCheckoutDraft((prev) => ({ ...prev, address: { ...(prev.address || {}), street: e.target.value } }))} /></label>
                    <label>Город<input value={checkoutDraft.address?.city || ''} onChange={(e) => setCheckoutDraft((prev) => ({ ...prev, address: { ...(prev.address || {}), city: e.target.value } }))} /></label>
                    <label>Индекс<input value={checkoutDraft.address?.zipCode || ''} onChange={(e) => setCheckoutDraft((prev) => ({ ...prev, address: { ...(prev.address || {}), zipCode: e.target.value } }))} /></label>
                    <label>Страна<input value={checkoutDraft.address?.country || ''} onChange={(e) => setCheckoutDraft((prev) => ({ ...prev, address: { ...(prev.address || {}), country: e.target.value } }))} /></label>
                  </div>
                  <label>Комментарий<input value={checkoutDraft.customerNote || ''} onChange={(e) => setCheckoutDraft((prev) => ({ ...prev, customerNote: e.target.value }))} placeholder="Например: позвонить перед доставкой" /></label>
                  <div className="tgm-chip-row">
                    {(checkoutPreview.paymentOptions || []).filter((item) => item.enabled !== false).map((item) => (
                      <button key={item.key} type="button" className={`tgm-chip ${checkoutDraft.paymentMethod === item.key ? 'is-active' : ''}`} onClick={() => setCheckoutDraft((prev) => ({ ...prev, paymentMethod: item.key }))}>{item.label}</button>
                    ))}
                  </div>
                </section>
                <section className="tgm-card">
                  <SectionHeader title="Промокод и итог" subtitle="Сумма и скидки считаются на сервере" />
                  <div className="tgm-promo-toolbar">
                    <label>Промокод<input value={checkoutDraft.promoCode || ''} onChange={(e) => setCheckoutDraft((prev) => ({ ...prev, promoCode: e.target.value.toUpperCase() }))} placeholder="Введите код" /></label>
                    <button type="button" className="tgm-ghost-btn" onClick={() => checkoutDraft.promoCode && promoPreviewMutation.mutate({ code: checkoutDraft.promoCode, subtotal: Number(checkoutPreview.totals?.itemsPrice || 0) })}><FiGift /> Проверить</button>
                  </div>
                  {checkoutPreview.promo ? <div className="tgm-inline-note">Активный промокод: <strong>{checkoutPreview.promo.code}</strong> · скидка {formatMoney(checkoutPreview.promo.discount || checkoutPreview.totals?.promoDiscount || 0)} ₸</div> : null}
                  <div className="tgm-list">
                    <div className="tgm-list-line"><span>Товары</span><strong>{formatMoney(checkoutPreview.totals?.itemsPrice)} ₸</strong></div>
                    <div className="tgm-list-line"><span>Скидка</span><strong>- {formatMoney(checkoutPreview.totals?.promoDiscount)} ₸</strong></div>
                    <div className="tgm-list-line"><span>Доставка</span><strong>{formatMoney(checkoutPreview.totals?.shippingPrice)} ₸</strong></div>
                    <div className="tgm-list-line"><span>Налог</span><strong>{formatMoney(checkoutPreview.totals?.taxPrice)} ₸</strong></div>
                    <div className="tgm-list-line"><span>Итого</span><strong>{formatMoney(checkoutPreview.totals?.totalPrice)} ₸</strong></div>
                  </div>
                  {checkoutCommitMutation.isError ? <div className="tgm-banner tgm-banner--demo"><FiAlertCircle /><span>{checkoutCommitMutation.error?.response?.data?.message || checkoutCommitMutation.error?.message || 'Не удалось оформить заказ'}</span></div> : null}
                </section>
              </>
            ) : <div className="tgm-empty-card">Черновик заказа пуст. Добавьте товары из каталога или повторите прошлый заказ.</div>}
          </div>
        ) : null}

        {!isLoadingShell && currentScreen.type === 'tab' && activeTab === 'promos' ? (
          <div className="tgm-stack">
            <section className="tgm-card">
              <SectionHeader title="Акции и промокоды" subtitle="Проверьте скидку по сумме заказа" />
              <div className="tgm-promo-toolbar">
                <label>Сумма заказа<input type="number" value={promoSubtotal} onChange={(e) => setPromoSubtotal(e.target.value)} /></label>
                <button type="button" className="tgm-ghost-btn" onClick={() => selectedPromo && navigator.clipboard?.writeText(selectedPromo.code)}><FiCopy /> Код</button>
              </div>
              <div className="tgm-promo-grid">
                {promosQuery.isLoading ? Array.from({ length: 4 }).map((_, idx) => <SkeletonCard key={idx} height={150} />) : null}
                {!promosQuery.isLoading && promos.map((promo) => <PromoCard key={promo.id} promo={promo} selected={selectedPromo?.id === promo.id} onSelect={(promo) => { setSelectedPromo(promo); setCheckoutDraft((prev) => ({ ...prev, promoCode: promo.code || '' })); }} />)}
                {!promosQuery.isLoading && !promos.length ? <p className="tgm-empty">Активных промокодов нет.</p> : null}
              </div>
              {promoPreviewMutation.data ? <div className="tgm-result-card"><strong>{promoPreviewMutation.data?.promoCode?.code || selectedPromo?.code}</strong><p>Скидка: {formatMoney(promoPreviewMutation.data.discount)} ₸</p><span>Итого: {formatMoney(promoPreviewMutation.data.finalAmount)} ₸</span></div> : null}
            </section>
          </div>
        ) : null}

        {!isLoadingShell && currentScreen.type === 'tab' && activeTab === 'notifications' ? (
          <div className="tgm-stack">
            {Object.keys(groupedNotifications).length ? Object.entries(groupedNotifications).map(([group, items]) => (
              <section key={group} className="tgm-card">
                <SectionHeader title={group} subtitle={`${items.length} уведомлений`} />
                <div className="tgm-list">{items.map((item) => <NotificationCard key={item.id} item={item} />)}</div>
              </section>
            )) : <div className="tgm-empty-card">Уведомлений пока нет.</div>}
          </div>
        ) : null}

        {!isLoadingShell && currentScreen.type === 'tab' && activeTab === 'profile' ? (
          <div className="tgm-stack">
            <section className="tgm-card">
              <SectionHeader title="Профиль" subtitle="Редактируемые поля зависят от серверной политики" />
              <div className="tgm-form-grid">
                <label>Имя<input value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} /></label>
                <label>Телефон<input value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} /></label>
                <label>Улица<input value={profileForm.address?.street || ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: { ...(prev.address || {}), street: e.target.value } }))} /></label>
                <label>Город<input value={profileForm.address?.city || ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: { ...(prev.address || {}), city: e.target.value } }))} /></label>
                <label>Индекс<input value={profileForm.address?.zipCode || ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: { ...(prev.address || {}), zipCode: e.target.value } }))} /></label>
                <label>Страна<input value={profileForm.address?.country || ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: { ...(prev.address || {}), country: e.target.value } }))} /></label>
              </div>
              <div className="tgm-inline-note">Регистрация: {formatDate(bootstrap.profile?.registeredAt || session.profile?.registeredAt)}</div>
            </section>
            <section className="tgm-card">
              <SectionHeader title="Баланс и бонусы" />
              <div className="tgm-grid tgm-grid--stats">
                <article className="tgm-stat-card"><FiCreditCard /><strong>{formatMoney(bootstrap.wallet?.balance)} ₸</strong><span>Баланс</span></article>
                <article className="tgm-stat-card"><FiGift /><strong>{formatMoney(bootstrap.wallet?.bonuses)}</strong><span>Бонусы</span></article>
              </div>
            </section>
          </div>
        ) : null}

        {!isLoadingShell && currentScreen.type === 'tab' && activeTab === 'support' ? (
          <div className="tgm-stack">
            <section className="tgm-card">
              <SectionHeader title="Поддержка" subtitle="FAQ, быстрые действия и выход на менеджера" />
              <div className="tgm-support-grid">
                <button type="button" className="tgm-support-card" onClick={() => support.telegram && openExternalLink(support.telegram)}><FiMessageCircleShim /><strong>Чат / бот</strong><span>{support.telegram || 'не задано'}</span></button>
                <button type="button" className="tgm-support-card" onClick={() => support.phone && openExternalLink(`tel:${support.phone}`)}><FiPhone /><strong>Позвонить</strong><span>{support.phone || 'не задано'}</span></button>
                <button type="button" className="tgm-support-card" onClick={() => support.email && openExternalLink(`mailto:${support.email}`)}><FiExternalLink /><strong>Email</strong><span>{support.email || 'не задано'}</span></button>
                <div className="tgm-support-card"><FiClock /><strong>Часы работы</strong><span>{support.workingHours}</span></div>
              </div>
            </section>
            <section className="tgm-card">
              <SectionHeader title="FAQ" subtitle="Блок управляется через настройки Mini App" />
              <div className="tgm-faq-list">
                {(support.faq || []).length ? support.faq.map((item) => <details key={item.id} className="tgm-faq-item"><summary>{item.question}</summary><p>{item.answer}</p></details>) : <p className="tgm-empty">FAQ пока пустой.</p>}
              </div>
            </section>
          </div>
        ) : null}

        {!isLoadingShell && currentScreen.type === 'tab' && activeTab === 'admin' ? (
          <div className="tgm-stack">
            <section className="tgm-card">
              <SectionHeader title="Управление Mini App" subtitle={readOnlyMiniAppAdmin ? 'Режим наблюдателя: только просмотр' : 'Отдельный продуктовый слой Telegram'} />
              <div className="tgm-chip-row">
                {['overview', 'settings', 'banners', 'faq', 'collections'].map((key) => <button key={key} type="button" className={`tgm-chip ${adminPanelTab === key ? 'is-active' : ''}`} onClick={() => setAdminPanelTab(key)}>{key}</button>)}
              </div>
            </section>

            {adminPanelTab === 'overview' ? (
              <>
                <section className="tgm-card">
                  <SectionHeader title="Обзор за 24 часа" subtitle="Сессии, воронка и проблемные сигналы" />
                  <div className="tgm-admin-grid">
                    <MetricCard title="Активные сессии" value={adminOverview?.activeSessions ?? '—'} />
                    <MetricCard title="Заказы 24ч" value={adminOverview?.orders24h ?? '—'} />
                    <MetricCard title="Открытые заказы" value={adminOverview?.openOrders ?? '—'} />
                    <MetricCard title="Конверсия" value={adminOverview ? `${adminOverview.conversion24h}%` : '—'} hint="checkout → order" />
                    <MetricCard title="Товаров" value={adminOverview?.totalProducts ?? '—'} />
                    <MetricCard title="Мало на складе" value={adminOverview?.lowStockProducts ?? '—'} />
                    <MetricCard title="Warnings" value={adminOverview?.warnings24h ?? '—'} />
                    <MetricCard title="Errors" value={adminOverview?.errors24h ?? '—'} />
                  </div>
                </section>
                <section className="tgm-card">
                  <SectionHeader title="Последние события" subtitle="Аудит и аналитика Telegram Mini App" />
                  <div className="tgm-list">
                    {adminEvents.length ? adminEvents.map((item) => <NotificationCard key={item.id} item={{ id: item.id, title: item.event, body: item.route || JSON.stringify(item.meta || {}), createdAt: item.createdAt, severity: item.severity || 'info', group: 'audit' }} />) : <p className="tgm-empty">Пока нет событий.</p>}
                  </div>
                </section>
              </>
            ) : null}

            {adminPanelTab === 'settings' ? (
              <>
                <section className="tgm-card">
                  <SectionHeader title="Блоки" subtitle="Что показывать внутри Mini App" />
                  <div className="tgm-admin-grid">
                    {Object.entries(adminDraft?.blocks || {}).map(([key, value]) => (
                      <label key={key} className="tgm-switch"><span>{key}</span><input type="checkbox" checked={Boolean(value)} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, blocks: { ...(prev?.blocks || {}), [key]: e.target.checked } }))} /></label>
                    ))}
                  </div>
                </section>
                <section className="tgm-card">
                  <SectionHeader title="Feature flags" />
                  <div className="tgm-admin-grid">
                    {Object.entries(adminDraft?.featureFlags || {}).map(([key, value]) => (
                      <label key={key} className="tgm-switch"><span>{key}</span><input type="checkbox" checked={Boolean(value)} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, featureFlags: { ...(prev?.featureFlags || {}), [key]: e.target.checked } }))} /></label>
                    ))}
                  </div>
                </section>
                <section className="tgm-card">
                  <SectionHeader title="Поддержка" />
                  <div className="tgm-form-grid">
                    <label>Телефон<input value={adminDraft?.support?.phone || ''} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, support: { ...(prev?.support || {}), phone: e.target.value } }))} /></label>
                    <label>Telegram<input value={adminDraft?.support?.telegram || ''} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, support: { ...(prev?.support || {}), telegram: e.target.value } }))} /></label>
                    <label>Email<input value={adminDraft?.support?.email || ''} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, support: { ...(prev?.support || {}), email: e.target.value } }))} /></label>
                    <label>Часы работы<input value={adminDraft?.support?.workingHours || ''} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, support: { ...(prev?.support || {}), workingHours: e.target.value } }))} /></label>
                  </div>
                </section>
              </>
            ) : null}

            {adminPanelTab === 'banners' ? (
              <section className="tgm-card">
                <SectionHeader title="Баннеры" subtitle="Карточки главного экрана без JSON" actionLabel={readOnlyMiniAppAdmin ? '' : 'Добавить'} onAction={!readOnlyMiniAppAdmin ? () => setAdminDraft((prev) => ({ ...prev, banners: [...(prev?.banners || []), { id: `banner_${Date.now()}`, title: 'Новый баннер', subtitle: '', badge: 'NEW', ctaLabel: 'Открыть', actionType: 'view', actionValue: 'catalog', targetView: 'catalog', isActive: true, order: (prev?.banners || []).length + 1 }] })) : undefined} />
                <div className="tgm-stack">
                  {(adminDraft?.banners || []).map((banner, index) => (
                    <div key={banner.id || index} className="tgm-inline-editor">
                      <label>Заголовок<input value={banner.title || ''} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, banners: (prev?.banners || []).map((item, idx) => idx === index ? { ...item, title: e.target.value } : item) }))} /></label>
                      <label>Подзаголовок<input value={banner.subtitle || ''} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, banners: (prev?.banners || []).map((item, idx) => idx === index ? { ...item, subtitle: e.target.value } : item) }))} /></label>
                      <label>CTA<input value={banner.ctaLabel || ''} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, banners: (prev?.banners || []).map((item, idx) => idx === index ? { ...item, ctaLabel: e.target.value } : item) }))} /></label>
                      {!readOnlyMiniAppAdmin ? <button type="button" className="tgm-ghost-btn" onClick={() => setAdminDraft((prev) => ({ ...prev, banners: (prev?.banners || []).filter((_, idx) => idx !== index) }))}><FiTrash2 /> Удалить</button> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {adminPanelTab === 'faq' ? (
              <section className="tgm-card">
                <SectionHeader title="FAQ" subtitle="Быстрые вопросы поддержки" actionLabel={readOnlyMiniAppAdmin ? '' : 'Добавить'} onAction={!readOnlyMiniAppAdmin ? () => setAdminDraft((prev) => ({ ...prev, support: { ...(prev?.support || {}), faq: [...(prev?.support?.faq || []), { id: `faq_${Date.now()}`, question: 'Новый вопрос', answer: 'Новый ответ', category: 'general', isActive: true }] } })) : undefined} />
                <div className="tgm-stack">
                  {(adminDraft?.support?.faq || []).map((faq, index) => (
                    <div key={faq.id || index} className="tgm-inline-editor">
                      <label>Вопрос<input value={faq.question || ''} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, support: { ...(prev?.support || {}), faq: (prev?.support?.faq || []).map((item, idx) => idx === index ? { ...item, question: e.target.value } : item) } }))} /></label>
                      <label>Ответ<textarea value={faq.answer || ''} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, support: { ...(prev?.support || {}), faq: (prev?.support?.faq || []).map((item, idx) => idx === index ? { ...item, answer: e.target.value } : item) } }))} /></label>
                      {!readOnlyMiniAppAdmin ? <button type="button" className="tgm-ghost-btn" onClick={() => setAdminDraft((prev) => ({ ...prev, support: { ...(prev?.support || {}), faq: (prev?.support?.faq || []).filter((_, idx) => idx !== index) } }))}><FiTrash2 /> Удалить</button> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {adminPanelTab === 'collections' ? (
              <section className="tgm-card">
                <SectionHeader title="Подборки" subtitle="Блоки «Для вас» на главной" actionLabel={readOnlyMiniAppAdmin ? '' : 'Добавить'} onAction={!readOnlyMiniAppAdmin ? () => setAdminDraft((prev) => ({ ...prev, collections: [...(prev?.collections || []), { id: `collection_${Date.now()}`, title: 'Новая подборка', source: 'featured', category: '', limit: 8, isActive: true, order: (prev?.collections || []).length + 1 }] })) : undefined} />
                <div className="tgm-stack">
                  {(adminDraft?.collections || []).map((collection, index) => (
                    <div key={collection.id || index} className="tgm-inline-editor">
                      <label>Заголовок<input value={collection.title || ''} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, collections: (prev?.collections || []).map((item, idx) => idx === index ? { ...item, title: e.target.value } : item) }))} /></label>
                      <label>Источник<select value={collection.source || 'featured'} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, collections: (prev?.collections || []).map((item, idx) => idx === index ? { ...item, source: e.target.value } : item) }))}><option value="featured">featured</option><option value="discounted">discounted</option><option value="category">category</option><option value="favorites">favorites</option></select></label>
                      <label>Категория<input value={collection.category || ''} disabled={readOnlyMiniAppAdmin} onChange={(e) => setAdminDraft((prev) => ({ ...prev, collections: (prev?.collections || []).map((item, idx) => idx === index ? { ...item, category: e.target.value } : item) }))} /></label>
                      {!readOnlyMiniAppAdmin ? <button type="button" className="tgm-ghost-btn" onClick={() => setAdminDraft((prev) => ({ ...prev, collections: (prev?.collections || []).filter((_, idx) => idx !== index) }))}><FiTrash2 /> Удалить</button> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </main>

      <nav className="tgm-tabbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key && currentScreen.type === 'tab';
          return <button key={tab.key} type="button" className={`tgm-tab ${active ? 'is-active' : ''}`} onClick={() => goTo(tab.key)}><Icon /><span>{tab.label}</span></button>;
        })}
      </nav>
    </div>
  );
}

function applyTheme(themeParams, brandColor) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const params = themeParams || {};
  root.style.setProperty('--tgm-brand', brandColor || params.button_color || '#0b5bd3');
  root.style.setProperty('--tgm-bg', params.bg_color || '#0f172a');
  root.style.setProperty('--tgm-secondary-bg', params.secondary_bg_color || '#111827');
  root.style.setProperty('--tgm-card-bg', params.section_bg_color || params.secondary_bg_color || '#101827');
  root.style.setProperty('--tgm-text', params.text_color || '#f8fafc');
  root.style.setProperty('--tgm-muted', params.hint_color || '#94a3b8');
  root.style.setProperty('--tgm-border', params.section_separator_color || 'rgba(148,163,184,.18)');
  root.style.setProperty('--tgm-link', params.link_color || brandColor || '#0b5bd3');
  root.style.setProperty('--tgm-button-text', params.button_text_color || '#ffffff');
}

function FiMessageCircleShim() {
  return <FiBookOpen />;
}
