# Jola Telegram Mini App v3

## Что усилено

### Telegram-нативность
- Back Button и Main Button под ключевые сценарии
- Telegram theme params → CSS variables
- header/background colors
- auto-expand + viewport/safe-area синхронизация
- closing confirmation при несохранённых изменениях
- fallback-режим вне Telegram (`?demo=1` / открытие в обычном браузере)
- bot menu button + direct link support (`https://t.me/<bot>/<app>?startapp=...` при наличии `TELEGRAM_MINI_APP_SHORT_NAME`)

### UX / экраны
- Главная со сводкой
- Каталог с поиском, фильтрами и сортировкой
- Карточка товара с галереей и рекомендациями
- Избранное
- Недавно просмотренные
- Заказы + детальная лента статусов
- Быстрый повтор заказа
- Акции и промокоды
- Уведомления с группировкой
- Профиль с редактированием
- Поддержка + FAQ
- Экран управления Mini App для manager/admin (+ readonly observer)

### Архитектура данных
- versioned API: `/api/telegram-mini/v1/...`
- отдельный settings singleton: `TelegramMiniSettings`
- отдельный session store: `TelegramMiniSession`
- отдельный audit/analytics log: `TelegramMiniAudit`
- DTO/serializer слой
- role-based field policy
- управляемые блоки / feature flags / support / banners / collections

### Безопасность
- серверная валидация `initData`
- access + refresh сессии для Mini App
- TTL для initData / access / refresh
- rate limits для session/api
- аудит запросов и аналитики
- серверная фильтрация полей до ответа
- проверка роли на endpoint
- owner-scope для пользовательских заказов


### Checkout / payment / live updates
- SSE stream: `GET /api/telegram-mini/v1/events`
- realtime invalidate через stream `ready/sync/ping`
- checkout draft preview на backend: `POST /api/telegram-mini/v1/checkout/draft`
- commit заказа внутри Mini App: `POST /api/telegram-mini/v1/checkout/commit`
- повторное создание платёжной сессии: `POST /api/telegram-mini/v1/checkout/:id/payment-session`
- сохранение черновика корзины локально + через Telegram Cloud Storage fallback
- отдельный admin overview: `GET /api/telegram-mini/v1/admin/overview`

### Real-time / refresh
- soft realtime через `/sync`
- ревизии `orders/products/promos/profile/settings`
- selective refetch на клиенте через react-query invalidate

## Новые модели
- `server/models/TelegramMiniSession.js`
- `server/models/TelegramMiniAudit.js`
- `server/models/TelegramMiniSettings.js`

## Новые пользовательские поля
В `server/models/User.js` добавлены:
- `telegramMiniFavoriteProductIds`
- `telegramMiniRecentProductIds`
- `telegramMiniLastAddress`
- роли расширены до: `user`, `client`, `manager`, `admin`, `observer`

## Основные v1 эндпоинты

### Session / auth
- `POST /api/telegram-mini/v1/session`
- `POST /api/telegram-mini/v1/refresh`

### Config / bootstrap / sync
- `GET /api/telegram-mini/v1/config`
- `GET /api/telegram-mini/v1/bootstrap`
- `GET /api/telegram-mini/v1/sync`

### Profile
- `GET /api/telegram-mini/v1/profile`
- `PATCH /api/telegram-mini/v1/profile`

### Products / favorites
- `GET /api/telegram-mini/v1/products`
- `GET /api/telegram-mini/v1/products/:id`
- `POST /api/telegram-mini/v1/products/:id/view`
- `GET /api/telegram-mini/v1/favorites`
- `POST /api/telegram-mini/v1/favorites/:productId`
- `DELETE /api/telegram-mini/v1/favorites/:productId`

### Orders / checkout / live
- `GET /api/telegram-mini/v1/orders`
- `GET /api/telegram-mini/v1/orders/:id`
- `POST /api/telegram-mini/v1/orders/:id/repeat`
- `GET /api/telegram-mini/v1/events`
- `POST /api/telegram-mini/v1/checkout/draft`
- `POST /api/telegram-mini/v1/checkout/commit`
- `POST /api/telegram-mini/v1/checkout/:id/payment-session`

### Notifications / support / promos
- `GET /api/telegram-mini/v1/notifications`
- `GET /api/telegram-mini/v1/support`
- `GET /api/telegram-mini/v1/promocodes`
- `POST /api/telegram-mini/v1/promocodes/preview`

### Admin / analytics
- `GET /api/telegram-mini/v1/admin/overview`
- `GET /api/telegram-mini/v1/admin/settings`
- `PATCH /api/telegram-mini/v1/admin/settings`
- `POST /api/telegram-mini/v1/analytics`

## Что ещё надо проверить после деплоя
1. `TELEGRAM_BOT_TOKEN` задан.
2. Есть публичный `TELEGRAM_WEBAPP_URL`/`PUBLIC_WEB_URL` на HTTPS.
3. Для direct link задан `TELEGRAM_BOT_USERNAME` и `TELEGRAM_MINI_APP_SHORT_NAME`.
4. BotFather настроен на menu button / app short name.
5. Пользователь уже привязал Telegram к аккаунту сайта.
6. Frontend production раздаёт `/telegram/index.html`.
7. Reverse proxy / frontend CSP разрешает `https://telegram.org/js/telegram-web-app.js`.
