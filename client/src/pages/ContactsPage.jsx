import { FiClock, FiMail, FiMessageCircle, FiPhone, FiSend } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import './ContactsPage.css';

export default function ContactsPage() {
  const { i18n } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');

  const copy = isRu
    ? {
        title: 'Контакты',
        subtitle: 'Оставили только главное: как быстро связаться с Jola без лишних форм и пустых полей.',
        note: 'Для заказа, печати или вопроса по товару удобнее всего написать в Telegram или WhatsApp.',
        response: 'Обычно отвечаем в течение 5–30 минут.',
        telegram: 'Написать в Telegram',
        whatsapp: 'Написать в WhatsApp',
      }
    : {
        title: 'Contacts',
        subtitle: 'Only the essentials stay here: the fastest ways to reach Jola without unnecessary forms.',
        note: 'For orders, print requests, or product questions, Telegram or WhatsApp is the quickest option.',
        response: 'We usually reply within 5–30 minutes.',
        telegram: 'Message on Telegram',
        whatsapp: 'Message on WhatsApp',
      };

  const cards = [
    {
      icon: FiMessageCircle,
      title: 'Telegram',
      value: '@Yrysyessey',
      href: 'https://t.me/Yrysyessey',
      action: copy.telegram,
    },
    {
      icon: FiPhone,
      title: 'WhatsApp',
      value: '+7 776 173 9039',
      href: 'https://wa.me/77761739039',
      action: copy.whatsapp,
    },
    {
      icon: FiMail,
      title: 'Email',
      value: 'support@jola.store',
      href: 'mailto:support@jola.store',
      action: 'support@jola.store',
    },
    {
      icon: FiClock,
      title: isRu ? 'Время ответа' : 'Response time',
      value: copy.response,
      href: null,
      action: isRu ? 'Онлайн ежедневно' : 'Online every day',
    },
  ];

  return (
    <div className="contacts-page">
      <div className="container">
        <section className="contacts-hero">
          <span className="contacts-hero__pill"><FiSend /> Jola Support</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </section>

        <section className="contacts-grid">
          {cards.map((card) => {
            const Icon = card.icon;
            const content = (
              <>
                <div className="contacts-card__icon"><Icon /></div>
                <div className="contacts-card__title">{card.title}</div>
                <div className="contacts-card__value">{card.value}</div>
                <div className="contacts-card__meta">{card.action}</div>
              </>
            );

            return card.href ? (
              <a key={card.title} href={card.href} className="contacts-card" target={card.href.startsWith('http') ? '_blank' : undefined} rel={card.href.startsWith('http') ? 'noreferrer' : undefined}>
                {content}
              </a>
            ) : (
              <div key={card.title} className="contacts-card contacts-card--static">
                {content}
              </div>
            );
          })}
        </section>

        <section className="contacts-note">
          <div className="contacts-note__title">{isRu ? 'Как удобнее связаться' : 'Best way to contact us'}</div>
          <p>{copy.note}</p>
        </section>
      </div>
    </div>
  );
}
