import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { PolyApi } from '../api';
import { useCart } from '../../context/CartContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import DocumentPrintConfigurator from '../services/DocumentPrintConfigurator';
import './PolygraphyPages.css';

const DRAFT_KEY = 'polygraphy_edit_draft';

const PrintServicePage = () => {
  const { t } = useTranslation();
  const { key } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { addServiceToCart, replaceServiceInCart } = useCart();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const draftRef = useRef(null);
  useEffect(() => {
    
    if (editId) {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.id === editId) draftRef.current = parsed;
        } catch {}
      }
    } else {
      draftRef.current = null;
    }
  }, [editId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const s = await PolyApi.getService(key);
        if (!mounted) return;
        setService(s);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Ошибка загрузки');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [key]);

  const header = useMemo(() => {
    const title = service?.title || t('polygraphy.service');
    const subtitle = service?.description || t('polygraphy.serviceDefaultDesc');
    return { title, subtitle };
  }, [service, t]);

  const onAdd = (payload) => {
    
    if (editId) {
      replaceServiceInCart(editId, payload);
      localStorage.removeItem(DRAFT_KEY);
      navigate('/cart');
      return;
    }
    addServiceToCart(payload);
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="container poly-page poly-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="container poly-page">
        <div className="poly-error">{error || t('polygraphy.notFound')}</div>
        <Link to="/polygraphy" className="poly-back">← {t('polygraphy.back')}</Link>
      </div>
    );
  }

  const isSupported = service.kind === 'document_print';

  return (
    <div className="container poly-page">
      <div className="poly-topbar">
        <Link to="/polygraphy" className="poly-back">← {t('polygraphy.back')}</Link>
        <div className="poly-breadcrumb">{t('nav.home')} / {t('polygraphy.title')}</div>
      </div>

      <div className="poly-service-head">
        <div>
          <h1 className="poly-title">{header.title}</h1>
          <p className="poly-subtitle">{header.subtitle}</p>
        </div>
        <div className="poly-service-tags" aria-hidden="true">
          <span className="poly-chip">₸</span>
          <span className="poly-chip">{t('polygraphy.serverCalc')}</span>
          <span className="poly-chip">Drag & Drop</span>
        </div>
      </div>

      {!isSupported && (
        <div className="poly-note">
          <div className="poly-note-card">
            <div className="poly-note-title">{t('polygraphy.soonTitle')}</div>
            <div className="poly-note-text">{t('polygraphy.soonText')}</div>
          </div>
        </div>
      )}

      {isSupported && (
        <DocumentPrintConfigurator
          service={service}
          onSubmit={onAdd}
          initialDraft={draftRef.current || location.state?.draft || null}
        />
      )}
    </div>
  );
};

export default PrintServicePage;
