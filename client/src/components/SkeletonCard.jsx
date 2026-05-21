import './SkeletonCard.css';

export default function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-card__img" />
      <div className="skeleton-card__body">
        <div className="skeleton-line" />
        <div className="skeleton-line skeleton-line--short" />
        <div className="skeleton-line" />
        <div className="skeleton-line skeleton-line--btn" />
      </div>
    </div>
  );
}
