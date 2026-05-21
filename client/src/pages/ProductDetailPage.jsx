import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { FiShoppingCart, FiArrowLeft, FiHeart } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { productService } from '../services/productService.js';
import { reviewService } from '../services/reviewService.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatPrice } from '../utils/formatPrice.js';
import QuantityStepper from '../components/QuantityStepper.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { readWishlist, subscribeWishlist, toggleWishlist } from '../utils/wishlist.js';
import './ProductDetailPage.css';

const RECENT_KEY = 'jola_recently_viewed_v1';

const getVideoEmbedUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/youtube\.com\/watch\?v=/.test(raw)) {
    try {
      const url = new URL(raw);
      const id = url.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : raw;
    } catch {
      return raw;
    }
  }
  if (/youtu\.be\
    const id = raw.split('youtu.be/')[1]?.split(/[?&]/)[0];
    return id ? `https://www.youtube.com/embed/${id}` : raw;
  }
  return raw;
};

const isDirectVideo = (value) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(String(value || '').trim());

function pushRecentlyViewed(id) {
  try {
    const prev = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const arr = Array.isArray(prev) ? prev : [];
    const next = [String(id), ...arr.filter((x) => String(x) !== String(id))].slice(0, 30);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    
  }
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { addItem } = useCart();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery(
    ['product', id],
    () => productService.getProductById(id),
    { enabled: Boolean(id), staleTime: 1000 * 60 }
  );

  const product = data;

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery(
    ['reviewsByProduct', id],
    () => reviewService.getByProduct(id, { limit: 20, page: 1 }),
    { enabled: Boolean(id), staleTime: 1000 * 30 }
  );

  const { data: canReviewData, isLoading: canReviewLoading } = useQuery(
    ['canReview', id, user?._id],
    () => reviewService.canReview(id),
    { enabled: Boolean(id) && Boolean(user), staleTime: 1000 * 15 }
  );

  const { data: relatedData } = useQuery(
    ['relatedProducts', product?._id, product?.category],
    () => productService.getProducts({
      category: product?.category ? [product.category] : [],
      limit: 10,
      sort: 'popular',
    }),
    {
      enabled: Boolean(product?._id) && Boolean(product?.category),
      staleTime: 1000 * 60,
    }
  );

  const { data: fallbackRelatedData } = useQuery(
    ['relatedProductsFallback', product?._id],
    () => productService.getProducts({ limit: 10, sort: 'popular' }),
    {
      enabled: Boolean(product?._id),
      staleTime: 1000 * 60,
    }
  );


  const [reviewRating, setReviewRating] = useState(5);
  const [reviewCity, setReviewCity] = useState('');
  const [reviewText, setReviewText] = useState('');

  const submitReviewMutation = useMutation(
    (payload) => reviewService.createReview(payload),
    {
      onSuccess: () => {
        toast.success('Отзыв опубликован');
        setReviewText('');
        setReviewCity('');
        setReviewRating(5);
        qc.invalidateQueries(['reviewsByProduct', id]);
        qc.invalidateQueries(['product', id]);
        qc.invalidateQueries(['canReview', id, user?._id]);
      },
      onError: (e) => toast.error(e?.message || 'Не удалось отправить отзыв'),
    }
  );

  
  useEffect(() => {
    if (!product?._id) return;
    pushRecentlyViewed(product._id);
  }, [product?._id]);

  const galleryItems = useMemo(() => {
    const pictureItems = (Array.isArray(product?.images) && product.images.length
      ? product.images
      : ['/placeholder-product.svg']).map((src, index) => ({ type: 'image', src, key: `image-${index}` }));

    const videoUrl = String(product?.videoUrl || '').trim();
    if (videoUrl) pictureItems.push({ type: 'video', src: videoUrl, key: 'video-main' });
    return pictureItems;
  }, [product?.images, product?.videoUrl]);

  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    setActiveImg(0);
  }, [product?._id]);

  const activeMedia = galleryItems[activeImg] || galleryItems[0];
  const img = activeMedia?.type === 'image' ? activeMedia.src : (galleryItems.find((item) => item.type === 'image')?.src || '/placeholder-product.svg');
  const videoEmbedUrl = activeMedia?.type === 'video' ? getVideoEmbedUrl(activeMedia.src) : '';
  const discountedPrice = useMemo(() => {
    if (!product) return 0;
    return product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price;
  }, [product]);

  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(() => readWishlist().includes(id));

  useEffect(() => {
    setQty(1);
  }, [product?._id]);

  useEffect(() => subscribeWishlist((ids) => setWished(ids.includes(id))), [id]);

  const toggleFavorite = () => {
    if (!product?._id) return;
    const next = toggleWishlist(product._id);
    setWished(next.includes(product._id));
  };

  const addToCart = () => {
    if (!product) return;
    addItem({
      product: product._id,
      name: product.name,
      price: discountedPrice,
      image: img,
      quantity: qty,
      stock: product.stock,
    });
  };

  const relatedProducts = useMemo(() => {
    const primary = (relatedData?.products || []).filter((item) => String(item?._id) !== String(product?._id));
    if (primary.length > 0) return primary.slice(0, 8);
    return (fallbackRelatedData?.products || [])
      .filter((item) => String(item?._id) !== String(product?._id))
      .slice(0, 8);
  }, [fallbackRelatedData?.products, relatedData?.products, product?._id]);

  const alsoBuyProducts = useMemo(() => (fallbackRelatedData?.products || [])
    .filter((item) => String(item?._id) !== String(product?._id) && !relatedProducts.some((r) => String(r?._id) === String(item?._id)))
    .slice(0, 4), [fallbackRelatedData?.products, product?._id, relatedProducts]);

  const onSubmitReview = async (e) => {
    e.preventDefault();
    if (!id) return;
    await submitReviewMutation.mutateAsync({
      productId: id,
      rating: Number(reviewRating),
      text: reviewText,
      city: reviewCity,
    });
  };

  if (isLoading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (isError) {
    return <div className="error">Ошибка: {error?.message || 'Не удалось загрузить товар'}</div>;
  }

  if (!product) {
    return <div className="error">Товар не найден</div>;
  }

  return (
    <div className="product-detail-page">
      <div className="container">
        <Link to="/products" className="btn-back">
          <FiArrowLeft /> Назад к каталогу
        </Link>

        <div className="product-detail">
          <div className="product-images">
            <div className="main-image">
              {activeMedia?.type === 'video' ? (
                isDirectVideo(activeMedia.src) ? (
                  <video src={activeMedia.src} controls playsInline className="product-video-player" />
                ) : (
                  <iframe
                    src={videoEmbedUrl}
                    title={`${product.name} video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="product-video-frame"
                  />
                )
              ) : (
                <img src={img} alt={product.name} />
              )}
            </div>

            {galleryItems.length > 1 && (
              <div className="thumbnail-images" aria-label="Галерея товара">
                {galleryItems.slice(0, 10).map((item, idx) => (
                  <button
                    key={item.key}
                    type="button"
                    className={idx === activeImg ? 'product-thumb active' : 'product-thumb'}
                    onClick={() => setActiveImg(idx)}
                  >
                    {item.type === 'video' ? (
                      <span className="product-thumb__video">▶ Видео</span>
                    ) : (
                      <img src={item.src} alt={`${product.name} ${idx + 1}`} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            <div>
              <h1 className="product-title">
                <span className="product-brand">{product.brand}</span> {product.name}
              </h1>
              <div className="rating" aria-label="Рейтинг товара">
                <div className="stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < Math.floor(product.rating) ? 'star filled' : 'star'}>
                      ★
                    </span>
                  ))}
                </div>
                <span className="reviews-count">({product.numReviews} отзывов)</span>
              </div>
            </div>

            <div className="price-section">
              {product.discount > 0 ? (
                <>
                  <span className="current-price">{formatPrice(discountedPrice)}</span>
                  <span className="old-price">{formatPrice(product.price)}</span>
                  <span className="discount-badge">-{product.discount}%</span>
                </>
              ) : (
                <span className="current-price">{formatPrice(product.price)}</span>
              )}
            </div>

            <div className={`stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
              {product.stock > 0 ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
            </div>

            <div>
              <h3>Описание</h3>
              <p className="product-description">{product.description}</p>
            </div>

            <div className="quantity-section">
              <span style={{ fontWeight: 700 }}>Количество:</span>
              <QuantityStepper
                value={qty}
                min={1}
                max={Math.max(1, Number(product.stock || 0))}
                disabled={product.stock === 0}
                onChange={setQty}
              />
            </div>

            <div className="product-buy-actions">
              <button
                type="button"
                className={wished ? 'btn btn-secondary detail-fav-btn is-active' : 'btn btn-secondary detail-fav-btn'}
                onClick={toggleFavorite}
              >
                <FiHeart />
                {wished ? 'В избранном' : 'В избранное'}
              </button>
              <button
                className="btn btn-primary add-to-cart-btn"
                onClick={addToCart}
                disabled={product.stock === 0}
              >
                <FiShoppingCart />
                {product.stock > 0 ? 'Добавить в корзину' : 'Нет в наличии'}
              </button>
            </div>

            <div className="product-detail__meta">
              <div className="meta-item">
                <span className="label">Категория:</span>
                <span className="value">{product.category}</span>
              </div>
              <div className="meta-item">
                <span className="label">Бренд:</span>
                <span className="value">{product.brand}</span>
              </div>
            </div>
          </div>
        </div>

        { }
        <section className="product-reviews">
          <div className="product-reviews__head">
            <h2>Отзывы</h2>
            <div className="product-reviews__meta">
              {product.numReviews ? `${product.numReviews} шт.` : 'Пока нет отзывов'}
            </div>
          </div>

          {reviewsLoading ? (
            <div className="reviews-loading">Загрузка отзывов…</div>
          ) : (
            <div className="reviews-list">
              {(reviewsData?.items || []).length === 0 ? (
                <div className="reviews-empty">Отзывов ещё нет. Стань первым покупателем и оставь отзыв.</div>
              ) : (
                (reviewsData?.items || []).map((r) => (
                  <article key={r._id} className="review-item">
                    <div className="review-item__head">
                      <div className="review-item__who">
                        <div className="review-item__name">{r.name}</div>
                        {r.city ? <div className="review-item__city">{r.city}</div> : null}
                      </div>
                      <div className="review-item__rating" aria-label={`Рейтинг ${r.rating} из 5`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={i < Math.floor(r.rating) ? 'star filled' : 'star'}>★</span>
                        ))}
                      </div>
                    </div>
                    <div className="review-item__text">{r.text}</div>
                    {r.createdAt ? (
                      <div className="review-item__date">
                        {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          )}

          <div className="review-form-wrap">
            {!user ? (
              <div className="review-hint">
                Чтобы оставить отзыв, нужно <Link to="/login">войти</Link> и купить этот товар.
              </div>
            ) : canReviewLoading ? (
              <div className="review-hint">Проверяем покупку…</div>
            ) : canReviewData?.canReview ? (
              <form className="review-form" onSubmit={onSubmitReview}>
                <div className="review-form__row">
                  <label>
                    Оценка
                    <select value={reviewRating} onChange={(e) => setReviewRating(e.target.value)}>
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Город (необязательно)
                    <input value={reviewCity} onChange={(e) => setReviewCity(e.target.value)} placeholder="Напр. Астана" />
                  </label>
                </div>

                <label>
                  Отзыв
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Расскажи, как прошла покупка…"
                    minLength={5}
                    maxLength={1200}
                    required
                  />
                </label>

                <button className="btn btn-primary" type="submit" disabled={submitReviewMutation.isLoading}>
                  {submitReviewMutation.isLoading ? 'Отправляем…' : 'Оставить отзыв'}
                </button>
              </form>
            ) : (
              <div className="review-hint">
                {canReviewData?.reason === 'already_reviewed'
                  ? 'Вы уже оставляли отзыв на этот товар.'
                  : 'Оставлять отзывы могут только покупатели этого товара.'}
              </div>
            )}
          </div>
        </section>

        <section className="related-products">
          <div className="related-products__head">
            <div>
              <h2>Похожие товары</h2>
              <p>Смотри ещё варианты из этой категории и то, что часто берут рядом.</p>
            </div>
          </div>

          {relatedProducts.length > 0 ? (
            <div className="related-products__grid">
              {relatedProducts.map((item) => (
                <ProductCard key={item._id} product={item} />
              ))}
            </div>
          ) : (
            <div className="related-products__empty">Скоро тут появятся похожие товары.</div>
          )}
        </section>

        <section className="related-products related-products--also-buy">
          <div className="related-products__head">
            <div>
              <h2>С этим ещё покупают</h2>
              <p>Подобрали популярные товары, которые часто смотрят рядом.</p>
            </div>
          </div>

          {alsoBuyProducts.length > 0 ? (
            <div className="related-products__grid">
              {alsoBuyProducts.map((item) => (
                <ProductCard key={item._id} product={item} />
              ))}
            </div>
          ) : (
            <div className="related-products__empty">Подборка появится после загрузки каталога.</div>
          )}
        </section>

        <div className="product-mobile-stickybar">
          <div className="product-mobile-stickybar__price">
            <strong>{formatPrice(discountedPrice)}</strong>
            {product.discount > 0 ? <span>{formatPrice(product.price)}</span> : null}
          </div>
          <button type="button" className={wished ? 'product-mobile-stickybar__fav is-active' : 'product-mobile-stickybar__fav'} onClick={toggleFavorite} aria-label="Избранное">
            <FiHeart />
          </button>
          <button type="button" className="product-mobile-stickybar__buy" onClick={addToCart} disabled={product.stock === 0}>
            <FiShoppingCart />
            <span>{product.stock > 0 ? 'Купить' : 'Нет в наличии'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
