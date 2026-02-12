import { FiDroplet, FiEye, FiLayout, FiMonitor, FiRefreshCcw, FiSliders } from 'react-icons/fi';
import { useUiSettings } from '../context/UiSettingsContext.jsx';

const themeOptions = [
  { value: 'system', label: 'Как в системе', icon: FiMonitor },
  { value: 'dark', label: 'Темная', icon: FiDroplet },
  { value: 'light', label: 'Светлая', icon: FiEye },
];

const densityOptions = [
  { value: 'compact', label: 'Компактный' },
  { value: 'comfortable', label: 'Комфортный' },
  { value: 'spacious', label: 'Просторный' },
];

const fontOptions = [
  { value: 'small', label: 'Небольшой' },
  { value: 'medium', label: 'Средний' },
  { value: 'large', label: 'Крупный' },
];

export default function UserPreferences() {
  const {
    settings,
    resolvedTheme,
    updateSetting,
    resetSettings,
  } = useUiSettings();

  return (
    <section className="preferences-card">
      <div className="preferences-header">
        <div>
          <p className="preferences-eyebrow">Настройки интерфейса</p>
          <h3>Персонализация</h3>
        </div>
        <button
          type="button"
          className="btn btn-secondary preferences-reset"
          onClick={resetSettings}
        >
          <FiRefreshCcw size={16} /> Сбросить
        </button>
      </div>

      <div className="preferences-group">
        <div className="preferences-title">
          <FiSliders /> Тема
        </div>
        <div className="preferences-options">
          {themeOptions.map(option => {
            const Icon = option.icon;
            const isActive = settings.theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={isActive ? 'pill pill--active' : 'pill'}
                onClick={() => updateSetting('theme', option.value)}
              >
                <Icon size={16} /> {option.label}
                {option.value === 'system' && (
                  <span className="pill-hint">Сейчас: {resolvedTheme === 'dark' ? 'Темная' : 'Светлая'}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="preferences-group">
        <div className="preferences-title">
          <FiLayout /> Плотность
        </div>
        <div className="preferences-options">
          {densityOptions.map(option => (
            <button
              key={option.value}
              type="button"
              className={settings.density === option.value ? 'pill pill--active' : 'pill'}
              onClick={() => updateSetting('density', option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="preferences-group">
        <div className="preferences-title">
          <FiEye /> Размер текста
        </div>
        <div className="preferences-options">
          {fontOptions.map(option => (
            <button
              key={option.value}
              type="button"
              className={settings.fontSize === option.value ? 'pill pill--active' : 'pill'}
              onClick={() => updateSetting('fontSize', option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="preferences-grid">
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.reduceMotion}
            onChange={(event) => updateSetting('reduceMotion', event.target.checked)}
          />
          <span className="toggle-slider" />
          <span className="toggle-label">Уменьшить анимацию</span>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(event) => updateSetting('highContrast', event.target.checked)}
          />
          <span className="toggle-slider" />
          <span className="toggle-label">Высокий контраст</span>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.showBackgroundFx}
            onChange={(event) => updateSetting('showBackgroundFx', event.target.checked)}
          />
          <span className="toggle-slider" />
          <span className="toggle-label">Фоновая подсветка</span>
        </label>
      </div>
    </section>
  );
}
