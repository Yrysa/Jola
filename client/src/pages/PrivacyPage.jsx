import { useTranslation } from 'react-i18next';

export default function PrivacyPage() {
  const { t } = useTranslation();
  const updated = new Date().toLocaleDateString('ru-RU');

  return (
    <div className="container" style={{ padding: '2rem 0 3rem' }}>
      <div className="card" style={{ maxWidth: 980, margin: '0 auto' }}>
        <h1 style={{ marginTop: 0 }}>{t('footer.privacy', { defaultValue: 'Политика конфиденциальности' })}</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontWeight: 800, lineHeight: 1.65, marginTop: 0 }}>
          Обновлено: {updated}
        </p>

        <div style={{ display: 'grid', gap: '0.85rem', lineHeight: 1.7, color: 'var(--color-text-secondary)', fontWeight: 720 }}>
          <p>
            Настоящая Политика описывает, какие данные собираются на сайте Jola, как они используются и
            какие у вас есть права. Мы относимся к данным бережно: используем минимально необходимый объём
            и защищаем его организационными и техническими мерами.
          </p>

          <h2 style={{ color: 'var(--color-text)', marginBottom: 0 }}>1. Какие данные мы можем собирать</h2>
          <ul style={{ marginTop: 0 }}>
            <li><strong>Данные аккаунта:</strong> имя, email, номер телефона (если указан), пароль в виде хэша.</li>
            <li><strong>Данные заказа:</strong> товары, количество, стоимость, адрес/город доставки, комментарии к заказу.</li>
            <li><strong>Технические данные:</strong> IP-адрес, тип устройства/браузера, язык, сведения о сессии, cookies.</li>
            <li><strong>Платёжные данные:</strong> реквизиты карты не храним — обработку проводит платёжный провайдер (например, Stripe).</li>
            <li><strong>Файлы полиграфии (если используете раздел Polygraphy):</strong> загруженные файлы для расчёта/печати.</li>
          </ul>

          <h2 style={{ color: 'var(--color-text)', marginBottom: 0 }}>2. Зачем мы обрабатываем данные</h2>
          <ul style={{ marginTop: 0 }}>
            <li>создать и поддерживать вашу учётную запись;</li>
            <li>оформить и выполнить заказ, показать статусы и историю;</li>
            <li>обработать оплату и подтвердить её через webhook (если включено);</li>
            <li>обеспечить поддержку и связь по заказу (email/мессенджеры — при включённой настройке);</li>
            <li>улучшать интерфейс и качество сервиса, предотвращать мошенничество и злоупотребления;</li>
            <li>выполнять требования законодательства (если применимо).</li>
          </ul>

          <h2 style={{ color: 'var(--color-text)', marginBottom: 0 }}>3. Правовые основания</h2>
          <p style={{ marginTop: 0 }}>
            Основания обработки: исполнение договора/заказа, законные интересы (безопасность, улучшение сервиса),
            а также ваше согласие — когда оно требуется.
          </p>

          <h2 style={{ color: 'var(--color-text)', marginBottom: 0 }}>4. Передача данных третьим лицам</h2>
          <p style={{ marginTop: 0 }}>
            Мы не продаём ваши данные. Передача возможна только в объёме, необходимом для работы сервиса:
          </p>
          <ul style={{ marginTop: 0 }}>
            <li><strong>Платёжные сервисы</strong> (например, Stripe) — для обработки оплаты.</li>
            <li><strong>Службы доставки</strong> — для выполнения доставки (адрес/контактные данные, если указаны).</li>
            <li><strong>Email/мессенджеры</strong> — для уведомлений (если включено в настройках проекта).</li>
            <li><strong>Хостинг/инфраструктура</strong> — для работы сайта и хранения данных (сервер/БД).</li>
          </ul>

          <h2 style={{ color: 'var(--color-text)', marginBottom: 0 }}>5. Срок хранения</h2>
          <p style={{ marginTop: 0 }}>
            Мы храним данные только столько, сколько нужно для целей обработки (учёт, заказы, поддержка) и
            в рамках требований закона. Файлы, загруженные для полиграфии, могут автоматически удаляться
            после обработки/по сроку хранения.
          </p>

          <h2 style={{ color: 'var(--color-text)', marginBottom: 0 }}>6. Cookies</h2>
          <p style={{ marginTop: 0 }}>
            Cookies помогают авторизации и улучшению UX (например, настройки интерфейса). Вы можете отключить
            cookies в браузере, но некоторые функции сайта могут работать некорректно.
          </p>

          <h2 style={{ color: 'var(--color-text)', marginBottom: 0 }}>7. Безопасность</h2>
          <ul style={{ marginTop: 0 }}>
            <li>пароли храним только в виде хэша;</li>
            <li>ограничиваем доступ к данным и логируем важные действия;</li>
            <li>используем валидацию и базовые меры защиты от типовых атак;</li>
            <li>секреты/ключи хранятся в переменных окружения, а не в репозитории.</li>
          </ul>

          <h2 style={{ color: 'var(--color-text)', marginBottom: 0 }}>8. Ваши права</h2>
          <ul style={{ marginTop: 0 }}>
            <li>получить информацию о ваших данных и целях обработки;</li>
            <li>исправить неточности;</li>
            <li>удалить аккаунт (если это не противоречит требованиям по хранению заказов);</li>
            <li>ограничить обработку или возразить (в случаях, предусмотренных законом).</li>
          </ul>

          <h2 style={{ color: 'var(--color-text)', marginBottom: 0 }}>9. Контакты</h2>
          <p style={{ marginTop: 0 }}>
            По вопросам конфиденциальности: <strong>privacy@jola-store.example</strong>
          </p>

          <div style={{ marginTop: '0.75rem', padding: '0.9rem 1rem', border: '1px solid var(--color-border)', borderRadius: 14, background: 'color-mix(in srgb, var(--color-surface) 70%, transparent)' }}>
            <strong style={{ color: 'var(--color-text)' }}>Примечание:</strong> этот текст оформлен как универсальный шаблон для демо/портфолио.
            Для реального бизнеса рекомендуется юридическая проверка под вашу юрисдикцию.
          </div>
        </div>
      </div>
    </div>
  );
}
