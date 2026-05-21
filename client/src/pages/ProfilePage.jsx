import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { authService } from '../services/authService.js';
import { useQuery } from 'react-query';
import {
  FiActivity,
  FiCamera,
  FiCheckCircle,
  FiClock,
  FiCompass,
  FiCpu,
  FiEdit2,
  FiGlobe,
  FiHeart,
  FiKey,
  FiLayers,
  FiLock,
  FiMail,
  FiMapPin,
  FiMonitor,
  FiNavigation,
  FiPhone,
  FiSave,
  FiSend,
  FiShoppingCart,
  FiTruck,
  FiUser,
  FiWifi,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import PersonalizationLab from '../components/PersonalizationLab.jsx';
import { orderService } from '../services/orderService.js';
import { formatPrice } from '../utils/formatPrice.js';
import { useTranslation } from 'react-i18next';
import './ProfilePage.css';
import { readSessionActivity } from '../utils/sessionActivity.js';

function normalizePhone(input) {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  
  let d = digits;
  if (d.length === 10) d = `7${d}`;

  
  if (d.length === 11 && d.startsWith('8')) d = `7${d.slice(1)}`;

  return `+${d}`;
}

function isValidE164(phone) {
  return /^\+\d{10,15}$/.test(phone);
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'U';
  const first = parts[0]?.[0] || 'U';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return `${first}${last}`.toUpperCase();
}

function buildSparklinePoints(values) {
  const max = Math.max(...values, 1);
  const w = 120;
  const h = 32;
  const n = values.length;
  const step = n <= 1 ? w : w / (n - 1);

  return values
    .map((v, i) => {
      const x = i * step;
      const y = h - (v / max) * (h - 2) - 1;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}


function formatDuration(value, language = 'ru') {
  const ms = Number(value || 0);
  if (!ms) return language.startsWith('ru') ? 'Только началась' : 'Just started';

  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (language.startsWith('ru')) {
    if (hours > 0) return `${hours} ч ${minutes} мин`;
    return `${minutes} мин`;
  }

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatReferrer(referrer, language = 'ru') {
  if (!referrer || referrer === 'direct') return language.startsWith('ru') ? 'Прямой вход' : 'Direct visit';
  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return referrer;
  }
}

function humanizeRoute(pathname, language = 'ru') {
  const map = {
    '/': language.startsWith('ru') ? 'Главная' : 'Home',
    '/products': language.startsWith('ru') ? 'Товары' : 'Products',
    '/favorites': language.startsWith('ru') ? 'Избранное' : 'Favorites',
    '/cart': language.startsWith('ru') ? 'Корзина' : 'Cart',
    '/checkout': language.startsWith('ru') ? 'Оформление' : 'Checkout',
    '/orders': language.startsWith('ru') ? 'Заказы' : 'Orders',
    '/contacts': language.startsWith('ru') ? 'Контакты' : 'Contacts',
    '/profile': language.startsWith('ru') ? 'Профиль' : 'Profile',
    '/polygraphy': language.startsWith('ru') ? 'Полиграфия' : 'Print',
    '/polygraphy/editor': language.startsWith('ru') ? 'Редакторы' : 'Editors',
    '/polygraphy/editor/pdf': 'PDF editor',
    '/polygraphy/editor/images': language.startsWith('ru') ? 'Редактор изображений' : 'Image editor',
    '/polygraphy/editor/office': 'DOCX editor',
    '/admin': language.startsWith('ru') ? 'Админка' : 'Admin',
  };

  if (!pathname) return '—';
  if (map[pathname]) return map[pathname];
  if (pathname.startsWith('/products/')) return language.startsWith('ru') ? 'Карточка товара' : 'Product page';
  if (pathname.startsWith('/orders/')) return language.startsWith('ru') ? 'Детали заказа' : 'Order details';
  if (pathname.startsWith('/polygraphy/')) return language.startsWith('ru') ? 'Услуга полиграфии' : 'Print service';
  return pathname;
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');

  const [activeTab, setActiveTab] = useState('overview');
  const [sessionActivity, setSessionActivity] = useState(() => readSessionActivity(user?._id));

  const activityText = useMemo(() => ({
    title: isRu ? 'Цифровой след сессии' : 'Session footprint',
    subtitle: isRu ? 'Автоматически собираем, откуда ты зашёл, на чём сидишь и как ходишь по сайту.' : 'Automatic snapshot of how you entered, what device you use and how you move across the site.',
    source: isRu ? 'Источник входа' : 'Entry source',
    city: isRu ? 'Город / регион' : 'City / region',
    browser: isRu ? 'Браузер' : 'Browser',
    device: isRu ? 'Устройство' : 'Device',
    pages: isRu ? 'Просмотров страниц' : 'Page views',
    session: isRu ? 'Сессия' : 'Session',
    journey: isRu ? 'Маршрут по сайту' : 'Route journey',
    environment: isRu ? 'Среда и устройство' : 'Environment',
    topRoutes: isRu ? 'Чаще всего открывал' : 'Most opened',
    lastSeen: isRu ? 'Последняя активность' : 'Last activity',
    started: isRu ? 'Старт сессии' : 'Session start',
    unknown: isRu ? 'Не определено' : 'Unknown',
    emptyJourney: isRu ? 'Пока мало данных по переходам.' : 'Not enough page history yet.',
    page: isRu ? 'Страница' : 'Page',
    viewport: isRu ? 'Окно' : 'Viewport',
    screen: isRu ? 'Экран' : 'Screen',
    network: isRu ? 'Сеть' : 'Network',
    system: isRu ? 'Система' : 'System',
    language: isRu ? 'Язык' : 'Language',
    timezone: isRu ? 'Часовой пояс' : 'Timezone',
    hardware: isRu ? 'Железо' : 'Hardware',
    cores: isRu ? 'Ядер CPU' : 'CPU cores',
    memory: isRu ? 'Память' : 'Memory',
  }), [isRu]);

  
  const [tgLink, setTgLink] = useState('');
  const [tgExpiresAt, setTgExpiresAt] = useState(null);
  const [tgLoading, setTgLoading] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  const fileInputRef = useRef(null);
  const [showDataUrl, setShowDataUrl] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || user?.avatar || '',
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      zipCode: user?.address?.zipCode || '',
      country: user?.address?.country || '',
    },
    phone: user?.phone || '',
  });

  useEffect(() => {
    if (!user) return;
    setFormData({
      name: user.name || '',
      email: user.email || '',
      avatarUrl: user.avatarUrl || user.avatar || '',
      address: {
        street: user.address?.street || '',
        city: user.address?.city || '',
        zipCode: user.address?.zipCode || '',
        country: user.address?.country || '',
      },
      phone: user.phone || '',
    });
  }, [user]);

  useEffect(() => {
    if (!user?._id) {
      setSessionActivity(null);
      return undefined;
    }

    const syncActivity = () => setSessionActivity(readSessionActivity(user._id));
    syncActivity();
    const timer = window.setInterval(syncActivity, 5000);
    window.addEventListener('storage', syncActivity);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', syncActivity);
    };
  }, [user?._id]);

  const refreshMe = async () => {
    try {
      const me = await authService.getMe();
      updateUser(me.user);
    } catch {
      
    }
  };

  const handleTelegramLink = async () => {
    try {
      setTgLoading(true);
      const data = await authService.getTelegramLink();
      setTgLink(data.link);
      setTgExpiresAt(data.expiresAt);
      toast.success('Ссылка для Telegram создана');
    } catch (e) {
      toast.error(e?.message || 'Не удалось создать ссылку');
    } finally {
      setTgLoading(false);
    }
  };

  const handleTelegramDisconnect = async () => {
    try {
      setTgLoading(true);
      await authService.disconnectTelegram();
      setTgLink('');
      setTgExpiresAt(null);
      await refreshMe();
      toast.success('Telegram отвязан');
    } catch (e) {
      toast.error(e?.message || 'Не удалось отвязать Telegram');
    } finally {
      setTgLoading(false);
    }
  };

  const avatarPreview = formData.avatarUrl || user?.avatarUrl || user?.avatar;
  const initials = getInitials(user?.name);

  const {
    data: myOrdersData,
    isLoading: isOrdersLoading,
    error: ordersError,
  } = useQuery('my-orders-profile', orderService.getMyOrders, {
    enabled: Boolean(user),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const orders = myOrdersData?.orders || [];
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === 'delivered' || o.isDelivered).length;
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;
  const inProgressOrders = orders.filter((o) => ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status)).length;
  const totalSpent = orders.reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0);

  const deliveryProgress = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

  const weeklyCounts = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - idx));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const counts = days.map((day) => {
      const start = new Date(day);
      const end = new Date(day);
      end.setDate(end.getDate() + 1);
      return orders.filter((o) => {
        const created = new Date(o.createdAt);
        return created >= start && created < end;
      }).length;
    });

    return counts;
  }, [orders]);

  const sparkline = useMemo(() => buildSparklinePoints(weeklyCounts), [weeklyCounts]);

  const recentOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sorted.slice(0, 6);
  }, [orders]);

  const activitySnapshot = sessionActivity?.snapshot || {};
  const activityGeo = sessionActivity?.geo || {};

  const activityJourney = useMemo(() => {
    const visits = Array.isArray(sessionActivity?.visits) ? sessionActivity.visits : [];
    return [...visits].slice(-8).reverse();
  }, [sessionActivity]);

  const activityTopRoutes = useMemo(() => {
    const stats = Object.entries(sessionActivity?.routeStats || {});
    return stats.sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [sessionActivity]);

  const geoLabel = [activityGeo.city, activityGeo.region, activityGeo.country].filter(Boolean).join(', ') || activityText.unknown;
  const sessionDurationLabel = formatDuration(sessionActivity?.activeMs, isRu ? 'ru' : 'en');
  const sourceLabel = formatReferrer(activitySnapshot.referrer, isRu ? 'ru' : 'en');

  const activitySummaryCards = [
    { icon: <FiCompass />, label: activityText.source, value: sourceLabel },
    { icon: <FiMapPin />, label: activityText.city, value: geoLabel },
    { icon: <FiGlobe />, label: activityText.browser, value: activitySnapshot.browser || activityText.unknown },
    { icon: <FiMonitor />, label: activityText.device, value: `${activitySnapshot.deviceType || activityText.unknown} · ${activitySnapshot.os || activityText.unknown}` },
    { icon: <FiLayers />, label: activityText.pages, value: String(sessionActivity?.totalViews || 0) },
    { icon: <FiClock />, label: activityText.session, value: sessionDurationLabel },
  ];

  const activityFacts = [
    { icon: <FiNavigation />, label: activityText.page, value: humanizeRoute(sessionActivity?.lastPath, isRu ? 'ru' : 'en') },
    { icon: <FiClock />, label: activityText.started, value: formatDateTime(sessionActivity?.sessionStartedAt) },
    { icon: <FiActivity />, label: activityText.lastSeen, value: formatDateTime(sessionActivity?.lastSeenAt) },
    { icon: <FiMonitor />, label: activityText.viewport, value: activitySnapshot.viewport || activityText.unknown },
    { icon: <FiMonitor />, label: activityText.screen, value: activitySnapshot.screen || activityText.unknown },
    { icon: <FiWifi />, label: activityText.network, value: activitySnapshot.connection || activityText.unknown },
    { icon: <FiCpu />, label: activityText.system, value: `${activitySnapshot.os || activityText.unknown} · ${activitySnapshot.platform || activityText.unknown}` },
    { icon: <FiGlobe />, label: activityText.language, value: activitySnapshot.language || activityText.unknown },
    { icon: <FiMapPin />, label: activityText.timezone, value: activitySnapshot.timezone || activityText.unknown },
    { icon: <FiCpu />, label: activityText.hardware, value: [activitySnapshot.cores ? `${activityText.cores}: ${activitySnapshot.cores}` : null, activitySnapshot.memoryGb ? `${activityText.memory}: ${activitySnapshot.memoryGb} GB` : null].filter(Boolean).join(' · ') || activityText.unknown },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePhoneBlur = () => {
    const normalized = normalizePhone(formData.phone);
    if (normalized) {
      setFormData((prev) => ({ ...prev, phone: normalized }));
    }
  };

  const handlePickAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.errors.avatarType'));
      return;
    }

    const maxMb = 3;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(t('profile.errors.avatarSize', { max: maxMb }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setFormData((prev) => ({ ...prev, avatarUrl: result }));
      toast.success(t('profile.avatar.uploaded'));
    };
    reader.readAsDataURL(file);
  };

  const clearAvatar = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedAvatarUrl = formData.avatarUrl.trim();
    const trimmedAddress = {
      street: formData.address.street.trim(),
      city: formData.address.city.trim(),
      zipCode: formData.address.zipCode.trim(),
      country: formData.address.country.trim(),
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !trimmedName ||
      !trimmedEmail ||
      !trimmedAddress.street ||
      !trimmedAddress.city ||
      !trimmedAddress.zipCode ||
      !trimmedAddress.country
    ) {
      toast.error(t('profile.errors.fillAll'));
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      toast.error(t('profile.errors.email'));
      return;
    }

    const normalizedPhone = normalizePhone(trimmedPhone);
    if (!normalizedPhone || !isValidE164(normalizedPhone)) {
      toast.error(t('profile.errors.phone'));
      return;
    }

    
    if (trimmedAvatarUrl) {
      const isData = /^data:image\
      if (!isData) {
        try {
          const u = new URL(trimmedAvatarUrl);
          if (!/^https?:$/.test(u.protocol)) throw new Error('bad protocol');
        } catch (error) {
          toast.error(t('profile.errors.avatarUrl'));
          return;
        }
      }
    }

    try {
      const updated = await authService.updateProfile({
        ...formData,
        name: trimmedName,
        email: trimmedEmail,
        phone: normalizedPhone,
        avatarUrl: trimmedAvatarUrl,
        address: trimmedAddress,
      });

      updateUser(updated.user);

      setFormData({
        name: updated.user.name,
        email: updated.user.email,
        avatarUrl: updated.user.avatarUrl,
        address: updated.user.address || trimmedAddress,
        phone: updated.user.phone,
      });

      toast.success(t('profile.success'));
    } catch (error) {
      toast.error(error.message || t('profile.errors.update'));
    }
  };

  const goEdit = () => {
    setActiveTab('settings');
    
    window.setTimeout(() => {
      const el = document.getElementById('profile-edit');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const onPasswordField = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    const currentPassword = String(passwordData.currentPassword || '');
    const newPassword = String(passwordData.newPassword || '');
    const confirmPassword = String(passwordData.confirmPassword || '');

    if (newPassword.length < 6) {
      toast.error(t('profile.security.errors.tooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('profile.security.errors.mismatch'));
      return;
    }

    try {
      setPasswordSaving(true);
      await authService.changePassword({ currentPassword, newPassword });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(t('profile.security.success'));
    } catch (error) {
      toast.error(error.message || t('profile.security.errors.failed'));
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="container">
        <motion.div
          className="profile-shell"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="profile-cover" style={{ ['--avatar-url']: `url(${avatarPreview || ''})` }}>
            <div className="profile-cover-inner">
              <div className="profile-hero">
                <div className="profile-identity">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={user?.name} className="profile-avatar" />
                  ) : (
                    <div className="profile-avatar profile-avatar--placeholder" aria-label="Avatar placeholder">
                      {initials}
                    </div>
                  )}

                  <div className="profile-meta">
                    <div className="profile-name-row">
                      <h2 className="profile-name">{user?.name}</h2>
                      <span className="profile-status" title={t('profile.info.online')}>●</span>
                    </div>

                    <p className="profile-role">
                      {user?.role === 'admin' ? t('profile.role.admin') : t('profile.role.user')}
                    </p>

                    <div className="profile-mini">
                      <span className="profile-mini-item">
                        <FiMail /> {user?.email}
                      </span>
                      {user?.phone && (
                        <span className="profile-mini-item">
                          <FiPhone /> {user.phone}
                        </span>
                      )}
                    </div>

                    <div className="profile-cta">
                      <button type="button" className="btn btn-secondary" onClick={() => navigate('/products')}>
                        <FiShoppingCart /> {t('nav.home', { defaultValue: 'Главная' })}
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={goEdit}>
                        <FiEdit2 /> {t('profile.actions.edit')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-stats">
                <div className="stat-card">
                  <div className="stat-title">{t('profile.stats.orders')}</div>
                  <div className="stat-value">{totalOrders}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">{t('profile.stats.delivered')}</div>
                  <div className="stat-value">{deliveredOrders}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">{t('profile.stats.inProgress')}</div>
                  <div className="stat-value">{inProgressOrders}</div>
                </div>
                <div className="stat-card stat-card--chart">
                  <div className="stat-title">{t('profile.stats.activity7d')}</div>
                  <div className="sparkline" aria-label="Orders activity chart">
                    <svg viewBox="0 0 120 32" width="120" height="32" role="img">
                      <polyline points={sparkline} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="profile-progress">
                <div className="profile-progress-row">
                  <span className="profile-progress-label">
                    {t('profile.progress.deliveredOfTotal', { delivered: deliveredOrders, total: totalOrders })}
                    {cancelledOrders > 0 ? ` • ${t('profile.progress.cancelled', { count: cancelledOrders })}` : ''}
                  </span>
                  <span className="profile-progress-pct">{deliveryProgress}%</span>
                </div>
                <div className="profile-progress-bar" role="progressbar" aria-valuenow={deliveryProgress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="profile-progress-fill" style={{ width: `${deliveryProgress}%` }} />
                </div>

                <div className="profile-progress-spent">{t('profile.stats.spent')}: <strong>{formatPrice(totalSpent)}</strong></div>
              </div>
            </div>
          </div>

          <div className="profile-grid">
            <div className="profile-tabs" role="tablist" aria-label={t('profile.tabs.aria')}>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'overview'}
                className={activeTab === 'overview' ? 'profile-tab profile-tab--active' : 'profile-tab'}
                onClick={() => setActiveTab('overview')}
              >
                {t('profile.tabs.overview')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'settings'}
                className={activeTab === 'settings' ? 'profile-tab profile-tab--active' : 'profile-tab'}
                onClick={() => setActiveTab('settings')}
              >
                {t('profile.tabs.settings')}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'security'}
                className={activeTab === 'security' ? 'profile-tab profile-tab--active' : 'profile-tab'}
                onClick={() => setActiveTab('security')}
              >
                {t('profile.tabs.security')}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'activity'}
                className={activeTab === 'activity' ? 'profile-tab profile-tab--active' : 'profile-tab'}
                onClick={() => setActiveTab('activity')}
              >
                {t('profile.tabs.activity')}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'personalization'}
                className={activeTab === 'personalization' ? 'profile-tab profile-tab--active' : 'profile-tab'}
                onClick={() => setActiveTab('personalization')}
              >
                {t('profile.tabs.personalization', { defaultValue: (i18n.language || 'ru').toLowerCase().startsWith('ru') ? 'Персонализация' : 'Personalization' })}
              </button>
            </div>

            <div className="profile-main">
              {activeTab === 'overview' && (
              <div className="profile-info-card" role="tabpanel">
                <div className="profile-info-title">{t('profile.info.title')}</div>
                <div className="profile-info-rows">
                  <div className="info-row">
                    <FiMail /> <span className="info-label">{t('profile.info.email')}</span>
                    <span className="info-value">{user?.email || '—'}</span>
                  </div>
                  <div className="info-row">
                    <FiPhone /> <span className="info-label">{t('profile.info.phone')}</span>
                    <span className="info-value">{user?.phone || '—'}</span>
                  </div>
                  <div className="info-row">
                    <FiMapPin /> <span className="info-label">{t('profile.info.address')}</span>
                    <span className="info-value">
                      {user?.address?.street ? `${user.address.street}, ${user.address.city}, ${user.address.country}` : '—'}
                    </span>
                  </div>
                  <div className="info-row">
                    <FiCheckCircle /> <span className="info-label">{t('profile.info.registered')}</span>
                    <span className="info-value">{formatDateTime(user?.createdAt)}</span>
                  </div>
                  <div className="info-row">
                    <FiCheckCircle /> <span className="info-label">{t('profile.info.lastLogin')}</span>
                    <span className="info-value">{formatDateTime(user?.lastLogin)}</span>
                  </div>
                </div>
              </div>

              )}

              {activeTab === 'activity' && (
                <div className="profile-panel profile-panel--activity" role="tabpanel">
                  <div className="panel-head">
                    <div>
                      <div className="panel-title">{activityText.title}</div>
                      <div className="panel-subtitle">{activityText.subtitle}</div>
                    </div>

                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/orders')}>
                      <FiTruck /> {t('profile.activity.viewAll')}
                    </button>
                  </div>

                  <div className="activity-dashboard">
                    <div className="activity-summary-grid">
                      {activitySummaryCards.map((item) => (
                        <div key={item.label} className="activity-summary-card">
                          <span className="activity-summary-icon">{item.icon}</span>
                          <span className="activity-summary-label">{item.label}</span>
                          <strong className="activity-summary-value">{item.value}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="activity-columns">
                      <section className="activity-card">
                        <div className="activity-card__head">
                          <h3>{activityText.environment}</h3>
                          <span className="activity-kicker">Live</span>
                        </div>
                        <div className="activity-facts-grid">
                          {activityFacts.map((item) => (
                            <div key={item.label} className="activity-fact">
                              <span className="activity-fact__icon">{item.icon}</span>
                              <div>
                                <div className="activity-fact__label">{item.label}</div>
                                <div className="activity-fact__value">{item.value}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="activity-card">
                        <div className="activity-card__head">
                          <h3>{activityText.journey}</h3>
                          <span className="activity-kicker">{activityJourney.length}</span>
                        </div>

                        {activityJourney.length === 0 ? (
                          <div className="panel-note">{activityText.emptyJourney}</div>
                        ) : (
                          <div className="activity-journey">
                            {activityJourney.map((visit, idx) => (
                              <div key={`${visit.path}-${visit.at}-${idx}`} className="activity-journey-row">
                                <div className="activity-journey-dot" />
                                <div className="activity-journey-content">
                                  <div className="activity-journey-title">{humanizeRoute(visit.path, isRu ? 'ru' : 'en')}</div>
                                  <div className="activity-journey-meta">{visit.path} · {formatDateTime(visit.at)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="activity-card__head activity-card__head--spaced">
                          <h3>{activityText.topRoutes}</h3>
                        </div>
                        <div className="activity-chip-cloud">
                          {activityTopRoutes.length === 0 ? <span className="activity-chip">—</span> : activityTopRoutes.map(([path, count]) => (
                            <span key={path} className="activity-chip">{humanizeRoute(path, isRu ? 'ru' : 'en')} · {count}</span>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>

                  <div className="activity-orders-block">
                    <div className="activity-card__head activity-card__head--spaced">
                      <h3>{t('profile.activity.title')}</h3>
                      <span className="activity-kicker">{recentOrders.length}</span>
                    </div>

                    {isOrdersLoading ? (
                      <div className="panel-note">{t('common.loading')}</div>
                    ) : ordersError ? (
                      <div className="panel-note">{t('orders.loadError')}</div>
                    ) : recentOrders.length === 0 ? (
                      <div className="panel-note">{t('profile.activity.empty')}</div>
                    ) : (
                      <div className="orders-table" role="table" aria-label={t('profile.activity.title')}>
                        <div className="orders-row orders-row--head" role="row">
                          <div role="columnheader">{t('profile.activity.columns.id')}</div>
                          <div role="columnheader">{t('profile.activity.columns.date')}</div>
                          <div role="columnheader">{t('profile.activity.columns.status')}</div>
                          <div role="columnheader">{t('profile.activity.columns.items')}</div>
                          <div role="columnheader">{t('profile.activity.columns.total')}</div>
                          <div role="columnheader" />
                        </div>

                        {recentOrders.map((o) => {
                          const statusKey = String(o.status || (o.isDelivered ? 'delivered' : 'pending'));
                          const statusLabel = t(`orderStatuses.${statusKey}`, { defaultValue: statusKey });
                          const itemsCount =
                            (Array.isArray(o.orderItems) ? o.orderItems.length : 0) +
                            (Array.isArray(o.serviceItems) ? o.serviceItems.length : 0) ||
                            (o.items?.length || 0);
                          const idShort = String(o._id || '').slice(-6);

                          return (
                            <div key={o._id} className="orders-row" role="row">
                              <div role="cell" className="mono" data-label={t('profile.activity.columns.id')}>#{idShort}</div>
                              <div role="cell" data-label={t('profile.activity.columns.date')}>{formatDateTime(o.createdAt)}</div>
                              <div role="cell" data-label={t('profile.activity.columns.status')}>
                                <span className={`status-pill status-pill--${statusKey}`}>{statusLabel}</span>
                              </div>
                              <div role="cell" data-label={t('profile.activity.columns.items')}>{itemsCount || '—'}</div>
                              <div role="cell" data-label={t('profile.activity.columns.total')}><strong>{formatPrice(o.totalPrice)}</strong></div>
                              <div role="cell" className="orders-open">
                                <button type="button" className="btn btn-secondary" onClick={() => navigate(`/orders/${o._id}`)}>
                                  {t('profile.activity.columns.open')}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}


              {activeTab === 'security' && (
                <div className="profile-panel" role="tabpanel">
                  <div className="panel-head">
                    <div>
                      <div className="panel-title">{t('profile.security.title')}</div>
                      <div className="panel-subtitle">{t('profile.security.changePassword')}</div>
                    </div>
                  </div>

                  <form className="security-form" onSubmit={handleChangePassword}>
                    <div className="form-group">
                      <label htmlFor="currentPassword">
                        <FiKey /> {t('profile.security.currentPassword')}
                      </label>
                      <input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={onPasswordField}
                        autoComplete="current-password"
                        required
                      />
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="newPassword">
                          <FiLock /> {t('profile.security.newPassword')}
                        </label>
                        <input
                          id="newPassword"
                          name="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={onPasswordField}
                          autoComplete="new-password"
                          required
                        />
                        <div className="field-hint">{t('profile.security.hint')}</div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="confirmPassword">
                          <FiLock /> {t('profile.security.repeatPassword')}
                        </label>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={onPasswordField}
                          autoComplete="new-password"
                          required
                        />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      className="btn btn-primary btn-save"
                      disabled={passwordSaving}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FiSave /> {passwordSaving ? t('common.loading') : t('profile.security.save')}
                    </motion.button>
                  </form>
                </div>
              )}

              {activeTab === 'personalization' && (
                <div className="profile-panel" role="tabpanel">
                  <PersonalizationLab />
                </div>
              )}

              {activeTab === 'settings' && (
              <form id="profile-edit" onSubmit={handleSubmit} className="profile-form" role="tabpanel">
                <div className="form-section">
                  <h3>
                    <FiUser /> {t('profile.sections.basic')}
                  </h3>

                  <div className="avatar-editor">
                    <div className="avatar-preview">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt={t('profile.fields.avatarAlt')} />
                      ) : (
                        <div className="avatar-fallback">{initials}</div>
                      )}
                    </div>

                    <div className="avatar-controls">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFile}
                        style={{ display: 'none' }}
                      />

                      <div className="avatar-buttons">
                        <button type="button" className="btn btn-secondary" onClick={handlePickAvatar}>
                          <FiCamera /> {t('profile.avatar.upload')}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={clearAvatar}>
                          {t('profile.avatar.clear')}
                        </button>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="avatarUrl">
                          <FiCamera /> {t('profile.fields.avatarUrl')}
                        </label>

                        {formData.avatarUrl?.startsWith('data:image/') ? (
                          <div className="avatar-data-hint">
                            <div className="avatar-data-row">
                              <span>{t('profile.avatar.dataLoaded')}</span>
                              <button type="button" className="link-btn" onClick={() => setShowDataUrl((v) => !v)}>
                                {showDataUrl ? t('profile.avatar.hideData') : t('profile.avatar.showData')}
                              </button>
                            </div>
                            {showDataUrl && (
                              <textarea
                                className="avatar-data"
                                readOnly
                                value={formData.avatarUrl}
                              />
                            )}
                          </div>
                        ) : (
                          <input
                            type="url"
                            id="avatarUrl"
                            name="avatarUrl"
                            value={formData.avatarUrl}
                            onChange={handleChange}
                            placeholder={t('profile.fields.avatarUrlPlaceholder')}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="name">
                      <FiUser /> {t('profile.fields.name')}
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">
                      <FiMail /> {t('profile.fields.email')}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">
                      <FiPhone /> {t('profile.fields.phone')}
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={handlePhoneBlur}
                      placeholder={t('profile.fields.phonePlaceholder')}
                      autoComplete="tel"
                      required
                    />
                    <div className="field-hint">{t('profile.fields.phoneHint')}</div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>
                    <FiMapPin /> {t('profile.sections.address')}
                  </h3>

                  <div className="form-group">
                    <label htmlFor="street">{t('profile.fields.street')}</label>
                    <input
                      type="text"
                      id="street"
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="city">{t('profile.fields.city')}</label>
                      <input
                        type="text"
                        id="city"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="zipCode">{t('profile.fields.zip')}</label>
                      <input
                        type="text"
                        id="zipCode"
                        name="address.zipCode"
                        value={formData.address.zipCode}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="country">{t('profile.fields.country')}</label>
                    <input
                      type="text"
                      id="country"
                      name="address.country"
                      value={formData.address.country}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h3>
                    <FiSend /> Telegram
                  </h3>

                  <div className={`tg-status ${user?.telegramConnected ? 'ok' : 'warn'}`}>
                    {user?.telegramConnected ? (
                      <>
                        ✅ Подключено {user?.telegramUsername ? `(@${user.telegramUsername})` : ''}
                      </>
                    ) : (
                      <>⚠️ Не подключено</>
                    )}
                  </div>


                  <div className="tg-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleTelegramLink}
                      disabled={tgLoading}
                    >
                      Получить ссылку для бота
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={refreshMe}
                      disabled={tgLoading}
                    >
                      Проверить
                    </button>
                    {user?.telegramConnected ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate('/orders?telegram=1')}
                        disabled={tgLoading}
                      >
                        Мои заказы из Telegram
                      </button>
                    ) : null}
                    {user?.telegramConnected && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleTelegramDisconnect}
                        disabled={tgLoading}
                      >
                        Отвязать
                      </button>
                    )}
                  </div>

                  {tgLink && (
                    <div className="tg-link">
                      <div className="tg-link-row">
                        <input className="input" value={tgLink} readOnly />
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={async () => {
                            await navigator.clipboard.writeText(tgLink);
                            toast.success('Скопировано');
                          }}
                        >
                          Скопировать
                        </button>
                      </div>
                      {tgExpiresAt && (
                        <div className="field-hint">Ссылка действует до: {new Date(tgExpiresAt).toLocaleString()}</div>
                      )}
                      <div className="field-hint">После привязки в Telegram доступны команды: /app, /myorders, /help</div>
                    </div>
                  )}
                  {user?.telegramConnected ? (
                    <div className="field-hint">После входа из Telegram откроется раздел только с вашими заказами и их деталями.</div>
                  ) : null}
                </div>

                <motion.button
                  type="submit"
                  className="btn btn-primary btn-save"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiSave /> {t('profile.actions.save')}
                </motion.button>
              </form>

              )}
            </div>

            <aside className="profile-side">
              <div className="side-card side-card--quick-actions">
                <div className="side-card-title">
                  <FiCheckCircle /> {t('profile.quick.title')}
                </div>
                <div className="side-actions">
                  <button type="button" className="btn btn-primary" onClick={() => navigate('/products')}>
                    <FiShoppingCart /> {t('nav.home', { defaultValue: 'Главная' })}
                  </button>

                  <a
                    className="btn btn-secondary"
                    href="https://t.me/Yrysyessey"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FiSend /> {t('profile.actions.openTelegram')}
                  </a>

                  <button type="button" className="btn btn-secondary" onClick={() => navigate('/orders')}>
                    <FiTruck /> {t('profile.actions.myOrders')}
                  </button>

                  <button type="button" className="btn btn-secondary" onClick={() => navigate('/cart')}>
                    <FiShoppingCart /> {t('profile.actions.cart')}
                  </button>

                  <button type="button" className="btn btn-secondary" onClick={() => navigate('/favorites')}>
                    <FiHeart /> {t('profile.actions.favorites', { defaultValue: 'Избранное' })}
                  </button>

                  <button type="button" className="btn btn-secondary" onClick={logout}>
                    {t('profile.actions.logout')}
                  </button>
                </div>
              </div>

              <div className="side-card side-card--telegram-hub">
                <div className="side-card-title">
                  <FiSend /> Telegram hub
                </div>
                <div className="telegram-hub-copy">
                  <strong>{user?.telegramConnected ? (isRu ? 'Telegram уже подключён' : 'Telegram is connected') : (isRu ? 'Подключите Telegram к аккаунту' : 'Link Telegram to your account')}</strong>
                  <p>{user?.telegramConnected ? (isRu ? 'Открывайте приложение из бота и сразу попадайте в свои заказы с деталями.' : 'Open the app from the bot and land directly in your own order stream.') : (isRu ? 'Получите ссылку, подключите бота и откройте мобильный поток своих заказов.' : 'Generate a link, connect the bot, and unlock your mobile order stream.')}</p>
                </div>
                <div className={`tg-status ${user?.telegramConnected ? 'ok' : 'warn'}`}>
                  {user?.telegramConnected ? (
                    <>✅ {isRu ? 'Подключено' : 'Connected'} {user?.telegramUsername ? `(@${user.telegramUsername})` : ''}</>
                  ) : (
                    <>⚠️ {isRu ? 'Не подключено' : 'Not connected'}</>
                  )}
                </div>
                <div className="telegram-hub-actions">
                  <button type="button" className="btn btn-primary" onClick={handleTelegramLink} disabled={tgLoading}>
                    <FiSend /> {isRu ? 'Получить ссылку' : 'Get bot link'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => navigate('/orders?telegram=1')}>
                    <FiTruck /> {isRu ? 'Открыть режим Telegram' : 'Open Telegram mode'}
                  </button>
                </div>
                {tgLink ? (
                  <div className="telegram-hub-link">
                    <input className="input" value={tgLink} readOnly />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={async () => {
                        await navigator.clipboard.writeText(tgLink);
                        toast.success(isRu ? 'Скопировано' : 'Copied');
                      }}
                    >
                      {isRu ? 'Скопировать' : 'Copy'}
                    </button>
                  </div>
                ) : null}
              </div>

            </aside>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
