

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const defaultDocumentPrintPricing = {
  base: {
    a4_bw: 5,
    a4_color: 15,
  },
  
  formatCoef: {
    A4: 1,
    A3: 2,
    A2: 4,
    A1: 8,
    A0: 16,
  },
  paperCoef: {
    plain_80: 1,
    thick_160: 1.6,
    glossy: 1.8,
    matte: 1.7,
  },
  duplexSecondSideDiscount: 0.2, 
  extras: {
    lamination: 50,
    staples: 20,
    punch: 20,
  },
  urgentMultiplier: 1.5,
  minOrder: 0,
};

export const calcDocumentPrint = ({ pricing, files, options }) => {
  const p = { ...defaultDocumentPrintPricing, ...(pricing || {}) };

  const format = String(options?.format || 'A4');
  const color = String(options?.color || 'bw'); 
  const sides = String(options?.sides || 'single'); 
  const copies = Math.max(1, Number(options?.copies || 1));
  const paper = String(options?.paper || 'plain_80');
  const extras = {
    lamination: Boolean(options?.extras?.lamination),
    staples: Boolean(options?.extras?.staples),
    punch: Boolean(options?.extras?.punch),
  };
  const urgent = Boolean(options?.urgent);

  const formatCoef = Number(p.formatCoef?.[format] ?? 1) || 1;
  const paperCoef = Number(p.paperCoef?.[paper] ?? 1) || 1;
  const base = color === 'color' ? Number(p.base?.a4_color || 0) : Number(p.base?.a4_bw || 0);

  
  const totalPages = (files || []).reduce((sum, f) => sum + Math.max(1, Number(f.pages || 1)), 0);

  
  const sidePrice = base * formatCoef * paperCoef;
  let pagesCost = sidePrice * totalPages;
  
  if (sides === 'duplex') {
    
    const secondSides = Math.floor(totalPages / 2);
    const discount = Number(p.duplexSecondSideDiscount || 0);
    pagesCost = sidePrice * totalPages - sidePrice * secondSides * discount;
  }

  pagesCost = pagesCost * copies;

  
  let extrasCost = 0;
  if (extras.lamination) extrasCost += Number(p.extras?.lamination || 0);
  if (extras.staples) extrasCost += Number(p.extras?.staples || 0);
  if (extras.punch) extrasCost += Number(p.extras?.punch || 0);

  let subtotal = pagesCost + extrasCost;
  if (urgent) subtotal = subtotal * Number(p.urgentMultiplier || 1.5);

  subtotal = Math.max(Number(p.minOrder || 0), subtotal);

  const breakdown = {
    totalPages,
    copies,
    sidePrice: round2(sidePrice),
    pagesCost: round2(pagesCost),
    extrasCost: round2(extrasCost),
    urgent,
    urgentMultiplier: urgent ? Number(p.urgentMultiplier || 1.5) : 1,
  };

  return { total: round2(subtotal), breakdown };
};
