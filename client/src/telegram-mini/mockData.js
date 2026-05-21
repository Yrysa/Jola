export const mockSession = {
  accessToken: 'demo',
  refreshToken: 'demo',
  sessionId: 'demo',
  user: {
    profile: {
      id: '10482',
      name: 'Абылайхан',
      phone: '+7 707 111 22 33',
      role: 'клиент',
      registeredAt: '2026-02-12T00:00:00.000Z',
      telegramUsername: 'grow_demo',
    },
    wallet: {
      balance: 18500,
      bonuses: 1250,
      discount: 7,
      loyaltyLevel: 'silver',
    },
  },
  config: {
    settings: {
      blocks: { homeSummary: true, favorites: true, recentlyViewed: true, quickReorder: true, recommendations: true, promos: true, supportFaq: true, notifications: true, loyalty: true, adminControl: true },
      featureFlags: { favorites: true, recentlyViewed: true, quickReorder: true, profileEditing: true, cloudStorage: true, haptics: true, realtimeSync: true, biometry: false, invoicePayments: false, supportChat: true },
      theme: { brandColor: '#0b5bd3', headerColor: 'bg_color', backgroundColor: 'bg_color' },
      editableProfileFields: ['name', 'phone'],
      support: {
        phone: '+7 707 111 22 33',
        telegram: 'https://t.me/jola_support',
        email: 'support@jola.test',
        workingHours: 'Ежедневно 09:00–21:00',
        faq: [
          { id: 'delivery', question: 'Как отследить заказ?', answer: 'Откройте заказ и посмотрите историю статусов.', category: 'orders' },
          { id: 'promo', question: 'Как использовать промокод?', answer: 'На экране «Акции и промокоды» проверьте код по сумме заказа.', category: 'promos' },
        ],
      },
      banners: [
        { id: 'welcome', title: 'Mini App demo', subtitle: 'Это безопасный демо-режим вне Telegram.', badge: 'DEMO', ctaLabel: 'Каталог', actionType: 'view', actionValue: 'catalog', targetView: 'catalog', isActive: true, order: 1 },
      ],
      collections: [
        { id: 'featured', title: 'Подборка для вас', source: 'featured', isActive: true, order: 1 },
      ],
    },
    sync: { serverTime: new Date().toISOString(), ordersRevision: null, productsRevision: null, promosRevision: null, profileRevision: null, settingsRevision: null },
    permissions: { role: 'client', canManageMiniApp: false, readOnlyMiniAppAdmin: false },
  },
};

export const mockBootstrap = {
  profile: mockSession.user.profile,
  wallet: mockSession.user.wallet,
  dashboard: {
    summary: { balance: 18500, bonuses: 1250, discount: 7, activeOrders: 2, deliveredOrders: 4, promoCount: 2, notificationsCount: 3, favoritesCount: 2 },
    banners: mockSession.config.settings.banners,
    collections: [
      { id: 'featured', title: 'Подборка для вас', items: [] },
    ],
    sync: mockSession.config.sync,
    permissions: mockSession.config.permissions,
  },
  favorites: [],
  recentlyViewed: [],
  recentOrders: [],
  notifications: [],
  promoCodes: [],
  support: mockSession.config.settings.support,
};
