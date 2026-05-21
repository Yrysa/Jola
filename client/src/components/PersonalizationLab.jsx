import { useMemo, useState } from 'react';
import {
  FiActivity,
  FiAperture,
  FiCheckCircle,
  FiCloudRain,
  FiCompass,
  FiCpu,
  FiEye,
  FiGrid,
  FiImage,
  FiLayers,
  FiMoon,
  FiMonitor,
  FiMusic,
  FiRefreshCcw,
  FiSliders,
  FiType,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useUiSettings } from '../context/UiSettingsContext.jsx';

const accentOptions = [
  { value: 'blue', labelRu: 'Синий', labelEn: 'Blue' },
  { value: 'violet', labelRu: 'Фиолетовый', labelEn: 'Violet' },
  { value: 'emerald', labelRu: 'Изумрудный', labelEn: 'Emerald' },
  { value: 'sunset', labelRu: 'Закатный', labelEn: 'Sunset' },
];

const themeOptions = [
  { value: 'system', labelRu: 'Как в системе', labelEn: 'System' },
  { value: 'dark', labelRu: 'Тёмная', labelEn: 'Dark' },
  { value: 'light', labelRu: 'Светлая', labelEn: 'Light' },
];

const densityOptions = [
  { value: 'compact', labelRu: 'Компактно', labelEn: 'Compact' },
  { value: 'comfortable', labelRu: 'Комфортно', labelEn: 'Comfortable' },
  { value: 'spacious', labelRu: 'Свободно', labelEn: 'Spacious' },
];

const fontOptions = [
  { value: 'small', labelRu: 'Мелкий', labelEn: 'Small' },
  { value: 'medium', labelRu: 'Средний', labelEn: 'Medium' },
  { value: 'large', labelRu: 'Крупный', labelEn: 'Large' },
];

const effectsQualityOptions = [
  { value: 'off', labelRu: 'Выкл', labelEn: 'Off' },
  { value: 'auto', labelRu: 'Авто', labelEn: 'Auto' },
  { value: 'economy', labelRu: 'Эконом', labelEn: 'Economy' },
  { value: 'full', labelRu: 'Красиво', labelEn: 'Beautiful' },
];

const weatherOptions = [
  { value: 'auto', labelRu: 'Авто', labelEn: 'Auto' },
  { value: 'sunny', labelRu: 'Солнце', labelEn: 'Sunny' },
  { value: 'cloudy', labelRu: 'Облачно', labelEn: 'Cloudy' },
  { value: 'rainy', labelRu: 'Дождь', labelEn: 'Rain' },
  { value: 'storm', labelRu: 'Гроза', labelEn: 'Storm' },
  { value: 'snowy', labelRu: 'Снег', labelEn: 'Snow' },
  { value: 'misty', labelRu: 'Туман', labelEn: 'Misty' },
  { value: 'evening', labelRu: 'Закат', labelEn: 'Evening' },
  { value: 'night', labelRu: 'Ночь', labelEn: 'Night' },
];

const cardOptions = [
  {
    value: 'glass',
    titleRu: 'Стекло',
    titleEn: 'Glass',
    descRu: 'Мягкие блики и прозрачные поверхности.',
    descEn: 'Soft reflections and translucent surfaces.',
  },
  {
    value: 'solid',
    titleRu: 'Плотные карточки',
    titleEn: 'Solid cards',
    descRu: 'Более плотный и спокойный интерфейс.',
    descEn: 'A denser and calmer interface.',
  },
  {
    value: 'outline',
    titleRu: 'Контурный',
    titleEn: 'Outline',
    descRu: 'Чистые контуры и минимум фонового шума.',
    descEn: 'Clean outlines with minimal visual noise.',
  },
];

const designOptions = [
  {
    value: 'modern',
    titleRu: 'Новый дизайн',
    titleEn: 'Modern design',
    descRu: 'Стекло, мягкие тени и более свежий интерфейс.',
    descEn: 'Glass surfaces, soft shadows, and a fresher interface.',
  },
  {
    value: 'classic',
    titleRu: 'Прошлый дизайн',
    titleEn: 'Classic design',
    descRu: 'Более строгий, плотный и собранный стиль.',
    descEn: 'A stricter, denser and more structured style.',
  },
];

const liveFeatures = [
  {
    key: 'ghostSession',
    icon: FiActivity,
    status: 'local',
    titleRu: 'Призрак прошлой сессии',
    titleEn: 'Previous-session ghost',
    descRu: 'Подсвечивает товары, у которых ты уже задерживался, чтобы было проще продолжить.',
    descEn: 'Highlights products you already lingered on, making it easier to continue.',
  },
  {
    key: 'avatarCompanion',
    icon: FiImage,
    status: 'local',
    titleRu: 'Двойник в интерфейсе',
    titleEn: 'Interface twin',
    descRu: 'Маленький спутник из твоего фото живёт в углу сайта и подстраивается под раздел.',
    descEn: 'A tiny companion built from your avatar lives in the corner and reacts to the current section.',
  },
  {
    key: 'weatherMode',
    icon: FiCloudRain,
    status: 'local',
    titleRu: 'Погодный и временной режим',
    titleEn: 'Weather and time mode',
    descRu: 'Сайт меняет атмосферу по времени суток, а ещё можно вручную выбрать солнце, облачность, дождь, грозу, снег, туман, закат или ночь.',
    descEn: 'The site changes atmosphere by time of day, and you can also manually switch between sun, clouds, rain, storm, snow, mist, evening, and night.',
  },
  {
    key: 'lifetimeTimeline',
    icon: FiCompass,
    status: 'local',
    titleRu: 'Шкала жизни на сайте',
    titleEn: 'Lifetime timeline',
    descRu: 'Показывает суммарное время, проведённое в Jola, и этап развития твоего интерфейса.',
    descEn: 'Shows your total time in Jola and the current stage of your interface evolution.',
  },
  {
    key: 'tactileHover',
    icon: FiLayers,
    status: 'demo',
    titleRu: 'Тактильный hover',
    titleEn: 'Tactile hover',
    descRu: 'Наведением карточки ощущаются живее, с более богатым и плотным откликом.',
    descEn: 'Cards feel richer and more tactile on hover.',
  },
  {
    key: 'rebelliousUi',
    icon: FiZap,
    status: 'demo',
    titleRu: 'Бунтующий интерфейс',
    titleEn: 'Rebellious interface',
    descRu: 'Некоторые элементы становятся более живыми и чуть-чуть дерзкими в спорных сценариях.',
    descEn: 'Some interface elements become livelier and slightly cheeky in tricky scenarios.',
  },
  {
    key: 'interfaceEvolution',
    icon: FiGrid,
    status: 'local',
    titleRu: 'Эволюция интерфейса',
    titleEn: 'Interface evolution',
    descRu: 'Чем дольше ты пользуешься сайтом, тем богаче становится визуальный слой.',
    descEn: 'The more you use the site, the richer the visual layer becomes.',
  },
  {
    key: 'quantumMode',
    icon: FiCpu,
    status: 'local',
    titleRu: 'Квантовый режим',
    titleEn: 'Quantum mode',
    descRu: 'Каждая сессия слегка меняет акцент, настроение и интенсивность декоративных деталей.',
    descEn: 'Each session subtly shifts accent, mood, and decorative intensity.',
  },
];

const integrationFeatures = [
  {
    key: 'eyeTracking',
    icon: FiEye,
    status: 'api',
    titleRu: 'Эмпатичный интерфейс',
    titleEn: 'Empathic interface',
    descRu: 'Веб-камера, взгляд и мимика. Сейчас это переключатель-заготовка под будущее API.',
    descEn: 'Webcam, gaze, and facial expression. For now it is a ready switch for a future API.',
  },
  {
    key: 'aiTwin',
    icon: FiAperture,
    status: 'api',
    titleRu: 'AI-двойник',
    titleEn: 'AI twin',
    descRu: 'Позже можно подключить генерацию нейро-аватара или портрета-маскота.',
    descEn: 'Later you can connect a generated neural avatar or mascot portrait.',
  },
  {
    key: 'collectiveGhosts',
    icon: FiUsers,
    status: 'api',
    titleRu: 'Коллективный разум',
    titleEn: 'Collective mind',
    descRu: 'Следы активности других людей в реальном времени и живое присутствие на карточках.',
    descEn: 'Real-time traces of other people and live presence on product cards.',
  },
  {
    key: 'musicChameleon',
    icon: FiMusic,
    status: 'api',
    titleRu: 'Сайт-хамелеон под музыку',
    titleEn: 'Music chameleon',
    descRu: 'Потом можно подключить Spotify или Apple Music и менять стиль под музыкальный вкус.',
    descEn: 'Later you can connect Spotify or Apple Music and adapt style to musical taste.',
  },
  {
    key: 'socialPalette',
    icon: FiMoon,
    status: 'api',
    titleRu: 'Наследование цветов от соцсетей',
    titleEn: 'Social palette inheritance',
    descRu: 'Готовый переключатель для будущего режима, где сайт подхватывает любимые цвета пользователя.',
    descEn: 'A ready switch for a future mode where the site inherits favorite user colors.',
  },
  {
    key: 'smartHome',
    icon: FiZap,
    status: 'api',
    titleRu: 'Физический отклик и умный дом',
    titleEn: 'Physical feedback and smart home',
    descRu: 'Заготовка под лампы, колонки и другие сценарии с внешними устройствами.',
    descEn: 'A foundation for lamps, speakers, and other external-device scenarios.',
  },
];

const sections = [
  { key: 'appearance', icon: FiMonitor },
  { key: 'live', icon: FiZap },
  { key: 'integrations', icon: FiCpu },
];

function StatusBadge({ status, isRu }) {
  const labels = {
    local: isRu ? 'Локально' : 'Local',
    demo: isRu ? 'Демо' : 'Demo',
    api: isRu ? 'Нужно API' : 'Needs API',
  };

  return <span className={`prefs-status prefs-status--${status}`}>{labels[status]}</span>;
}

function ToggleCard({ feature, checked, onChange, isRu }) {
  const Icon = feature.icon;

  return (
    <label className={checked ? 'prefs-toggle-card prefs-toggle-card--active' : 'prefs-toggle-card'}>
      <div className="prefs-toggle-card__top">
        <div className="prefs-toggle-card__icon">
          <Icon size={18} />
        </div>
        <StatusBadge status={feature.status} isRu={isRu} />
      </div>

      <div className="prefs-toggle-card__copy">
        <strong>{isRu ? feature.titleRu : feature.titleEn}</strong>
        <p>{isRu ? feature.descRu : feature.descEn}</p>
      </div>

      <div className="prefs-toggle-card__footer">
        <span>{checked ? (isRu ? 'Включено' : 'Enabled') : (isRu ? 'Выключено' : 'Disabled')}</span>
        <span className="toggle toggle--mini">
          <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
          <span className="toggle-slider" />
        </span>
      </div>
    </label>
  );
}

function OptionPills({ options, value, onChange, isRu, withDots = false }) {
  return (
    <div className="preferences-options">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? 'pill pill--active' : 'pill'}
          onClick={() => onChange(option.value)}
        >
          {withDots ? <span className={`accent-dot accent-dot--${option.value}`} /> : null}
          {isRu ? option.labelRu || option.titleRu : option.labelEn || option.titleEn}
        </button>
      ))}
    </div>
  );
}

export default function PersonalizationLab() {
  const { i18n } = useTranslation();
  const { settings, resolvedTheme, deviceProfile, updateSetting, resetSettings } = useUiSettings();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');
  const [activeSection, setActiveSection] = useState('appearance');

  const activeLiveCount = liveFeatures.filter((feature) => Boolean(settings[feature.key])).length;
  const activeIntegrationCount = integrationFeatures.filter((feature) => Boolean(settings[feature.key])).length;
  const effectsQuality = settings.effectsQuality || (settings.showBackgroundFx ? (settings.economyEffects ? 'economy' : 'full') : 'off');

  const setEffectsQuality = (value) => {
    if (value === 'off') {
      updateSetting('effectsQuality', 'off');
      updateSetting('showBackgroundFx', false);
      updateSetting('economyEffects', false);
      return;
    }
    if (value === 'economy') {
      updateSetting('effectsQuality', 'economy');
      updateSetting('showBackgroundFx', true);
      updateSetting('economyEffects', true);
      return;
    }
    if (value === 'full') {
      updateSetting('effectsQuality', 'full');
      updateSetting('showBackgroundFx', true);
      updateSetting('economyEffects', false);
      return;
    }
    updateSetting('effectsQuality', 'auto');
    updateSetting('showBackgroundFx', true);
    updateSetting('economyEffects', false);
  };

  const activeSummary = useMemo(() => {
    const labels = [];

    const designLabel = designOptions.find((item) => item.value === settings.designPreset);
    if (designLabel) labels.push(isRu ? designLabel.titleRu : designLabel.titleEn);

    const themeLabel = themeOptions.find((item) => item.value === settings.theme);
    if (themeLabel) labels.push(isRu ? themeLabel.labelRu : themeLabel.labelEn);

    if (settings.highContrast) labels.push(isRu ? 'Высокий контраст' : 'High contrast');
    if (settings.reduceMotion) labels.push(isRu ? 'Меньше анимаций' : 'Reduced motion');
    if (effectsQuality === 'off') labels.push(isRu ? 'Эффекты выкл' : 'FX off');
    if (effectsQuality === 'auto') labels.push(isRu ? 'Эффекты авто' : 'FX auto');
    if (effectsQuality === 'economy') labels.push(isRu ? 'Эконом-режим' : 'Economy mode');
    if (effectsQuality === 'full') labels.push(isRu ? 'Полные эффекты' : 'Full effects');

    liveFeatures.forEach((feature) => {
      if (settings[feature.key]) labels.push(isRu ? feature.titleRu : feature.titleEn);
    });

    integrationFeatures.forEach((feature) => {
      if (settings[feature.key]) labels.push(isRu ? feature.titleRu : feature.titleEn);
    });

    return labels.slice(0, 12);
  }, [effectsQuality, isRu, settings]);

  const sectionMeta = {
    appearance: {
      title: isRu ? 'Внешний вид' : 'Appearance',
      subtitle: isRu
        ? 'Здесь можно выбрать старый или новый дизайн, цвета, плотность и атмосферу интерфейса.'
        : 'Choose the old or modern design, colors, density, and atmosphere of the interface.',
    },
    live: {
      title: isRu ? 'Живые режимы' : 'Live modes',
      subtitle: isRu
        ? 'Локальные и демо-фишки, которые уже могут оживить интерфейс без внешних сервисов.'
        : 'Local and demo features that can already make the interface feel alive without external services.',
    },
    integrations: {
      title: isRu ? 'Будущие интеграции' : 'Future integrations',
      subtitle: isRu
        ? 'Сейчас это аккуратные переключатели-подготовки. Позже сюда можно подвязать реальные API.'
        : 'These are clean preparation switches for now. Later you can attach real APIs here.',
    },
  };

  return (
    <section className="preferences-card preferences-card--lab">
      <div className="preferences-header preferences-header--lab">
        <div>
          <p className="preferences-eyebrow">{isRu ? 'Лаборатория Jola' : 'Jola Lab'}</p>
          <h3>{isRu ? 'Персонализация сайта' : 'Site personalization'}</h3>
          <p className="preferences-lead">
            {isRu
              ? 'Все эксперименты выключены в начале. Пользователь сам включает нужные режимы в своём профиле.'
              : 'Every experiment starts disabled. The user decides what to enable inside the profile.'}
          </p>
        </div>
        <button type="button" className="btn btn-secondary preferences-reset" onClick={resetSettings}>
          <FiRefreshCcw size={16} /> {isRu ? 'Сбросить всё' : 'Reset all'}
        </button>
      </div>

      <div className="prefs-summary-bar">
        <div className="prefs-summary-card">
          <span>{isRu ? 'Активно живых режимов' : 'Active live modes'}</span>
          <strong>{activeLiveCount}</strong>
        </div>
        <div className="prefs-summary-card">
          <span>{isRu ? 'Подготовлено интеграций' : 'Prepared integrations'}</span>
          <strong>{activeIntegrationCount}</strong>
        </div>
        <div className="prefs-summary-card prefs-summary-card--wide">
          <span>{isRu ? 'Сейчас применено' : 'Applied now'}</span>
          <div className="prefs-summary-chips">
            {activeSummary.length > 0 ? (
              activeSummary.map((item) => <span key={item}>{item}</span>)
            ) : (
              <em>{isRu ? 'Пока всё по умолчанию' : 'Everything is still default'}</em>
            )}
          </div>
        </div>
      </div>

      <div className="prefs-summary-bar prefs-summary-bar--device">
        <div className="prefs-summary-card prefs-summary-card--wide">
          <span>{isRu ? 'Устройство определено автоматически' : 'Device detected automatically'}</span>
          <div className="prefs-summary-chips">
            <span>{deviceProfile.deviceLabel}</span>
            <span>{deviceProfile.deviceClass === 'mobile' ? (isRu ? 'Мобильный режим' : 'Mobile mode') : deviceProfile.deviceClass === 'tablet' ? (isRu ? 'Планшетный режим' : 'Tablet mode') : (isRu ? 'Десктопный режим' : 'Desktop mode')}</span>
            <span>{deviceProfile.viewportWidth}×{deviceProfile.viewportHeight}</span>
            <span>{deviceProfile.orientation === 'portrait' ? (isRu ? 'Портрет' : 'Portrait') : (isRu ? 'Альбомный' : 'Landscape')}</span>
            {deviceProfile.isTouch ? <span>{isRu ? 'Сенсорный экран' : 'Touch screen'}</span> : null}
          </div>
        </div>
      </div>

      <div className="prefs-shell">
        <aside className="prefs-sidebar" aria-label={isRu ? 'Меню персонализации' : 'Personalization menu'}>
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            return (
              <button
                key={section.key}
                type="button"
                className={isActive ? 'prefs-nav-btn prefs-nav-btn--active' : 'prefs-nav-btn'}
                onClick={() => setActiveSection(section.key)}
              >
                <span className="prefs-nav-btn__icon"><Icon /></span>
                <span className="prefs-nav-btn__copy">
                  <strong>{sectionMeta[section.key].title}</strong>
                  <small>{section.key === 'live' ? activeLiveCount : section.key === 'integrations' ? activeIntegrationCount : (isRu ? 'Основы' : 'Core')}</small>
                </span>
              </button>
            );
          })}
        </aside>

        <div className="prefs-stage">
          <div className="prefs-stage__head">
            <div>
              <h4>{sectionMeta[activeSection].title}</h4>
              <p>{sectionMeta[activeSection].subtitle}</p>
            </div>
            <div className="prefs-stage__status">
              <FiCheckCircle />
              <span>
                {isRu ? 'Изменения применяются сразу' : 'Changes apply instantly'}
              </span>
            </div>
          </div>

          {activeSection === 'appearance' ? (
            <div className="prefs-pane">
              <div className="prefs-block">
                <div className="preferences-title"><FiMonitor /> {isRu ? 'Стиль интерфейса' : 'Interface style'}</div>
                <div className="prefs-design-grid">
                  {designOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={settings.designPreset === option.value ? 'prefs-design-card prefs-design-card--active' : 'prefs-design-card'}
                      onClick={() => updateSetting('designPreset', option.value)}
                    >
                      <div className={`prefs-design-card__preview prefs-design-card__preview--${option.value}`}>
                        <span />
                        <span />
                        <span />
                      </div>
                      <strong>{isRu ? option.titleRu : option.titleEn}</strong>
                      <span>{isRu ? option.descRu : option.descEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="prefs-grid-two">
                <div className="prefs-block">
                  <div className="preferences-title"><FiMoon /> {isRu ? 'Тема' : 'Theme'}</div>
                  <OptionPills options={themeOptions} value={settings.theme} onChange={(value) => updateSetting('theme', value)} isRu={isRu} />
                </div>

                <div className="prefs-block">
                  <div className="preferences-title"><FiActivity /> {isRu ? 'Акцент' : 'Accent'}</div>
                  <OptionPills options={accentOptions} value={settings.accentTone} onChange={(value) => updateSetting('accentTone', value)} isRu={isRu} withDots />
                </div>
              </div>

              <div className="prefs-grid-two">
                <div className="prefs-block">
                  <div className="preferences-title"><FiGrid /> {isRu ? 'Плотность интерфейса' : 'Interface density'}</div>
                  <OptionPills options={densityOptions} value={settings.density} onChange={(value) => updateSetting('density', value)} isRu={isRu} />
                </div>

                <div className="prefs-block">
                  <div className="preferences-title"><FiType /> {isRu ? 'Размер текста' : 'Text size'}</div>
                  <OptionPills options={fontOptions} value={settings.fontSize} onChange={(value) => updateSetting('fontSize', value)} isRu={isRu} />
                </div>
              </div>

              <div className="prefs-block">
                <div className="preferences-title"><FiLayers /> {isRu ? 'Стиль карточек' : 'Card style'}</div>
                <div className="prefs-design-grid prefs-design-grid--compact">
                  {cardOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={settings.cardStyle === option.value ? 'prefs-design-card prefs-design-card--active' : 'prefs-design-card'}
                      onClick={() => updateSetting('cardStyle', option.value)}
                    >
                      <div className={`prefs-design-card__preview prefs-design-card__preview--${option.value}`}>
                        <span />
                        <span />
                        <span />
                      </div>
                      <strong>{isRu ? option.titleRu : option.titleEn}</strong>
                      <span>{isRu ? option.descRu : option.descEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="prefs-grid-two">
                <div className="prefs-block">
                  <div className="preferences-title"><FiSliders /> {isRu ? 'Атмосфера' : 'Atmosphere'}</div>
                  <div style={{ display: 'grid', gap: '0.9rem' }}>
                    <div>
                      <div className="prefs-mini-title">{isRu ? 'Качество эффектов' : 'Effect quality'}</div>
                      <OptionPills options={effectsQualityOptions} value={effectsQuality} onChange={setEffectsQuality} isRu={isRu} />
                    </div>
                    <div className="preferences-grid">
                      <label className="toggle">
                        <input type="checkbox" checked={settings.highContrast} onChange={(event) => updateSetting('highContrast', event.target.checked)} />
                        <span className="toggle-slider" />
                        <span className="toggle-label">{isRu ? 'Высокий контраст' : 'High contrast'}</span>
                      </label>
                      <label className="toggle">
                        <input type="checkbox" checked={settings.reduceMotion} onChange={(event) => updateSetting('reduceMotion', event.target.checked)} />
                        <span className="toggle-slider" />
                        <span className="toggle-label">{isRu ? 'Уменьшить анимации' : 'Reduce motion'}</span>
                      </label>
                      <label className="toggle">
                        <input type="checkbox" checked={settings.showBackgroundFx} onChange={(event) => setEffectsQuality(event.target.checked ? 'auto' : 'off')} />
                        <span className="toggle-slider" />
                        <span className="toggle-label">{isRu ? 'Фоновая атмосфера' : 'Background atmosphere'}</span>
                      </label>
                      <label className="toggle">
                        <input type="checkbox" checked={settings.economyEffects || effectsQuality === 'economy'} onChange={(event) => setEffectsQuality(event.target.checked ? 'economy' : 'auto')} />
                        <span className="toggle-slider" />
                        <span className="toggle-label">{isRu ? 'Эконом-режим эффектов' : 'Effect economy mode'}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="prefs-preview-card">
                  <div className="prefs-preview-card__top">
                    <span>{isRu ? 'Живое превью' : 'Live preview'}</span>
                    <strong>{settings.designPreset === 'classic' ? (isRu ? 'Прошлый дизайн' : 'Classic design') : (isRu ? 'Новый дизайн' : 'Modern design')}</strong>
                  </div>
                  <div className={`prefs-preview-surface prefs-preview-surface--${settings.designPreset} prefs-preview-surface--${resolvedTheme} prefs-preview-surface--${settings.cardStyle}`}>
                    <div className="prefs-preview-surface__badge">Jola</div>
                    <div className="prefs-preview-surface__title">{isRu ? 'Каталог смотрится вот так' : 'Catalog will look like this'}</div>
                    <div className="prefs-preview-surface__meta">
                      <span>{isRu ? 'Акцент' : 'Accent'}: {accentOptions.find((item) => item.value === settings.accentTone)?.[isRu ? 'labelRu' : 'labelEn']}</span>
                      <span>{isRu ? 'Карточки' : 'Cards'}: {cardOptions.find((item) => item.value === settings.cardStyle)?.[isRu ? 'titleRu' : 'titleEn']}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeSection === 'live' ? (
            <div className="prefs-pane">
              <div className="prefs-block prefs-block--intro">
                <strong>{isRu ? 'Эти режимы можно реально включать уже сейчас' : 'These modes can actually be enabled right now'}</strong>
                <p>
                  {isRu
                    ? 'Часть эффектов работает локально, часть как аккуратный демо-слой. Все они выключены по умолчанию и не мешают обычному интерфейсу.'
                    : 'Some effects work locally, others behave as a clean demo layer. They all start disabled and never disturb the default interface.'}
                </p>
              </div>
              <div className="prefs-block">
                <div className="preferences-title"><FiCloudRain /> {isRu ? 'Управление погодой' : 'Weather control'}</div>
                <p className="prefs-inline-note">
                  {isRu
                    ? 'Включи погодный режим и выбери атмосферу вручную. Для телефона теперь есть отдельный эконом-режим: он оставляет атмосферу, но сильно режет тяжёлые частицы и размытия.'
                    : 'Enable weather mode and choose the atmosphere manually. Phones now have a dedicated economy mode: it keeps the mood while cutting heavy particles and blur layers.'}
                </p>
                <div className="preferences-grid">
                  <label className="toggle">
                    <input type="checkbox" checked={settings.weatherMode} onChange={(event) => updateSetting('weatherMode', event.target.checked)} />
                    <span className="toggle-slider" />
                    <span className="toggle-label">{isRu ? 'Включить погодный режим' : 'Enable weather mode'}</span>
                  </label>
                </div>
                <div className={settings.weatherMode ? 'prefs-weather-panel prefs-weather-panel--active' : 'prefs-weather-panel'}>
                  <OptionPills options={weatherOptions} value={settings.weatherPreset} onChange={(value) => updateSetting('weatherPreset', value)} isRu={isRu} />
                  <div className="prefs-weather-hint">
                    {settings.weatherPreset === 'auto'
                      ? (isRu ? 'Сейчас режим берёт атмосферу по времени суток.' : 'The current mode follows the time of day.')
                      : (isRu ? 'Ручной сценарий активен и применяется сразу по всему сайту.' : 'A manual scenario is active and applies site-wide instantly.')}
                  </div>
                </div>
              </div>

              <div className="prefs-toggle-grid">
                {liveFeatures.filter((feature) => feature.key !== 'weatherMode').map((feature) => (
                  <ToggleCard
                    key={feature.key}
                    feature={feature}
                    checked={Boolean(settings[feature.key])}
                    onChange={(value) => updateSetting(feature.key, value)}
                    isRu={isRu}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {activeSection === 'integrations' ? (
            <div className="prefs-pane">
              <div className="prefs-block prefs-block--intro">
                <strong>{isRu ? 'Здесь живут будущие API-подключения' : 'This is where future API integrations live'}</strong>
                <p>
                  {isRu
                    ? 'Даже если реальный API ещё не подключён, пользователь уже может заранее включить нужный режим. Потом останется только подцепить обработчики и ключи.'
                    : 'Even if the real API is not connected yet, the user can pre-enable the desired mode now. Later you only need to connect handlers and keys.'}
                </p>
              </div>
              <div className="prefs-toggle-grid">
                {integrationFeatures.map((feature) => (
                  <ToggleCard
                    key={feature.key}
                    feature={feature}
                    checked={Boolean(settings[feature.key])}
                    onChange={(value) => updateSetting(feature.key, value)}
                    isRu={isRu}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
