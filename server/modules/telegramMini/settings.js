import TelegramMiniSettings from '../../models/TelegramMiniSettings.js';

export const DEFAULT_TELEGRAM_FAQ = [
  {
    id: 'delivery',
    question: 'Как отследить заказ?',
    answer: 'Откройте раздел «Мои заказы» и выберите заказ. Там есть текущий статус и история этапов.',
    category: 'orders',
    order: 1,
    isActive: true,
  },
  {
    id: 'promo',
    question: 'Как использовать промокод?',
    answer: 'Откройте раздел «Акции и промокоды», выберите код и примените его к заказу.',
    category: 'promos',
    order: 2,
    isActive: true,
  },
  {
    id: 'support',
    question: 'Как связаться с менеджером?',
    answer: 'В разделе «Поддержка» нажмите кнопку чата или используйте указанный номер телефона.',
    category: 'support',
    order: 3,
    isActive: true,
  },
];

export const DEFAULT_TELEGRAM_SETTINGS = {
  key: 'global',
  version: 1,
  blocks: {
    homeSummary: true,
    favorites: true,
    recentlyViewed: true,
    quickReorder: true,
    recommendations: true,
    promos: true,
    supportFaq: true,
    notifications: true,
    loyalty: true,
    adminControl: true,
  },
  featureFlags: {
    favorites: true,
    recentlyViewed: true,
    quickReorder: true,
    profileEditing: true,
    cloudStorage: true,
    haptics: true,
    realtimeSync: true,
    biometry: false,
    invoicePayments: false,
    supportChat: true,
  },
  theme: {
    brandColor: '#0b5bd3',
    headerColor: 'bg_color',
    backgroundColor: 'bg_color',
  },
  editableProfileFields: ['name', 'phone'],
  allowedFieldsByRole: {},
  support: {
    phone: process.env.SUPPORT_PHONE || process.env.ADMIN_PHONE || '',
    telegram: process.env.SUPPORT_TELEGRAM || (process.env.TELEGRAM_BOT_USERNAME ? `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}` : ''),
    email: process.env.SUPPORT_EMAIL || process.env.NOTIFY_EMAIL_FROM || process.env.SMTP_USER || '',
    workingHours: process.env.SUPPORT_WORKING_HOURS || 'Ежедневно 09:00–21:00',
    faq: DEFAULT_TELEGRAM_FAQ,
  },
  banners: [
    {
      id: 'welcome',
      title: 'Jola Mini App',
      subtitle: 'Заказы, бонусы, промокоды и поддержка внутри Telegram.',
      badge: 'Telegram',
      ctaLabel: 'Каталог',
      actionType: 'view',
      actionValue: 'catalog',
      targetView: 'catalog',
      isActive: true,
      order: 1,
    },
  ],
  collections: [
    { id: 'featured', title: 'Подборка для вас', source: 'featured', limit: 8, isActive: true, order: 1 },
    { id: 'discounted', title: 'Сейчас со скидкой', source: 'discounted', limit: 8, isActive: true, order: 2 },
  ],
};

export const getTelegramMiniSettings = async () => {
  const existing = await TelegramMiniSettings.findOne({ key: 'global' });
  if (existing) return existing;
  return TelegramMiniSettings.create(DEFAULT_TELEGRAM_SETTINGS);
};
