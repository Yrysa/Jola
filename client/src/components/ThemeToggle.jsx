import { FiMoon, FiSun } from 'react-icons/fi';
import { useUiSettings } from '../context/UiSettingsContext.jsx';

export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useUiSettings();

  return (
    <button
      type="button"
      className="btn btn-secondary theme-toggle"
      onClick={toggleTheme}
      aria-label={resolvedTheme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
    >
      {resolvedTheme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
      <span className="theme-toggle__label">
        {resolvedTheme === 'dark' ? 'Светлая тема' : 'Темная тема'}
      </span>
    </button>
  );
}
