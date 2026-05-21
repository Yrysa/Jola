import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { FiRefreshCcw, FiSearch, FiSliders, FiX } from 'react-icons/fi';
import { productService } from '../services/productService.js';
import ProductGrid from '../components/ProductGrid.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { useDebouncedValue } from '../utils/useDebouncedValue.js';
import './ProductsPage.css';

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProductsPage() {
  const { i18n, t } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');
  const [searchParams, setSearchParams] = useSearchParams();

  const getParam = (key, fallback = '') => searchParams.get(key) ?? fallback;
  const page = Math.max(Number(getParam('page', '1')) || 1, 1);
  const sort = getParam('sort', 'popular');
  const categoryArr = splitCsv(getParam('category', ''));
  const brandArr = splitCsv(getParam('brand', ''));
  const inStock = getParam('inStock') === 'true';
  const availabilityParam = getParam('availability', inStock ? 'inStock' : 'all');
  const effectiveAvailability = availabilityParam === 'preorder' ? 'preorder' : availabilityParam === 'inStock' ? 'inStock' : 'all';
  const newOnly = getParam('new') === 'true';
  const minPriceParam = getParam('minPrice', '');
  const maxPriceParam = getParam('maxPrice', '');
  const searchParam = getParam('search', '');

  const { data: categories } = useQuery(['categories'], () => productService.getCategories(), {
    staleTime: 1000 * 60 * 10,
  });

  const { data: meta } = useQuery(['filtersMeta'], () => productService.getFiltersMeta(), {
    staleTime: 1000 * 60 * 10,
  });

  const [searchInput, setSearchInput] = useState(searchParam);
  const [showSuggest, setShowSuggest] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const suggestRef = useRef(null);

  useEffect(() => setSearchInput(searchParam), [searchParam]);

  const debouncedSearch = useDebouncedValue(searchInput, 250);
  const { data: suggestData, isLoading: isSuggestLoading } = useQuery(
    ['suggest', debouncedSearch],
    () => productService.getSuggest(debouncedSearch),
    { enabled: debouncedSearch.trim().length >= 2, staleTime: 1000 * 10 }
  );

  const brandSuggestions = suggestData?.brands ?? [];
  const productSuggestions = (suggestData?.products ?? []).slice(0, 5);

  useEffect(() => {
    const onClick = (event) => {
      if (!suggestRef.current) return;
      if (!suggestRef.current.contains(event.target)) setShowSuggest(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = filtersOpen || sortSheetOpen ? 'hidden' : previousOverflow;
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [filtersOpen, sortSheetOpen]);

  const setParam = (key, value, opts = { replace: false }) => {
    const next = new URLSearchParams(searchParams);

    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      next.delete(key);
    } else {
      next.set(key, Array.isArray(value) ? value.join(',') : String(value));
    }

    if (key !== 'page') next.set('page', '1');
    setSearchParams(next, opts);
  };

  const toggleInArray = (arr, value) => (arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value]);

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: false });
    setSearchInput('');
    setBrandSearch('');
    setShowSuggest(false);
  };

  const minBound = Number(meta?.minPrice ?? 0);
  const maxBound = Number(meta?.maxPrice ?? 100000);

  const [priceMin, setPriceMin] = useState(minPriceParam !== '' ? Number(minPriceParam) : minBound);
  const [priceMax, setPriceMax] = useState(maxPriceParam !== '' ? Number(maxPriceParam) : maxBound);

  useEffect(() => {
    if (!meta) return;
    if (minPriceParam === '') setPriceMin(minBound);
    if (maxPriceParam === '') setPriceMax(maxBound);
  }, [meta, minBound, maxBound, minPriceParam, maxPriceParam]);

  const debouncedPriceMin = useDebouncedValue(priceMin, 350);
  const debouncedPriceMax = useDebouncedValue(priceMax, 350);

  useEffect(() => {
    if (!meta) return;

    const minVal = Math.max(minBound, Math.min(debouncedPriceMin, maxBound));
    const maxVal = Math.max(minBound, Math.min(debouncedPriceMax, maxBound));
    const next = new URLSearchParams(searchParams);
    next.set('page', '1');

    if (minVal <= minBound) next.delete('minPrice'); else next.set('minPrice', String(Math.floor(minVal)));
    if (maxVal >= maxBound) next.delete('maxPrice'); else next.set('maxPrice', String(Math.ceil(maxVal)));

    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [debouncedPriceMin, debouncedPriceMax, meta, minBound, maxBound, searchParams, setSearchParams]);

  const filters = useMemo(() => {
    const next = {
      limit: 16,
      sort: sort || 'popular',
      search: searchParam || '',
      category: categoryArr,
      brand: brandArr,
      new: newOnly,
    };

    if (effectiveAvailability === 'inStock') next.inStock = true;
    if (effectiveAvailability === 'preorder') next.availability = 'preorder';
    if (minPriceParam !== '') next.minPrice = Number(minPriceParam);
    if (maxPriceParam !== '') next.maxPrice = Number(maxPriceParam);

    return next;
  }, [sort, searchParam, categoryArr, brandArr, newOnly, effectiveAvailability, minPriceParam, maxPriceParam]);

  const breadcrumbs = useMemo(
    () => [
      { label: isRu ? 'Главная' : 'Home', to: '/' },
      { label: isRu ? 'Каталог' : 'Catalog', to: '/products' },
      ...(categoryArr.length ? [{ label: categoryArr[categoryArr.length - 1] }] : []),
    ],
    [categoryArr, isRu]
  );

  const brandsFiltered = useMemo(() => {
    const all = meta?.brands ?? [];
    if (!brandSearch.trim()) return all;
    const q = brandSearch.toLowerCase();
    return all.filter((item) => String(item).toLowerCase().includes(q));
  }, [meta?.brands, brandSearch]);

  const applySearch = (value) => {
    setParam('search', value.trim());
    setShowSuggest(false);
  };

  const applyBrand = (brand) => {
    const next = new URLSearchParams(searchParams);
    next.set('brand', String(brand));
    next.delete('search');
    next.set('page', '1');
    setSearchParams(next, { replace: false });
    setSearchInput('');
    setShowSuggest(false);
  };

  const activeFilterCount = categoryArr.length
    + brandArr.length
    + (newOnly ? 1 : 0)
    + (searchParam ? 1 : 0)
    + (effectiveAvailability !== 'all' ? 1 : 0)
    + (minPriceParam !== '' || maxPriceParam !== '' ? 1 : 0);

  const summaryChips = [
    ...categoryArr,
    ...brandArr,
    ...(newOnly ? [isRu ? 'Новинки' : 'New'] : []),
    ...(effectiveAvailability === 'inStock' ? [t('products.inStock')] : []),
    ...(effectiveAvailability === 'preorder' ? [isRu ? 'Под заказ' : 'Pre-order'] : []),
    ...(searchParam ? [`${isRu ? 'Поиск' : 'Search'}: ${searchParam}`] : []),
  ].slice(0, 7);

  const heroHighlights = [
    {
      value: String((categories ?? []).length || '—'),
      label: isRu ? 'категорий' : 'categories',
    },
    {
      value: String((meta?.brands ?? []).length || '—'),
      label: isRu ? 'брендов' : 'brands',
    },
    {
      value: String(activeFilterCount),
      label: isRu ? 'активных фильтров' : 'active filters',
    },
  ];

  const closeDrawer = () => setFiltersOpen(false);
  const closeSortSheet = () => setSortSheetOpen(false);

  const sortOptions = [
    { value: 'popular', label: isRu ? 'Популярные' : 'Popular' },
    { value: 'newest', label: t('products.sort.newest') },
    { value: 'priceAsc', label: t('products.sort.priceAsc') },
    { value: 'priceDesc', label: t('products.sort.priceDesc') },
    { value: 'discountDesc', label: t('products.sort.discountDesc') },
  ];

  const currentSortLabel = sortOptions.find((item) => item.value === sort)?.label || (isRu ? 'Популярные' : 'Popular');

  return (
    <div className="products-page">
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />

        <div className="catalog-top catalog-top--clean">
          <div className="catalog-top__copy">
            <div className="catalog-badge">Jola Catalog</div>
            <h1 className="catalog-title">{t('products.title')}</h1>
            <div className="catalog-sub">
              {isRu
                ? 'Находите нужные товары по категориям, брендам, цене и наличию в удобном меню каталога.'
                : 'Find the right products by category, brand, price, and availability in one catalog menu.'}
            </div>

            <div className="catalog-highlights">
              {heroHighlights.map((item) => (
                <div key={item.label} className="catalog-highlight-card">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="catalog-toolbar">
            <div className="catalog-sort">
              <span className="catalog-sort__label">{isRu ? 'Сортировка' : 'Sort'}</span>
              <select value={sort} onChange={(event) => setParam('sort', event.target.value)}>
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <button type="button" className="btn-filter" onClick={() => setFiltersOpen(true)}>
              <FiSliders />
              <span>{isRu ? 'Меню каталога' : 'Catalog menu'}</span>
              {activeFilterCount > 0 ? <strong>{activeFilterCount}</strong> : null}
            </button>
          </div>
        </div>

        <div className="catalog-tip-line">
          <span>{isRu ? 'Откройте меню каталога, чтобы настроить поиск и фильтры.' : 'Open the catalog menu to adjust search and filters.'}</span>
          <span>{isRu ? 'Сортировка и фильтры помогают быстрее найти нужный товар.' : 'Sorting and filters help you find the right product faster.'}</span>
        </div>

        {summaryChips.length > 0 ? (
          <div className="catalog-chips">
            {summaryChips.map((chip) => (
              <span key={chip} className="catalog-chip">{chip}</span>
            ))}
            <button type="button" className="catalog-chip catalog-chip--action" onClick={clearAllFilters}>
              <FiRefreshCcw /> {t('products.clear')}
            </button>
          </div>
        ) : null}

        <main className="catalog-content catalog-content--full">
          <ProductGrid
            filters={filters}
            page={page}
            onPageChange={(nextPage) => setParam('page', nextPage)}
            onEmptyAction={clearAllFilters}
            emptyActionLabel={isRu ? 'Сбросить меню каталога' : 'Reset catalog menu'}
          />
        </main>
      </div>

      <div className="mobile-catalog-bar">
        <button type="button" className="mobile-catalog-bar__btn" onClick={() => setFiltersOpen(true)}>
          <FiSliders />
          <span>{isRu ? 'Фильтр' : 'Filter'}</span>
          {activeFilterCount > 0 ? <strong>{activeFilterCount}</strong> : null}
        </button>
        <button type="button" className="mobile-catalog-bar__btn" onClick={() => setSortSheetOpen(true)}>
          <span>{isRu ? 'Сорт' : 'Sort'}</span>
          <small>{currentSortLabel}</small>
        </button>
        <button type="button" className="mobile-catalog-bar__btn" onClick={() => setFiltersOpen(true)}>
          <span>{isRu ? 'Категории' : 'Categories'}</span>
          <small>{categoryArr.length > 0 ? categoryArr.length : (isRu ? 'Все' : 'All')}</small>
        </button>
        <button
          type="button"
          className="mobile-catalog-bar__btn mobile-catalog-bar__btn--ghost"
          onClick={() => {
            setFiltersOpen(true);
            setTimeout(() => {
              const node = document.querySelector('.catalog-search input');
              node?.focus();
            }, 120);
          }}
        >
          <FiSearch />
          <span>{isRu ? 'Поиск' : 'Search'}</span>
        </button>
      </div>

      <div className={sortSheetOpen ? 'sort-sheet sort-sheet--open' : 'sort-sheet'}>
        <div className="sort-sheet__overlay" onMouseDown={closeSortSheet} />
        <div className="sort-sheet__panel" role="dialog" aria-modal="true" aria-label={isRu ? 'Сортировка каталога' : 'Catalog sorting'}>
          <div className="sort-sheet__head">
            <strong>{isRu ? 'Сортировка' : 'Sort'}</strong>
            <button type="button" className="sort-sheet__close" onClick={closeSortSheet}><FiX /></button>
          </div>
          <div className="sort-sheet__body">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={sort === option.value ? 'sort-sheet__option sort-sheet__option--active' : 'sort-sheet__option'}
                onClick={() => {
                  setParam('sort', option.value);
                  closeSortSheet();
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={filtersOpen ? 'filters-drawer filters-drawer--open' : 'filters-drawer'}>
        <div className="filters-drawer__overlay" onMouseDown={closeDrawer} />
        <div className="filters-drawer__panel" role="dialog" aria-modal="true" aria-label={isRu ? 'Меню каталога' : 'Catalog menu'}>
          <div className="filters-drawer__head">
            <div>
              <div className="filters-drawer__title">{isRu ? 'Меню каталога' : 'Catalog menu'}</div>
              <div className="filters-drawer__sub">
                {isRu ? 'Поиск, бренды, цена и наличие в одном месте.' : 'Search, brands, price, and availability in one place.'}
              </div>
            </div>
            <button type="button" className="filters-drawer__close" onClick={closeDrawer}>
              <FiX />
            </button>
          </div>

          <div className="filters-drawer__body">
            <div className="filters-group filters-group--hero">
              <div className="filters-group__title">{isRu ? 'Быстрый поиск' : 'Quick search'}</div>
              <div className="catalog-search" ref={suggestRef}>
                <FiSearch className="catalog-search__icon" />
                <input
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                    setShowSuggest(true);
                  }}
                  onFocus={() => setShowSuggest(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') applySearch(searchInput);
                  }}
                  placeholder={t('products.searchPlaceholder')}
                />
                {searchInput ? (
                  <button
                    type="button"
                    className="catalog-search__clear"
                    onClick={() => {
                      setSearchInput('');
                      applySearch('');
                    }}
                    aria-label={isRu ? 'Очистить' : 'Clear'}
                  >
                    <FiX />
                  </button>
                ) : null}

                {showSuggest && searchInput.trim().length >= 2 ? (
                  <div className="catalog-suggest">
                    {isSuggestLoading ? <div className="catalog-suggest__item">{isRu ? 'Поиск…' : 'Searching…'}</div> : null}

                    {!isSuggestLoading && brandSuggestions.length + productSuggestions.length === 0 ? (
                      <div className="catalog-suggest__item">{isRu ? 'Ничего не найдено' : 'Nothing found'}</div>
                    ) : null}

                    {!isSuggestLoading && brandSuggestions.length > 0 ? (
                      <div className="catalog-suggest__section">
                        <div className="catalog-suggest__label">{isRu ? 'Бренды' : 'Brands'}</div>
                        {brandSuggestions.map((brand) => (
                          <button key={brand} type="button" className="catalog-suggest__item catalog-suggest__btn" onClick={() => applyBrand(brand)}>
                            {brand}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {!isSuggestLoading && productSuggestions.length > 0 ? (
                      <div className="catalog-suggest__section">
                        <div className="catalog-suggest__label">{isRu ? 'Товары' : 'Products'}</div>
                        {productSuggestions.map((product) => (
                          <button key={product._id} type="button" className="catalog-suggest__item catalog-suggest__btn" onClick={() => applySearch(product.name || '')}>
                            {product.brand ? `${product.brand} ` : ''}{product.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="filters-group">
              <div className="filters-group__title">{isRu ? 'Категория' : 'Category'}</div>
              <div className="filters-list">
                <label className="chk">
                  <input type="checkbox" checked={categoryArr.length === 0} onChange={() => setParam('category', '')} />
                  <span>{t('products.allCategories')}</span>
                </label>
                {(categories ?? []).map((category) => {
                  const value = category.key || category.slug || category;
                  const title = isRu ? category.nameRu || category.name || category : category.nameEn || category.name || category;
                  return (
                    <label key={value} className="chk">
                      <input type="checkbox" checked={categoryArr.includes(value)} onChange={() => setParam('category', toggleInArray(categoryArr, value))} />
                      <span>{title}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="filters-group">
              <div className="filters-group__title">{isRu ? 'Цена' : 'Price'}</div>
              <div className="price-range">
                <div className="price-range__row">
                  <span>{isRu ? 'от' : 'from'}</span>
                  <input type="number" value={priceMin} min={minBound} max={priceMax} onChange={(event) => setPriceMin(Number(event.target.value || 0))} />
                  <span>{isRu ? 'до' : 'to'}</span>
                  <input type="number" value={priceMax} min={priceMin} max={maxBound} onChange={(event) => setPriceMax(Number(event.target.value || 0))} />
                </div>
                <input type="range" min={minBound} max={maxBound} value={priceMin} onChange={(event) => setPriceMin(Math.min(Number(event.target.value), priceMax))} />
                <input type="range" min={minBound} max={maxBound} value={priceMax} onChange={(event) => setPriceMax(Math.max(Number(event.target.value), priceMin))} />
              </div>
            </div>

            <div className="filters-group">
              <div className="filters-group__title">{isRu ? 'Бренд' : 'Brand'}</div>
              <input className="filters-search" placeholder={isRu ? 'Поиск бренда…' : 'Search brand…'} value={brandSearch} onChange={(event) => setBrandSearch(event.target.value)} />
              <div className="filters-list filters-list--scroll">
                {(brandsFiltered ?? []).map((brand) => (
                  <label key={brand} className="chk">
                    <input type="checkbox" checked={brandArr.includes(brand)} onChange={() => setParam('brand', toggleInArray(brandArr, brand))} />
                    <span>{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filters-group">
              <div className="filters-group__title">{isRu ? 'Наличие' : 'Availability'}</div>
              <div className="radio-row">
                {[
                  { key: 'all', label: t('products.all') },
                  { key: 'inStock', label: t('products.inStock') },
                  { key: 'preorder', label: isRu ? 'Под заказ' : 'Pre-order' },
                ].map((option) => (
                  <label key={option.key} className="rad">
                    <input
                      type="radio"
                      name="availability"
                      checked={effectiveAvailability === option.key}
                      onChange={() => {
                        if (option.key === 'all') {
                          setParam('inStock', '');
                          setParam('availability', '');
                        }
                        if (option.key === 'inStock') {
                          setParam('availability', '');
                          setParam('inStock', 'true');
                        }
                        if (option.key === 'preorder') {
                          setParam('inStock', '');
                          setParam('availability', 'preorder');
                        }
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filters-group">
              <label className="chk chk--big">
                <input type="checkbox" checked={newOnly} onChange={(event) => setParam('new', event.target.checked ? 'true' : '')} />
                <span>{isRu ? 'Новинки (30 дней)' : 'New arrivals (30 days)'}</span>
              </label>
            </div>

            <div className="filters-drawer__actions">
              <button type="button" className="btn btn-secondary" onClick={clearAllFilters}>
                <FiRefreshCcw /> {t('products.clear')}
              </button>
              <button type="button" className="btn btn-primary" onClick={closeDrawer}>
                {isRu ? 'Показать товары' : 'Show products'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
