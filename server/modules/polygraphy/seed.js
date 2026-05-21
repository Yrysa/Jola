import PrintService from './models/PrintService.js';
import { defaultDocumentPrintPricing } from './pricing/documentPrint.js';

export const seedPolygraphyServices = async () => {
  try {
    const exists = await PrintService.countDocuments();
    if (exists > 0) return;

    await PrintService.create([
      {
        key: 'document-print',
        title: 'Печать документов',
        description: 'Печать PDF/DOCX/изображений. Выберите формат, цветность, бумагу и доп. услуги.',
        group: 'Полиграфия',
        subgroup: 'Печать документов',
        kind: 'document_print',
        isActive: true,
        pricing: defaultDocumentPrintPricing,
      },
      {
        key: 'photo-print',
        title: 'Фотопечать',
        description: 'Фотографии разных форматов (скоро).',
        group: 'Полиграфия',
        subgroup: 'Фотопечать',
        kind: 'photo_print',
        isActive: false,
        pricing: {},
      },
      {
        key: 'business-cards',
        title: 'Визитки / листовки',
        description: 'Полиграфическая продукция (скоро).',
        group: 'Полиграфия',
        subgroup: 'Полиграфическая продукция',
        kind: 'business_cards',
        isActive: false,
        pricing: {},
      },
    ]);

    console.log('✅ Polygraphy: услуги созданы (seed)');
  } catch (e) {
    console.warn('⚠️ Polygraphy seed failed:', e?.message || e);
  }
};
