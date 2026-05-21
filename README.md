# Jola — интернет‑магазин (Full‑Stack)

Стек: **React (Vite)** + **Node.js/Express** + **MongoDB**.

В проекте реализовано:
- Каталог товаров: поиск, фильтры, сортировка, «в наличии».
- Корзина: ограничение количества по остаткам.
- Оформление заказа: модуль доставки (**deliveryWindow / deliveryDays / expectedDeliveryDate**).
- Оплата: **Stripe (Card)** или **Cash on delivery**.
- Админка: CRUD товаров, CRUD категорий (RU/EN), управление заказами (статусы + комментарий админа).
- Склад: списание остатков при заказе, запрет купить больше остатка, **лог изменений остатков**.
- Уведомления: Telegram бот и/или Email о новом заказе (через env).
- Безопасность/качество: helmet, rate-limit, mongo-sanitize, XSS sanitizer, hpp, morgan.
- i18n: переключатель **RU/EN** в шапке рядом с профилем.
- Полиграфия: загрузка файлов, конфиг печати, перерасчёт цены, хранение файлов и привязка к заказу.
- Онлайн‑редакторы в «Полиграфии»: изображения, PDF‑редактор и офисный редактор DOCX (встроенный редактор Jola).

---

## Быстрый старт

### 1) Установить зависимости

```bash
# server
cd server
npm i

# client
cd ../client
npm i
```

### 2) Настроить переменные окружения

Скопируйте примеры:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Отредактируйте `server/.env`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/jola
CLIENT_URL=http://localhost:5173

JWT_SECRET=your_secret

# Stripe (опционально)
STRIPE_SECRET_KEY=
# Webhook secret (Stripe Dashboard → Developers → Webhooks)
STRIPE_WEBHOOK_SECRET=

# Telegram уведомления (опционально)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Email уведомления (опционально)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
NOTIFY_EMAIL_TO=
NOTIFY_EMAIL_FROM=
```

`client/.env` обычно менять не нужно (по умолчанию `VITE_API_URL=http://localhost:5000/api`).

OnlyOffice backend удалён из проекта — офисный редактор работает прямо в браузере.

### 3) Запуск

```bash
# server
cd server
npm run dev

# client
cd ../client
npm run dev
```

Откройте: `http://localhost:5173`

---

## API (кратко)

- `GET /api/products` — список товаров (search, category, minPrice, maxPrice, inStock, sort)
- `GET /api/categories` — категории RU/EN
- `POST /api/categories` — создать категорию (admin)
- `POST /api/orders` — создать заказ
- `PUT /api/orders/:id/status` — смена статуса/заметка (admin)

### Stripe webhook

- `POST /api/payments/stripe/webhook` — обработчик подтверждения оплаты (источник истины для `isPaid`).

---

## Заметки

- Категории хранятся в коллекции `categories` как `{ key, nameRu, nameEn }`.
- В `Product.category` хранится **key** категории.
- При создании/обновлении товара категория **автоматически** добавляется в каталог категорий, если её ещё нет.


## Редакторы (кратко)

- **DOCX редактор:** открой файл, редактируй, скачай, либо отправь в «Печать в Jola».
- **PDF редактор:** заменяй блоки текста (whiteout + новый текст), делай подсветку/замазку, merge/rotate, скачай/отправь в Jola.
