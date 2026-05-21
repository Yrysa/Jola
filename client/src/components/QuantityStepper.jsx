import { FiMinus, FiPlus } from 'react-icons/fi';
import './QuantityStepper.css';

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  ariaLabel = 'Количество',
}) {
  const v = Number(value) || 0;
  const safeMin = Number.isFinite(Number(min)) ? Number(min) : 1;
  const safeMax = Number.isFinite(Number(max)) ? Number(max) : 99;

  const clamp = (n) => Math.min(safeMax, Math.max(safeMin, n));

  const decDisabled = disabled || v <= safeMin;
  const incDisabled = disabled || v >= safeMax;

  const set = (n) => {
    if (disabled) return;
    const next = clamp(Number(n) || safeMin);
    onChange?.(next);
  };

  return (
    <div className={`qty-stepper ${disabled ? 'is-disabled' : ''}`} aria-label={ariaLabel}>
      <button
        type="button"
        className="qty-btn"
        onClick={() => set(v - 1)}
        disabled={decDisabled}
        aria-label="Уменьшить количество"
      >
        <FiMinus />
      </button>

      <input
        className="qty-input"
        type="number"
        min={safeMin}
        max={safeMax}
        value={clamp(v)}
        onChange={(e) => set(e.target.value)}
        disabled={disabled}
        inputMode="numeric"
      />

      <button
        type="button"
        className="qty-btn"
        onClick={() => set(v + 1)}
        disabled={incDisabled}
        aria-label="Увеличить количество"
      >
        <FiPlus />
      </button>
    </div>
  );
}
