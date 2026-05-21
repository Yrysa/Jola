import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PolyApi } from '../api';
import OnlineEditorModal from '../components/OnlineEditorModal.jsx';
import './PolygraphyConfigurator.css';

const DRAFT_KEY = 'polygraphy_edit_draft';

const defaultOptions = {
  format: 'A4',
  color: 'bw',
  sides: 'single',
  copies: 1,
  paper: 'plain_80',
  extras: {
    lamination: false,
    staples: false,
    punch: false,
  },
  urgent: false,
};

const debounce = (fn, ms) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const formatSize = (bytes) => {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const buildServiceItem = ({ service, options, calcData }) => {
  const files = (calcData?.files || []).map((f) => ({
    fileId: f._id,
    originalName: f.originalName,
    url: f.url,
    size: f.size,
    ext: f.ext,
    pages: f.pages,
  }));
  return {
    serviceKey: service.key,
    serviceTitle: service.title,
    kind: service.kind,
    options,
    fileIds: files.map((f) => f.fileId),
    files,
    price: Number(calcData?.total || 0),
    breakdown: calcData?.breakdown || {},
  };
};

const DocumentPrintConfigurator = ({ service, onSubmit, initialDraft }) => {
  const { t } = useTranslation();
  const [limits, setLimits] = useState({ maxFileSizeMb: 100, allowedExts: [] });
  const [options, setOptions] = useState(() => initialDraft?.options || defaultOptions);
  const [uploaded, setUploaded] = useState(() => initialDraft?.files || []);

  
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorFile, setEditorFile] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState('');
  const [calcData, setCalcData] = useState(null);

  const dropRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const l = await PolyApi.getLimits();
        setLimits(l);
      } catch {
        
      }
    })();
  }, []);

  
  useEffect(() => {
    if (initialDraft?.fileIds?.length && !calcData) {
      doCalc(initialDraft.fileIds, options);
    }
    
  }, [initialDraft]);

  const fileIds = useMemo(() => uploaded.map((f) => f.fileId || f._id).filter(Boolean), [uploaded]);

  const doCalc = async (ids = fileIds, opts = options) => {
    if (!ids.length) {
      setCalcData(null);
      setCalcError('');
      return;
    }
    try {
      setCalcLoading(true);
      setCalcError('');
      const data = await PolyApi.calc(service.key, { fileIds: ids, options: opts });
      setCalcData(data);
    } catch (e) {
      setCalcError(e?.message || t('polygraphy.calcError'));
      setCalcData(null);
    } finally {
      setCalcLoading(false);
    }
  };

  const debouncedCalc = useMemo(() => debounce(doCalc, 250), [service.key, options, fileIds]);

  useEffect(() => {
    
    if (fileIds.length) debouncedCalc(fileIds, options);
    
  }, [options]);

  const onFilesSelected = async (files) => {
    const arr = Array.from(files || []);
    if (!arr.length) return;

    
    const maxBytes = (Number(limits.maxFileSizeMb) || 100) * 1024 * 1024;
    const allowed = new Set((limits.allowedExts || []).map((x) => String(x).toLowerCase()));

    const filtered = arr.filter((f) => {
      const name = String(f.name || '').toLowerCase();
      const ext = name.split('.').pop();
      if (allowed.size && !allowed.has(ext)) return false;
      if (f.size > maxBytes) return false;
      return true;
    });

    if (!filtered.length) {
      setCalcError(t('polygraphy.uploadNoValid'));
      return;
    }

    try {
      setUploading(true);
      setCalcError('');
      const saved = await PolyApi.uploadFiles(service.key, filtered);
      const next = [...uploaded, ...saved.map((s) => ({
        fileId: s._id,
        originalName: s.originalName,
        url: s.url,
        size: s.size,
        ext: s.ext,
        pages: s.pages,
      }))];
      setUploaded(next);
      const ids = next.map((x) => x.fileId);
      await doCalc(ids, options);
    } catch (e) {
      setCalcError(e?.message || t('polygraphy.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.remove('is-drag');
    const files = e.dataTransfer?.files;
    onFilesSelected(files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.add('is-drag');
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.remove('is-drag');
  };

  const removeFile = async (fileId) => {
    try {
      await PolyApi.deleteUpload(fileId);
    } catch {
      
    }
    const next = uploaded.filter((f) => (f.fileId || f._id) !== fileId);
    setUploaded(next);
    const ids = next.map((x) => x.fileId || x._id).filter(Boolean);
    await doCalc(ids, options);
  };

  const openEditor = (f) => {
    if (!f?.url) return;
    setEditorFile(f);
    setEditorOpen(true);
  };

  const onEditorReplaced = async (oldId, nextFile) => {
    
    const next = uploaded.map((f) => {
      const id = f.fileId || f._id;
      if (id !== oldId) return f;
      return {
        ...f,
        ...nextFile,
        fileId: nextFile.fileId || nextFile._id,
      };
    });
    setUploaded(next);
    const ids = next.map((x) => x.fileId || x._id).filter(Boolean);
    await doCalc(ids, options);
  };

  const totalPages = useMemo(() => {
    const list = calcData?.files || uploaded || [];
    return list.reduce((sum, f) => sum + Math.max(1, Number(f.pages || 1)), 0);
  }, [calcData, uploaded]);

  const onChange = (patch) => {
    setOptions((prev) => ({ ...prev, ...patch }));
  };

  const canSubmit = Boolean(calcData?.total) && fileIds.length && !uploading;

  const submit = () => {
    if (!canSubmit) return;
    const payload = buildServiceItem({ service, options, calcData });
    onSubmit(payload);
  };

  const persistDraftForEdit = () => {
    
    const payload = {
      id: initialDraft?.id,
      options,
      fileIds,
      files: uploaded,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  };

  return (
    <div className="poly-config">
      <div className="poly-config-grid">
        <div className="poly-card panel">
          <div className="panel-head">
            <h2 className="panel-title">{t('polygraphy.uploadTitle')}</h2>
            <div className="panel-hint">{t('polygraphy.uploadHint', { max: limits.maxFileSizeMb })}</div>
          </div>

          <div
            ref={dropRef}
            className={`dropzone ${uploading ? 'is-loading' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <div className="dropzone-inner">
              <div className="drop-icon" aria-hidden="true">⬆️</div>
              <div className="drop-title">{t('polygraphy.dropTitle')}</div>
              <div className="drop-sub">{t('polygraphy.dropSub')}</div>
              <label className="btn primary">
                {uploading ? t('polygraphy.uploading') : t('polygraphy.chooseFiles')}
                <input
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => onFilesSelected(e.target.files)}
                />
              </label>
            </div>
          </div>

          {uploaded.length > 0 && (
            <div className="file-list">
              {uploaded.map((f) => {
                const id = f.fileId || f._id;
                const isImg = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'svg'].includes(String(f.ext).toLowerCase());
                return (
                  <div key={id} className="file-row">
                    <div className="file-left">
                      <div className="file-badge">{String(f.ext || '').toUpperCase()}</div>
                      <div className="file-meta">
                        <div className="file-name">{f.originalName}</div>
                        <div className="file-sub">
                          {formatSize(f.size)} · {Math.max(1, Number(f.pages || 1))} {t('polygraphy.pagesShort')}
                        </div>
                      </div>
                    </div>
                    <div className="file-actions">
                      {f.url && (
                        <button className="btn ghost" type="button" onClick={() => openEditor(f)}>
                          {t('polygraphy.editOnline', { defaultValue: 'Редактировать' })}
                        </button>
                      )}
                      {isImg && f.url && (
                        <a className="btn ghost" href={f.url} target="_blank" rel="noreferrer">{t('polygraphy.preview')}</a>
                      )}
                      <button className="btn danger" type="button" onClick={() => removeFile(id)}>
                        {t('polygraphy.remove')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <OnlineEditorModal
          open={editorOpen}
          serviceKey={service.key}
          file={editorFile}
          onClose={() => setEditorOpen(false)}
          onReplaced={onEditorReplaced}
        />

        <div className="poly-card panel">
          <div className="panel-head">
            <h2 className="panel-title">{t('polygraphy.optionsTitle')}</h2>
            <div className="panel-hint">{t('polygraphy.optionsHint')}</div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>{t('polygraphy.format')}</label>
              <select value={options.format} onChange={(e) => onChange({ format: e.target.value })}>
                {['A4', 'A3', 'A2', 'A1', 'A0'].map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>{t('polygraphy.color')}</label>
              <div className="segmented">
                <button
                  type="button"
                  className={options.color === 'bw' ? 'seg active' : 'seg'}
                  onClick={() => onChange({ color: 'bw' })}
                >
                  {t('polygraphy.bw')}
                </button>
                <button
                  type="button"
                  className={options.color === 'color' ? 'seg active' : 'seg'}
                  onClick={() => onChange({ color: 'color' })}
                >
                  {t('polygraphy.colorful')}
                </button>
              </div>
            </div>

            <div className="field">
              <label>{t('polygraphy.sides')}</label>
              <div className="segmented">
                <button
                  type="button"
                  className={options.sides === 'single' ? 'seg active' : 'seg'}
                  onClick={() => onChange({ sides: 'single' })}
                >
                  {t('polygraphy.single')}
                </button>
                <button
                  type="button"
                  className={options.sides === 'duplex' ? 'seg active' : 'seg'}
                  onClick={() => onChange({ sides: 'duplex' })}
                >
                  {t('polygraphy.duplex')}
                </button>
              </div>
            </div>

            <div className="field">
              <label>{t('polygraphy.copies')}</label>
              <div className="stepper">
                <button type="button" className="btn ghost" onClick={() => onChange({ copies: Math.max(1, Number(options.copies || 1) - 1) })}>−</button>
                <input
                  type="number"
                  min={1}
                  value={options.copies}
                  onChange={(e) => onChange({ copies: Math.max(1, Number(e.target.value || 1)) })}
                />
                <button type="button" className="btn ghost" onClick={() => onChange({ copies: Math.max(1, Number(options.copies || 1) + 1) })}>+</button>
              </div>
            </div>

            <div className="field">
              <label>{t('polygraphy.paper')}</label>
              <select value={options.paper} onChange={(e) => onChange({ paper: e.target.value })}>
                <option value="plain_80">{t('polygraphy.paperPlain80')}</option>
                <option value="thick_160">{t('polygraphy.paperThick160')}</option>
                <option value="glossy">{t('polygraphy.paperGlossy')}</option>
                <option value="matte">{t('polygraphy.paperMatte')}</option>
              </select>
            </div>

            <div className="field">
              <label>{t('polygraphy.extras')}</label>
              <div className="checks">
                {[
                  { k: 'lamination', label: t('polygraphy.lamination') },
                  { k: 'staples', label: t('polygraphy.staples') },
                  { k: 'punch', label: t('polygraphy.punch') },
                ].map((x) => (
                  <label key={x.k} className="check">
                    <input
                      type="checkbox"
                      checked={Boolean(options.extras?.[x.k])}
                      onChange={(e) => onChange({ extras: { ...options.extras, [x.k]: e.target.checked } })}
                    />
                    <span>{x.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>{t('polygraphy.urgent')}</label>
              <label className="check">
                <input type="checkbox" checked={Boolean(options.urgent)} onChange={(e) => onChange({ urgent: e.target.checked })} />
                <span>{t('polygraphy.urgentLabel')}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="poly-card panel poly-summary">
          <div className="panel-head">
            <h2 className="panel-title">{t('polygraphy.summary')}</h2>
            <div className="panel-hint">{t('polygraphy.summaryHint')}</div>
          </div>

          <div className="summary-metrics">
            <div className="metric">
              <div className="metric-label">{t('polygraphy.files')}</div>
              <div className="metric-value">{uploaded.length}</div>
            </div>
            <div className="metric">
              <div className="metric-label">{t('polygraphy.pages')}</div>
              <div className="metric-value">{totalPages}</div>
            </div>
            <div className="metric">
              <div className="metric-label">{t('polygraphy.copies')}</div>
              <div className="metric-value">{Math.max(1, Number(options.copies || 1))}</div>
            </div>
          </div>

          {calcError && <div className="poly-error">{calcError}</div>}

          <div className="price-box">
            <div className="price-row">
              <div className="price-label">{t('polygraphy.total')}</div>
              <div className="price-value">
                {calcLoading ? '…' : `${Number(calcData?.total || 0).toLocaleString()} ₸`}
              </div>
            </div>
            {calcData?.breakdown && (
              <div className="price-sub">
                <div>{t('polygraphy.pagesCost')}: {Number(calcData.breakdown.pagesCost || 0).toLocaleString()} ₸</div>
                <div>{t('polygraphy.extrasCost')}: {Number(calcData.breakdown.extrasCost || 0).toLocaleString()} ₸</div>
                {calcData.breakdown.urgent ? (
                  <div>{t('polygraphy.urgent')}: ×{Number(calcData.breakdown.urgentMultiplier || 1.5)}</div>
                ) : null}
              </div>
            )}
          </div>

          <button
            type="button"
            className={`btn primary w100 ${!canSubmit ? 'disabled' : ''}`}
            onClick={submit}
            onMouseDown={persistDraftForEdit}
            disabled={!canSubmit}
          >
            {t('polygraphy.addToCart')}
          </button>

          <div className="summary-note">{t('polygraphy.serverCalcNote')}</div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPrintConfigurator;
