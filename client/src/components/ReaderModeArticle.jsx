import { useState } from 'react';
import { FiBookOpen, FiEye, FiEyeOff, FiSun, FiType } from 'react-icons/fi';
import './ReaderModeArticle.css';

const fontFamilies = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans', label: 'Sans' },
  { value: 'mono', label: 'Mono' },
];

const fontSizes = [
  { value: 'small', label: 'Маленький' },
  { value: 'medium', label: 'Средний' },
  { value: 'large', label: 'Большой' },
];

const themes = [
  { value: 'light', label: 'Светлый' },
  { value: 'sepia', label: 'Сепия' },
  { value: 'dark', label: 'Темный' },
];

export default function ReaderModeArticle() {
  const [readerMode, setReaderMode] = useState(false);
  const [fontFamily, setFontFamily] = useState('serif');
  const [fontSize, setFontSize] = useState('medium');
  const [theme, setTheme] = useState('light');

  return (
    <section
      className={[
        'reader-article',
        readerMode ? 'reader-article--active' : '',
        `reader-article--${theme}`,
        `reader-article--${fontFamily}`,
        `reader-article--${fontSize}`,
      ].join(' ')}
    >
      <header className="reader-article__header">
        <div>
          <p className="reader-article__eyebrow">Справка по коммуникациям</p>
          <h3 className="reader-article__title">
            Как встроить мессенджеры и сделать поддержку заметной
          </h3>
          <p className="reader-article__subtitle">
            Подберите формат виджета, настройте каналы связи и включайте режим
            чтения для фокуса на контенте.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary reader-article__toggle"
          onClick={() => setReaderMode(prev => !prev)}
        >
          {readerMode ? <FiEyeOff /> : <FiEye />} {readerMode ? 'Выйти' : 'Режим чтения'}
        </button>
      </header>

      {readerMode && (
        <div className="reader-article__controls">
          <div className="reader-article__control">
            <FiType />
            <span>Шрифт</span>
            <div className="reader-article__pill-group">
              {fontFamilies.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`reader-pill ${fontFamily === option.value ? 'reader-pill--active' : ''}`}
                  onClick={() => setFontFamily(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="reader-article__control">
            <FiBookOpen />
            <span>Размер</span>
            <div className="reader-article__pill-group">
              {fontSizes.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`reader-pill ${fontSize === option.value ? 'reader-pill--active' : ''}`}
                  onClick={() => setFontSize(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="reader-article__control">
            <FiSun />
            <span>Фон</span>
            <div className="reader-article__pill-group">
              {themes.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`reader-pill ${theme === option.value ? 'reader-pill--active' : ''}`}
                  onClick={() => setTheme(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="reader-article__body">
        <article className="reader-article__content">
          <h4>1. Варианты дизайна и размещения</h4>
          <ul>
            <li>
              <strong>Плавающая панель / кнопка-джойстик:</strong> круглая или
              вертикальная панель у края экрана. При нажатии выезжают остальные
              иконки — экономит место и всегда на виду.
            </li>
            <li>
              <strong>Фиксированный блок в шапке/подвале:</strong> ряд иконок в
              верхней или нижней части сайта с подсказкой «Свяжитесь с нами».
            </li>
            <li>
              <strong>«Умное» всплывающее окно:</strong> появляется через
              некоторое время или при намерении уйти со страницы.
            </li>
            <li>
              <strong>Встроенный в контекст:</strong> блок в конце статьи —
              «Остались вопросы по теме? Спросите в...».
            </li>
          </ul>

          <img
            className="reader-article__image"
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
            alt="Команда поддержки в мессенджерах"
            loading="lazy"
          />

          <h4>2. Ключевые функции</h4>
          <ul>
            <li>
              <strong>Статус/никнейм:</strong> укажите «@support_team» или
              «Менеджер Анна».
            </li>
            <li>
              <strong>Предзаполненные сообщения:</strong> для WhatsApp можно
              сразу передать текст вопроса.
            </li>
            <li>
              <strong>Индикатор статуса:</strong> «Отвечаем в течение 5 минут»
              — используйте только если реально соблюдаете.
            </li>
            <li>
              <strong>Мини-чат:</strong> объедините каналы в одном виджете.
            </li>
          </ul>

          <h4>3. Какой мессенджер для какого сайта?</h4>
          <p>
            <strong>Telegram:</strong> поддержка, новости, бот для заказов и
            консультаций.
          </p>
          <p>
            <strong>Discord:</strong> сообщества, образовательные платформы,
            IT-проекты — добавьте описание каналов.
          </p>
          <p>
            <strong>WhatsApp:</strong> интернет-магазины, локальный бизнес,
            услуги — обязательно указывайте часы работы.
          </p>
          <p>
            <strong>VK:</strong> аудитория 16-35 лет в СНГ, сообщества и
            контент-проекты.
          </p>

          <h4>4. Идеи для вовлечения</h4>
          <ul>
            <li>
              <strong>Выбор перед переходом:</strong> модальное окно «Выберите
              мессенджер» с иконками.
            </li>
            <li>
              <strong>Связь по теме:</strong> распределяйте каналы по типам
              запросов.
            </li>
            <li>
              <strong>QR-код:</strong> быстрый вход для мобильных пользователей.
            </li>
            <li>
              <strong>Обещание обратной связи:</strong> подпись «Отвечаем даже
              ночью».
            </li>
          </ul>

          <h4>5. Технические и UX-советы</h4>
          <ul>
            <li>Открывайте ссылки в новой вкладке (target="_blank").</li>
            <li>Используйте официальные брендированные иконки.</li>
            <li>Делайте кнопки крупными для мобильных устройств.</li>
            <li>Добавляйте плавную анимацию появления.</li>
          </ul>
        </article>

        <aside className="reader-article__aside">
          <div className="reader-article__card">
            <h5>Проверьте себя</h5>
            <p>
              У вас выбран 1-3 основных канала? Есть ли понятный статус и часы
              работы для клиентов?
            </p>
          </div>
          <div className="reader-article__card">
            <h5>Быстрые заметки</h5>
            <p>
              Мини-чат объединяет все мессенджеры в одном окне и сокращает путь
              пользователя к диалогу.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
