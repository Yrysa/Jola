import './ContactFooter.css';
import { FaWhatsapp, FaTelegramPlane, FaVk } from 'react-icons/fa';
import { FiPhone } from 'react-icons/fi';

const CONTACTS = [
  {
    label: 'WhatsApp',
    href: 'https://wa.me/79991234567',
    icon: FaWhatsapp,
  },
  {
    label: 'Telegram',
    href: 'https://t.me/jola_support',
    icon: FaTelegramPlane,
  },
  {
    label: 'VK',
    href: 'https://vk.com/jola_support',
    icon: FaVk,
  },
  {
    label: '+7 (999) 123-45-67',
    href: 'tel:+79991234567',
    icon: FiPhone,
  },
];

function ContactFooter() {
  return (
    <footer className="contact-footer">
      <div className="contact-footer__content">
        {CONTACTS.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            className="contact-footer__link"
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </footer>
  );
}

export default ContactFooter;
