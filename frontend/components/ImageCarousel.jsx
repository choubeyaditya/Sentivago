'use client';

import { useEffect, useState } from 'react';

export default function ImageCarousel({ images = [], title }) {
  const validImages = images.filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(0);
  const emblem = String(title || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  useEffect(() => {
    setCurrentIndex(0);
  }, [title, validImages.length]);

  useEffect(() => {
    if (validImages.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index === validImages.length - 1 ? 0 : index + 1));
    }, 4500);

    return () => window.clearInterval(timer);
  }, [validImages.length]);

  if (!validImages.length) {
    return (
      <section className="carousel-shell">
        <div className="carousel-stage">
          <div className="media-fallback carousel-fallback">No gallery images yet</div>
          <div className="carousel-overlay">
            <div className="carousel-emblem">
              <span className="carousel-emblem-letter">{emblem}</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const currentImage = validImages[currentIndex];

  return (
    <section className="carousel-shell">
      <div className="carousel-stage">
        <img src={currentImage} alt={title || 'Destination image'} className="carousel-image" />

        <div className="carousel-overlay">
          <div className="carousel-emblem">
            <span className="carousel-emblem-letter">{emblem}</span>
          </div>
        </div>
      </div>

      {validImages.length > 1 ? (
        <div className="carousel-dots">
          {validImages.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`carousel-dot${index === currentIndex ? ' active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Show image ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
