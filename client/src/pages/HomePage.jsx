import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  FiArrowRight,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiHeart,
  FiLayers,
  FiShield,
  FiStar,
  FiTruck,
  FiZap,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import reviewService from '../services/reviewService.js';
import '../styles/home.css';

async function loadFreshReviews() {
  const data = await reviewService.getLatest(4);
  return data.items ?? [];
}

export default function HomePage() {
  const { i18n } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');

  const copy = isRu
    ? {
        kicker: 'JOLA STORE',
        title: 'Jola — магазин техники и полиграфии в одном аккуратном месте.',
        subtitle: 'Сначала главное: кто мы, чем полезны и почему с нами удобно. Потом — товары, редакторы и быстрый заказ без лишней суеты.',
        primary: 'Открыть каталог',
        secondary: 'Полиграфия Jola',
        aboutTitle: 'О нас',
        aboutText: 'Jola объединяет магазин техники, печатные услуги и удобные редакторы файлов. Мы делаем интерфейс понятным, а заказ — быстрым и приятным.',
        aboutBullets: ['Чистый интерфейс без лишних панелей', 'Избранное, корзина и профиль в одном стиле', 'PDF, DOCX и изображения для печати в Jola'],
        featuresTitle: 'Почему это удобно',
        featuresSubtitle: 'Продумали не только каталог, но и весь путь пользователя.',
        features: [
          ['Быстрая доставка', 'По городу и регионам с понятными сроками и статусами.'],
          ['Защита данных', 'HTTPS, безопасная авторизация и аккуратный клиентский UX.'],
          ['Умная полиграфия', 'Редакторы документов и отправка в печать прямо из Jola.'],
          ['Чёткий интерфейс', 'Новые панели, карточки и навигация без визуального шума.'],
        ],
        hitsTitle: 'Отзывы покупателей',
        hitsSubtitle: 'Живые впечатления покупателей без товарной стены на главной странице.',
        viewAll: 'Все товары',
        printTitle: 'Печатай без лишних переходов',
        printText: 'Открой PDF или DOCX, внеси правки, скачай результат или сразу отправь его в печать внутри Jola.',
        printAction: 'Открыть редакторы',
        ctaTitle: 'Хочешь посмотреть всё вживую?',
        ctaText: 'Переходи в каталог, сохраняй в избранное и собирай свою корзину.',
        ctaAction: 'Перейти в товары',
        stats: ['Техника', 'Полиграфия', 'Избранное', 'Профиль'],
      }
    : {
        kicker: 'JOLA STORE',
        title: 'Jola is a clean store for tech products and print services in one place.',
        subtitle: 'The main story comes first: who we are, what we offer, and why the experience feels easier. Then come products, editors, and fast checkout.',
        primary: 'Open catalog',
        secondary: 'Jola print studio',
        aboutTitle: 'About us',
        aboutText: 'Jola combines a tech store, print services, and file editors in one polished experience. We focus on clarity, speed, and a UI that feels easy to trust.',
        aboutBullets: ['Clean interface without extra panels', 'Favorites, cart, and profile in one visual system', 'PDF, DOCX, and image workflows ready for print'],
        featuresTitle: 'Why it feels better',
        featuresSubtitle: 'We redesigned not only the catalog, but the whole customer flow.',
        features: [
          ['Fast delivery', 'Clear delivery windows and status updates for every order.'],
          ['Protected data', 'HTTPS-ready frontend, secure auth, and updated UX.'],
          ['Smart print flow', 'Edit documents and send them to print right inside Jola.'],
          ['Sharper UI', 'Refined panels, cards, and navigation with less visual noise.'],
        ],
        hitsTitle: 'Customer reviews',
        hitsSubtitle: 'Real customer impressions instead of another product wall on the homepage.',
        viewAll: 'All products',
        printTitle: 'Print without extra steps',
        printText: 'Open a PDF or DOCX, make edits, download the result, or send it to print directly inside Jola.',
        printAction: 'Open editors',
        ctaTitle: 'Ready to explore everything?',
        ctaText: 'Browse the catalog, save favorites, and build your cart in a updated flow.',
        ctaAction: 'Go to products',
        stats: ['Tech', 'Print', 'Favorites', 'Profile'],
      };

  const { data: latestReviews, isLoading: reviewsLoading } = useQuery(['homeReviews'], loadFreshReviews, {
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: false,
  });

  const fallbackReviews = isRu
    ? [
        { _id: 'fallback-1', name: 'Мадина', rating: 5, text: 'Понравилось, что сайт не душит лишними карточками на главной. Быстро нашла товар и оформила заказ.', city: 'Алматы', product: { brand: 'Jola', name: 'Store flow' } },
        { _id: 'fallback-2', name: 'Арман', rating: 5, text: 'Редактор DOCX стал полезнее: открыл файл, поправил реквизиты, скачал и сразу отправил в печать.', city: 'Астана', product: { brand: 'Jola', name: 'DOCX editor' } },
        { _id: 'fallback-3', name: 'Dana', rating: 4, text: 'Удобно, что в оплате можно держать локальные KZ-способы и международные одновременно.', city: 'Шымкент', product: { brand: 'Jola', name: 'Checkout' } },
      ]
    : [
        { _id: 'fallback-1', name: 'Madina', rating: 5, text: 'I like that the homepage stays calm instead of turning into another noisy product wall.', city: 'Almaty', product: { brand: 'Jola', name: 'Store flow' } },
        { _id: 'fallback-2', name: 'Arman', rating: 5, text: 'The DOCX editor is now actually useful: I fixed a document, exported it, and sent it to print.', city: 'Astana', product: { brand: 'Jola', name: 'DOCX editor' } },
        { _id: 'fallback-3', name: 'Dana', rating: 4, text: 'The checkout is much clearer now, especially for mixed local and international payment methods.', city: 'Shymkent', product: { brand: 'Jola', name: 'Checkout' } },
      ];

  const reviewItems = (latestReviews && latestReviews.length ? latestReviews : fallbackReviews).slice(0, 4);

  const featureIcons = [FiTruck, FiShield, FiFileText, FiLayers];

  return (
    <div className="home">
      <section className="home-hero">
        <div className="container home-hero__inner">
          <div className="home-hero__content">
            <div className="home-hero__kicker">{copy.kicker}</div>
            <h1 className="home-hero__title">{copy.title}</h1>
            <p className="home-hero__subtitle">{copy.subtitle}</p>

            <div className="home-hero__actions">
              <Link className="btn btn-primary" to="/products">
                {copy.primary} <FiArrowRight />
              </Link>
              <Link className="btn btn-secondary" to="/polygraphy">
                {copy.secondary}
              </Link>
            </div>

            <div className="home-hero__stats">
              <div className="hero-pill"><FiZap /> {copy.stats[0]}</div>
              <div className="hero-pill"><FiFileText /> {copy.stats[1]}</div>
              <div className="hero-pill"><FiHeart /> {copy.stats[2]}</div>
              <div className="hero-pill"><FiStar /> {copy.stats[3]}</div>
            </div>
          </div>

          <div className="home-hero__visual">
            <div className="hero-card hero-card--dashboard">
              <div className="hero-card__top">
                <span className="hero-dot" />
                <span className="hero-dot" />
                <span className="hero-dot" />
              </div>
              <div className="hero-card__body">
                <div className="hero-card__metric">
                  <strong>{copy.aboutTitle}</strong>
                  <span>{copy.aboutText}</span>
                </div>
                <div className="hero-card__list">
                  {copy.aboutBullets.map((item) => (
                    <div key={item} className="hero-card__list-item">
                      <FiChevronRight />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="hero-card__footer">
                  <span><FiClock /> 24/7</span>
                  <span><FiShield /> HTTPS</span>
                  <span><FiTruck /> Jola</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-section--about-first">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>{copy.featuresTitle}</h2>
              <p className="section-subtitle">{copy.featuresSubtitle}</p>
            </div>
          </div>

          <div className="benefits-row">
            {copy.features.map(([title, text], index) => {
              const Icon = featureIcons[index];
              return (
                <div key={title} className="benefit-card">
                  <div className="benefit-icon"><Icon /></div>
                  <div className="benefit-title">{title}</div>
                  <div className="benefit-text">{text}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="home-section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>{copy.hitsTitle}</h2>
              <p className="section-subtitle">{copy.hitsSubtitle}</p>
            </div>
            <Link to="/products" className="section-link">
              {copy.viewAll} <FiArrowRight />
            </Link>
          </div>

          <div className="review-teaser-grid">
            {reviewsLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="review-teaser-card review-teaser-card--skeleton" />
                ))
: reviewItems.map((review) => (
                  <article key={review._id} className="review-teaser-card">
                    <div className="review-teaser-card__head">
                      <strong>{review.name}</strong>
                      <span>{'★'.repeat(Math.max(1, Math.min(5, Number(review.rating || 5))))}</span>
                    </div>
                    <p>{review.text}</p>
                    <div className="review-teaser-card__foot">
                      <span>{review.city || (isRu ? 'Покупатель Jola' : 'Jola customer')}</span>
                      <span>{review.product?.brand} {review.product?.name}</span>
                    </div>
                  </article>
                ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt">
        <div className="container">
          <div className="home-feature-banner">
            <div>
              <div className="home-feature-banner__kicker">PDF / DOCX / JPG</div>
              <h3>{copy.printTitle}</h3>
              <p>{copy.printText}</p>
            </div>
            <Link to="/polygraphy/editor" className="btn btn-primary">
              {copy.printAction}
            </Link>
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="container home-cta__inner">
          <div>
            <h3 className="home-cta__title">{copy.ctaTitle}</h3>
            <p className="home-cta__text">{copy.ctaText}</p>
          </div>
          <Link to="/products" className="btn btn-primary">
            {copy.ctaAction} <FiArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}
