import { useTranslation } from 'react-i18next';

export default function ShippingPage() {
  const { t } = useTranslation();
  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>{t('footer.shipping', { defaultValue: 'Доставка и оплата' })}</h1>
        <ul style={{ color: 'var(--color-text-secondary)', fontWeight: 700, lineHeight: 1.6 }}>
          <li>{t('static.ship1', { defaultValue: 'Доставка по городу — 1–2 дня (в зависимости от загрузки).' })}</li>
          <li>{t('static.ship2', { defaultValue: 'Оплата: картой онлайн или наличными при получении (если доступно).' })}</li>
          <li>{t('static.ship3', { defaultValue: 'Возврат — 14 дней при сохранении товарного вида.' })}</li>
        </ul>
      </div>
    </div>
  );
}
