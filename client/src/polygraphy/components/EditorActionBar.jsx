import React from 'react';
import './EditorActionBar.css';

export default function EditorActionBar({
  onDownload,
  onPrintInJola,
  onNew,
  busy = false,
  disabledDownload = false,
  disabledPrintInJola = false,
  disabledNew = false,
  downloadLabel = 'Скачать',
  printLabel = 'Печать в Jola',
  newLabel = 'Новый',
  extra = null,
}) {
  return (
    <div className="ea-bar" role="toolbar" aria-label="Editor actions">
      <button
        type="button"
        className="ea-btn ea-btn--primary"
        onClick={onDownload}
        disabled={busy || disabledDownload}
        title={downloadLabel}
      >
        <span className="ea-ico" aria-hidden="true">⬇️</span>
        <span className="ea-text">{downloadLabel}</span>
      </button>

      <button
        type="button"
        className="ea-btn ea-btn--glass"
        onClick={onPrintInJola}
        disabled={busy || disabledPrintInJola}
        title={printLabel}
      >
        <span className="ea-ico" aria-hidden="true">🖨️</span>
        <span className="ea-text">{printLabel}</span>
      </button>

      <button
        type="button"
        className="ea-btn ea-btn--ghost"
        onClick={onNew}
        disabled={busy || disabledNew}
        title={newLabel}
      >
        <span className="ea-ico" aria-hidden="true">✨</span>
        <span className="ea-text">{newLabel}</span>
      </button>

      {extra ? <div className="ea-extra">{extra}</div> : null}
    </div>
  );
}
