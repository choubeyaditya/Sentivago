'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import PlaceCard from '@/components/PlaceCard';
import { buildPlaceHref } from '@/lib/place';

function getCardsPerView(width = 0) {
  if (width < 760) return 1;
  if (width < 1140) return 2;
  return 3;
}

function buildPages(items = [], cardsPerView = 3) {
  const pages = [];

  for (let index = 0; index < items.length; index += cardsPerView) {
    const page = items.slice(index, index + cardsPerView);

    while (page.length < cardsPerView) {
      page.push(null);
    }

    pages.push(page);
  }

  return pages;
}

function getVisiblePages(totalPages, currentPage, maxVisible = 6) {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const halfWindow = Math.floor(maxVisible / 2);
  let start = Math.max(0, currentPage - halfWindow);
  let end = start + maxVisible;

  if (end > totalPages) {
    end = totalPages;
    start = end - maxVisible;
  }

  return Array.from({ length: end - start }, (_, index) => start + index);
}

export default function ResultSlider({ section }) {
  const [cardsPerView, setCardsPerView] = useState(3);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const timersRef = useRef([]);

  useEffect(() => {
    function updateCardsPerView() {
      setCardsPerView(getCardsPerView(window.innerWidth));
    }

    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);

    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);

  useEffect(() => {
    setCurrentPage(0);
    setIsLoadingMore(false);
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, [section.key, section.items.length, cardsPerView]);

  const pages = buildPages(section.items, cardsPerView);
  const totalPages = pages.length;
  const visiblePages = getVisiblePages(totalPages, currentPage);

  function handlePageChange(nextPage) {
    if (nextPage === currentPage || nextPage < 0 || nextPage >= totalPages || isLoadingMore) {
      return;
    }

    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];

    setIsLoadingMore(true);

    timersRef.current.push(
      window.setTimeout(() => {
        setCurrentPage(nextPage);
      }, 180)
    );

    timersRef.current.push(
      window.setTimeout(() => {
        setIsLoadingMore(false);
      }, 520)
    );
  }

  if (!section.items.length) {
    return <div className="empty-panel">No {section.label.toLowerCase()} trips matched this search.</div>;
  }

  return (
    <div className={`result-slider${isLoadingMore ? ' is-loading' : ''}`}>
      <div className="result-slider-viewport">
        <div
          className="result-slider-track"
          style={{ transform: `translateX(-${currentPage * 100}%)` }}
        >
          {pages.map((page, pageIndex) => (
            <div
              className="result-slider-page"
              style={{ '--cards-per-view': cardsPerView }}
              key={`${section.key}-${pageIndex}`}
            >
              {page.map((destination, itemIndex) =>
                destination ? (
                  <Link
                    key={destination.placeId || destination.slug}
                    href={buildPlaceHref(destination.slug, destination)}
                    className="card-link slider-card-link"
                  >
                    <PlaceCard destination={destination} />
                  </Link>
                ) : (
                  <div className="slider-card-placeholder" aria-hidden="true" key={`empty-${itemIndex}`} />
                )
              )}
            </div>
          ))}
        </div>

        <div className="result-slider-loading" aria-hidden={!isLoadingMore}>
          <div className="loading-more-chip">
            <span>Loading more</span>
            <span className="loading-more-dots">
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="result-slider-controls">
          <div className="result-slider-buttons">
            <button
              type="button"
              className="slider-button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0 || isLoadingMore}
            >
              Previous
            </button>
            <button
              type="button"
              className="slider-button slider-button-primary"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages - 1 || isLoadingMore}
            >
              Next
            </button>
          </div>

          <div className="result-slider-pagination">
            <span className="slider-page-count">
              Page {currentPage + 1} / {totalPages}
            </span>

            {visiblePages.map((index) => (
              <button
                type="button"
                className={`slider-dot${index === currentPage ? ' active' : ''}`}
                onClick={() => handlePageChange(index)}
                aria-label={`Go to slide ${index + 1}`}
                key={`${section.key}-dot-${index}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
