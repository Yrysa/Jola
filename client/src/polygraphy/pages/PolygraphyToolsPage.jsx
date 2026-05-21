import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './PolygraphyPages.css';

export default function PolygraphyToolsPage() {
  const { i18n } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');

  const copy = isRu
    ? {
        back: 'Назад',
        breadcrumb: 'Главная / Полиграфия / Редакторы',
        title: 'Редакторы Jola',
        subtitle: 'Три аккуратных инструмента для изображений, PDF и DOCX. Скачивай результат или сразу отправляй его в печать внутри Jola.',
        chips: ['DOCX', 'PDF', 'JPG / PNG / WebP'],
        open: 'Открыть',
        hintTitle: 'Как это работает',
        hintText: 'Открываешь нужный редактор, правишь файл и используешь действия сверху: Скачать, Печать в Jola, Новый.',
        stats: [
          { value: '3', label: 'редактора' },
          { value: '1', label: 'единая панель действий' },
          { value: '0', label: 'лишнего шума в UI' },
        ],
        cards: [
          {
            to: '/polygraphy/editor/images',
            icon: '🖼️',
            tags: ['JPG/PNG/WebP', 'Скачать', 'Печать'],
            title: 'Редактор изображений',
            desc: 'Обрезка, поворот, размер, фильтры и быстрый экспорт без лишних шагов.',
          },
          {
            to: '/polygraphy/editor/office',
            icon: '📄',
            tags: ['DOCX', 'Редактирование', 'Печать'],
            title: 'DOCX-редактор',
            desc: 'Открывай документы, вноси правки и отправляй готовую версию в печать.',
          },
          {
            to: '/polygraphy/editor/pdf',
            icon: '📎',
            tags: ['PDF', 'Заметки', 'Склейка'],
            title: 'PDF-редактор',
            desc: 'Поворот страниц, объединение, текстовые заметки и экспорт обновлённого PDF.',
          },
        ],
      }
    : {
        back: 'Back',
        breadcrumb: 'Home / Print / Editors',
        title: 'Jola editors',
        subtitle: 'Three polished tools for images, PDF, and DOCX. Download the result or send it straight to print inside Jola.',
        chips: ['DOCX', 'PDF', 'JPG / PNG / WebP'],
        open: 'Open',
        hintTitle: 'How it works',
        hintText: 'Open the right editor, make your changes, and use the top actions: Download, Print in Jola, New.',
        stats: [
          { value: '3', label: 'editors' },
          { value: '1', label: 'shared action bar' },
          { value: '0', label: 'extra UI noise' },
        ],
        cards: [
          {
            to: '/polygraphy/editor/images',
            icon: '🖼️',
            tags: ['JPG/PNG/WebP', 'Download', 'Print'],
            title: 'Image editor',
            desc: 'Crop, rotate, resize, apply filters, and export without extra steps.',
          },
          {
            to: '/polygraphy/editor/office',
            icon: '📄',
            tags: ['DOCX', 'Editing', 'Print'],
            title: 'DOCX editor',
            desc: 'Open documents, make edits, and send the final version straight to print.',
          },
          {
            to: '/polygraphy/editor/pdf',
            icon: '📎',
            tags: ['PDF', 'Notes', 'Merge'],
            title: 'PDF editor',
            desc: 'Rotate pages, merge files, add text notes, and export the updated PDF.',
          },
        ],
      };

  return (
    <div className="container poly-page">
      <div className="poly-topbar">
        <Link to="/polygraphy" className="poly-back">← {copy.back}</Link>
        <div className="poly-breadcrumb">{copy.breadcrumb}</div>
      </div>

      <div className="poly-hero poly-hero--premium poly-hero--compact">
        <div className="poly-hero-inner poly-hero-inner--stacked">
          <div>
            <h1 className="poly-title">{copy.title}</h1>
            <p className="poly-subtitle">{copy.subtitle}</p>
          </div>
          <div className="poly-hero-badges" aria-hidden="true">
            {copy.chips.map((chip) => <span key={chip} className="poly-badge">{chip}</span>)}
          </div>
        </div>

        <div className="poly-hero-stats">
          {copy.stats.map((item) => (
            <div key={item.label} className="poly-stat-card">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="poly-grid poly-grid--editors" style={{ marginTop: '1rem' }}>
        {copy.cards.map((card) => (
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
            <div className="poly-card-cta"><span>{copy.open}</span><span aria-hidden="true">→</span></div>
          </Link>
        ))}
      </div>

      <div className="poly-note" style={{ marginTop: '1rem' }}>
        <div className="poly-note-card poly-note-card--accent">
          <div className="poly-note-title">{copy.hintTitle}</div>
          <div className="poly-note-text">{copy.hintText}</div>
        </div>
      </div>
    </div>
  );
}
