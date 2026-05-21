# 📱 Jola Telegram Mini App

Telegram Mini App — отдельный интерфейс Jola внутри Telegram. Он нужен для быстрого просмотра каталога, оформления заказа, получения уведомлений и работы с клиентами без выхода из мессенджера.

---

## 🎯 Назначение

Mini App делает Jola ближе к пользователю:

- открывается прямо из Telegram-бота;
- использует Telegram-профиль для быстрой сессии;
- показывает каталог, корзину, заказы и уведомления;
- поддерживает клиентские и административные сценарии;
- работает как мобильный слой поверх основного backend API.

---

## ✨ Основные экраны

| Экран | Назначение |
|---|---|
| 🏠 Главная | быстрый вход в основные разделы |
| 🛒 Каталог | товары, поиск, фильтры, сортировка |
| 📦 Товар | карточка, изображения, цена, наличие |
| ❤️ Избранное | сохранённые товары пользователя |
| 🧺 Корзина | подготовка заказа |
| 🚚 Checkout | адрес, доставка, оплата, подтверждение |
| 🧾 Заказы | история и статусы заказов |
| 🔔 Уведомления | важные события и обновления |
| 👤 Профиль | данные пользователя и адрес |
| 🆘 Поддержка | FAQ и связь с магазином |
| 🛠️ Admin | обзор заказов и управление настройками |

---

## 🧩 Telegram-возможности

В Mini App используются возможности Telegram Web Apps:

- Back Button;
- Main Button;
- theme params;
- viewport и safe-area;
- подтверждение закрытия при незавершённых действиях;
- запуск через menu button;
- direct link через `startapp`;
- fallback-режим для открытия вне Telegram.

---

## 🔐 Сессия и безопасность

Серверная часть проверяет Telegram `initData`, после чего создаёт сессию Mini App.

Используются:

- проверка подписи Telegram;
- access / refresh сессии;
- ограничение времени жизни сессий;
- rate limit для чувствительных маршрутов;
- аудит действий;
- фильтрация данных перед ответом клиенту;
- разделение ролей пользователя, менеджера, администратора и наблюдателя.

---

## 🔌 Основные маршруты v1

### Session

| Метод | Маршрут | Назначение |
|---|---|---|
| POST | `/api/telegram-mini/v1/session` | создание сессии |
| POST | `/api/telegram-mini/v1/refresh` | обновление сессии |

### Config

| Метод | Маршрут | Назначение |
|---|---|---|
| GET | `/api/telegram-mini/v1/config` | публичная конфигурация |
| GET | `/api/telegram-mini/v1/bootstrap` | стартовые данные приложения |
| GET | `/api/telegram-mini/v1/sync` | синхронизация изменений |

### Profile

| Метод | Маршрут | Назначение |
|---|---|---|
| GET | `/api/telegram-mini/v1/profile` | профиль пользователя |
| PATCH | `/api/telegram-mini/v1/profile` | обновление профиля |

### Products

| Метод | Маршрут | Назначение |
|---|---|---|
| GET | `/api/telegram-mini/v1/products` | каталог товаров |
| GET | `/api/telegram-mini/v1/products/:id` | карточка товара |
| POST | `/api/telegram-mini/v1/products/:id/view` | запись просмотра |
| GET | `/api/telegram-mini/v1/favorites` | избранное |
| POST | `/api/telegram-mini/v1/favorites/:productId` | добавить в избранное |
| DELETE | `/api/telegram-mini/v1/favorites/:productId` | убрать из избранного |

### Orders / Checkout

| Метод | Маршрут | Назначение |
|---|---|---|
| GET | `/api/telegram-mini/v1/orders` | список заказов |
| GET | `/api/telegram-mini/v1/orders/:id` | детали заказа |
| POST | `/api/telegram-mini/v1/orders/:id/repeat` | повтор заказа |
| POST | `/api/telegram-mini/v1/checkout/draft` | предварительный расчёт |
| POST | `/api/telegram-mini/v1/checkout/commit` | создание заказа |
| POST | `/api/telegram-mini/v1/checkout/:id/payment-session` | новая платёжная сессия |

### Events / Notifications

| Метод | Маршрут | Назначение |
|---|---|---|
| GET | `/api/telegram-mini/v1/events` | live-события через SSE |
| GET | `/api/telegram-mini/v1/notifications` | уведомления |
| GET | `/api/telegram-mini/v1/support` | поддержка и FAQ |
| GET | `/api/telegram-mini/v1/promocodes` | промокоды |
| POST | `/api/telegram-mini/v1/promocodes/preview` | проверка промокода |

### Admin

| Метод | Маршрут | Назначение |
|---|---|---|
| GET | `/api/telegram-mini/v1/admin/overview` | сводка для админа |
| GET | `/api/telegram-mini/v1/admin/settings` | настройки Mini App |
| PATCH | `/api/telegram-mini/v1/admin/settings` | обновление настроек |
| POST | `/api/telegram-mini/v1/analytics` | запись аналитики |

---

## 🗄️ Модели данных

Mini App использует отдельные модели для сессий, настроек и аудита:

```txt
server/models/TelegramMiniSession.js
server/models/TelegramMiniAudit.js
server/models/TelegramMiniSettings.js
```

В модели пользователя используются поля для Telegram-сценариев:

- избранные товары;
- недавно просмотренные товары;
- последний адрес доставки;
- расширенные роли доступа.

---

## ⚡ Live-обновления

Для мягкого real-time используется SSE:

```txt
GET /api/telegram-mini/v1/events
```

Клиент получает события синхронизации и обновляет только нужные данные: заказы, товары, промокоды, профиль и настройки.

---

## 🚀 Подготовка к запуску

Перед публикацией проверь:

- Telegram Bot Token указан на сервере;
- публичный сайт работает по HTTPS;
- Telegram BotFather настроен для Mini App;
- задан username бота;
- задан short name приложения;
- frontend корректно отдаёт Telegram-страницу;
- CSP разрешает Telegram Web App SDK;
- пользователь может связать Telegram с аккаунтом Jola;
- production backend доступен с Mini App.

---

## 🧪 Проверка

Минимальный чек-лист:

- Mini App открывается из Telegram;
- тема Telegram применяется к интерфейсу;
- Back Button работает предсказуемо;
- Main Button не перекрывает контент;
- каталог загружается;
- заказ создаётся;
- оплата открывается корректно;
- уведомления приходят;
- админские маршруты закрыты для обычного пользователя.

---

## 📌 Статус

Telegram Mini App — часть экосистемы Jola. Основная цель: дать клиенту быстрый мобильный путь от просмотра товара до заказа прямо внутри Telegram.
