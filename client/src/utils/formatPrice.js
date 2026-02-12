export const formatPrice = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'KZT',
    minimumFractionDigits: 2,
  }).format(amount);
};
