import { Link } from 'react-router-dom';
import { FiTruck, FiShield, FiClock, FiRefreshCw, FiCode, FiArrowRight } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import '../styles/home.css';

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="home" style={{ paddingBottom: '2.5rem' }}>
      { }
      <section className="home-hero">
        <div className="container home-hero__inner">
          <div className="home-hero__content">
            <div className="home-hero__kicker">JOLA STORE</div>
            <h1 className="home-hero__title">О магазине Jola</h1>
            <p className="home-hero__subtitle">
              Техника и гаджеты — быстро, безопасно и удобно. Мы делаем покупку простой: от выбора до доставки.
            </p>

            <div className="home-hero__actions">
              <Link className="btn btn-primary" to="/products">
                Перейти в каталог <FiArrowRight />
              </Link>
              <Link className="btn btn-secondary" to="/shipping">
                Доставка и возврат
              </Link>
            </div>

            <div className="home-hero__stats">
              <div className="hero-pill">⚡ Быстрая доставка</div>
              <div className="hero-pill">🛡️ Гарантия</div>
              <div className="hero-pill">💬 Поддержка</div>
              <div className="hero-pill">🧾 Удобная оплата</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ paddingTop: '1.5rem' }}>
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Кто мы</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontWeight: 750, lineHeight: 1.75, marginBottom: '0.8rem' }}>
            Jola — онлайн‑магазин техники и аксессуаров. Мы собираем популярные модели в одном месте, делаем удобный поиск,
            честную цену и прозрачные статусы заказа.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--color-text-secondary)', fontWeight: 750, lineHeight: 1.75 }}>
            <li>Проверенные позиции и актуальные остатки на складе.</li>
            <li>Доставка по городу и регионам, уведомления о статусе заказа.</li>
            <li>Оплата картой (демо Stripe) и безопасная обработка данных.</li>
            <li>Возврат 14 дней по правилам, помощь поддержки.</li>
          </ul>
        </div>
      </div>

      { }
      <section id="benefits" className="home-section home-section--alt" style={{ borderRadius: 18 }}>
        <div className="container">
          <div className="section-head">
            <h2>{t('home.benefitsTitle', { defaultValue: 'Почему Jola' })}</h2>
            <p className="section-subtitle">
              {t('home.benefitsSubtitle', { defaultValue: 'Всё, чтобы покупки были простыми и приятными.' })}
            </p>
          </div>

          <div className="benefits-row">
            <div className="benefit-card">
              <div className="benefit-icon"><FiTruck /></div>
              <div className="benefit-title">Быстрая доставка</div>
              <div className="benefit-text">По городу — день в день, по регионам — максимально быстро.</div>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><FiShield /></div>
              <div className="benefit-title">Безопасность</div>
              <div className="benefit-text">Защита данных, безопасная оплата и прозрачная история заказов.</div>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><FiClock /></div>
              <div className="benefit-title">Поддержка</div>
              <div className="benefit-text">Ответим по заказу и поможем выбрать модель без лишней суеты.</div>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><FiRefreshCw /></div>
              <div className="benefit-title">Возврат 14 дней</div>
              <div className="benefit-text">Если не подошло — поможем оформить возврат по правилам.</div>
            </div>
          </div>
        </div>
      </section>

      { }
      <section className="home-cta">
        <div className="container home-cta__inner">
          <div>
            <h3 className="home-cta__title">Готов(а) выбрать что-то крутое?</h3>
            <p className="home-cta__text">Открой каталог и подбери гаджеты под свой стиль.</p>
          </div>
          <Link to="/products" className="btn btn-primary">
            Перейти в каталог <FiArrowRight />
          </Link>
        </div>
      </section>

      <div className="container" style={{ paddingTop: '1rem' }}>
        <div className="card">
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiCode /> О проекте (технологии)
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontWeight: 750, lineHeight: 1.75, marginTop: 0 }}>
            Этот сайт — демо‑проект магазина. Отзывы на товары можно оставлять только после покупки.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--color-text-secondary)', fontWeight: 750, lineHeight: 1.7 }}>
            <li>Клиент: React + Vite, адаптивная верстка, i18n RU/EN.</li>
            <li>Сервер: Node.js + Express, REST API, базовая защита от уязвимостей.</li>
            <li>База: MongoDB (каталог, пользователи, заказы, склад/остатки).</li>
            <li>Оплата: Stripe (демо), подтверждение через webhook.</li>
          </ul>
          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            <Link className="btn btn-primary" to="/privacy">Политика конфиденциальности</Link>
            <Link className="btn btn-secondary" to="/contacts">Контакты</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
