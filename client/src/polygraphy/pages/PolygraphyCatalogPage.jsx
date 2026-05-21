import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PolyApi } from '../api';
import LoadingSpinner from '../../components/LoadingSpinner';
import './PolygraphyPages.css';

const groupBy = (arr, keyFn) => {
  const map = new Map();
  for (const item of arr) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
};

export default function PolygraphyCatalogPage() {
  const { i18n, t } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const list = await PolyApi.listServices();
        if (!mounted) return;
        setServices(list);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || (isRu ? 'Ошибка загрузки' : 'Loading error'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isRu]);

  const grouped = useMemo(() => {
    const bySub = groupBy(services, (service) => service.subgroup || t('polygraphy.other'));
    return [...bySub.entries()];
  }, [services, t]);

  const editorCards = isRu
    ? [
        {
          to: '/polygraphy/editor/images',
          icon: '🖼️',
          tags: ['JPG/PNG/WebP', 'Скачать', 'Печать'],
          title: 'Редактор изображений',
          desc: 'Обрезка, поворот, фильтры и быстрая отправка в печать.',
        },
        {
          to: '/polygraphy/editor/office',
          icon: '📄',
          tags: ['DOCX', 'Редактирование', 'Печать'],
          title: 'DOCX-редактор',
          desc: 'Документы прямо в браузере с сохранением и быстрой печатью.',
        },
        {
          to: '/polygraphy/editor/pdf',
          icon: '📎',
          tags: ['PDF', 'Склейка', 'Заметки'],
          title: 'PDF-редактор',
          desc: 'Поворот страниц, объединение PDF, текстовые правки и экспорт.',
        },
      ]
    : [
        {
          to: '/polygraphy/editor/images',
          icon: '🖼️',
          tags: ['JPG/PNG/WebP', 'Download', 'Print'],
          title: 'Image editor',
          desc: 'Crop, rotate, add filters, and move the file to print in one flow.',
        },
        {
          to: '/polygraphy/editor/office',
          icon: '📄',
          tags: ['DOCX', 'Editing', 'Print'],
          title: 'DOCX editor',
          desc: 'Browser-based documents with saving and a fast print handoff.',
        },
        {
          to: '/polygraphy/editor/pdf',
          icon: '📎',
          tags: ['PDF', 'Merge', 'Notes'],
          title: 'PDF editor',
          desc: 'Rotate pages, merge PDFs, edit text layers, and export the result.',
        },
      ];

  const heroStats = [
    {
      value: String(editorCards.length),
      label: isRu ? 'редактора' : 'editors',
    },
    {
      value: String(services.length || '—'),
      label: isRu ? 'услуг печати' : 'print services',
    },
    {
      value: isRu ? '1 клик' : '1 click',
      label: isRu ? 'до отправки в Jola' : 'to send into Jola',
    },
  ];

  return (
    <div className="container poly-page">
      <div className="poly-hero poly-hero--premium">
        <div className="poly-hero-inner poly-hero-inner--stacked">
          <div>
            <span className="poly-badge poly-badge--soft">Jola Print Studio</span>
            <h1 className="poly-title">{t('polygraphy.title')}</h1>
            <p className="poly-subtitle">{t('polygraphy.subtitle')}</p>
          </div>

          <div className="poly-hero-badges" aria-hidden="true">
            <span className="poly-badge">PDF</span>
            <span className="poly-badge">DOCX</span>
            <span className="poly-badge">JPG / PNG</span>
            <span className="poly-badge">A4–A0</span>
          </div>
        </div>

        <div className="poly-hero-stats">
          {heroStats.map((item) => (
            <div key={item.label} className="poly-stat-card">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="poly-center">
          <LoadingSpinner />
        </div>
      ) : null}

      {!loading && error ? <div className="poly-error">{error}</div> : null}

      {!loading && !error ? (
        <div className="poly-sections">
          <section className="poly-section">
            <div className="poly-section-head">
              <h2 className="poly-section-title">{isRu ? 'Редакторы Jola' : 'Jola editors'}</h2>
              <div className="poly-section-line" />
            </div>
            <div className="poly-grid poly-grid--editors">
              {editorCards.map((card) => (
                <Link key={card.to} to={card.to} className="poly-card poly-card--editor poly-card--glow">
                  <div className="poly-card-top">
                    <div className="poly-card-icon" aria-hidden="true">{card.icon}</div>
                    <div className="poly-card-kinds">
                      {card.tags.map((tag) => <span key={tag} className="poly-chip">{tag}</span>)}
                    </div>
                  </div>
                  <div className="poly-card-body">
                    <div className="poly-card-title">{card.title}</div>
                    <div className="poly-card-desc">{card.desc}</div>
                  </div>
                  <div className="poly-card-cta">
                    <span>{t('polygraphy.open')}</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {grouped.map(([subgroup, list]) => (
            <section key={subgroup} className="poly-section">
              <div className="poly-section-head">
                <h2 className="poly-section-title">{subgroup}</h2>
                <div className="poly-section-line" />
              </div>
              <div className="poly-grid">
                {list.map((service) => (
                  <Link key={service.key} to={`/polygraphy/${service.key}`} className="poly-card poly-card--service">
                    <div className="poly-card-top">
                      <div className="poly-card-icon" aria-hidden="true">🖨️</div>
                      <div className="poly-card-kinds">
                        <span className="poly-chip">{t('polygraphy.configurator')}</span>
                      </div>
                    </div>
                    <div className="poly-card-body">
                      <div className="poly-card-title">{service.title}</div>
                      <div className="poly-card-desc">{service.description || t('polygraphy.serviceDefaultDesc')}</div>
                    </div>
                    <div className="poly-card-cta">
                      <span>{t('polygraphy.open')}</span>
                      <span aria-hidden="true">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      <div className="poly-note">
        <div className="poly-note-card poly-note-card--accent">
          <div className="poly-note-title">{t('polygraphy.noteTitle')}</div>
          <div className="poly-note-text">{t('polygraphy.noteText')}</div>
        </div>
      </div>
    </div>
  );
}
