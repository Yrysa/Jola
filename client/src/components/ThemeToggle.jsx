import { FiMoon, FiSun } from 'react-icons/fi';
import { useUiSettings } from '../context/UiSettingsContext.jsx';
import { useTranslation } from 'react-i18next';

export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useUiSettings();
  const { t } = useTranslation();

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      className="btn btn-secondary theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? t('theme.ariaToLight') : t('theme.ariaToDark')}
    >
      {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
      <span className="theme-toggle__label">
        {isDark ? t('theme.light') : t('theme.dark')}
      </span>
    </button>
  );
}
