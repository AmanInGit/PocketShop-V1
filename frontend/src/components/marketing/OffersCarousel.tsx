/**
 * Horizontal offers marquee (auto-scroll, drag, reduced motion) — shared by landing and customer home.
 */

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { storefrontPath } from '@/constants/routes';
import type { BestOfferResult } from '@/hooks/useBestOffer';

const OFFERS_SCROLL_MS_PER_LOOP = 100_000;
const OFFERS_USER_PAUSE_MS = 2_500;

export type OffersCarouselProps = {
  landingOffers: BestOfferResult[];
  /** Negative margin wrapper; landing uses wider bleed */
  variant?: 'landing' | 'customer';
};

export function OffersCarousel({ landingOffers, variant = 'landing' }: OffersCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(false);
  const userPausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0 });
  const suppressClickRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotionRef.current = mq.matches;
    const onChange = () => {
      prefersReducedMotionRef.current = mq.matches;
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const clearResumeTimer = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  const bumpUserPause = () => {
    userPausedRef.current = true;
    clearResumeTimer();
    resumeTimerRef.current = setTimeout(() => {
      userPausedRef.current = false;
      resumeTimerRef.current = null;
    }, OFFERS_USER_PAUSE_MS);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    let raf = 0;
    let last = performance.now();

    const markAutoScrollEnd = () => {
      requestAnimationFrame(() => {
        isAutoScrollRef.current = false;
      });
    };

    const wrapIfPastHalf = () => {
      const half = el.scrollWidth / 2;
      if (half < 1) return;
      if (el.scrollLeft < half - 0.5) return;
      isAutoScrollRef.current = true;
      while (el.scrollLeft >= half - 0.5) {
        el.scrollLeft -= half;
      }
      markAutoScrollEnd();
    };

    const onScroll = () => {
      const userDriven = !isAutoScrollRef.current;
      if (userDriven) bumpUserPause();
      wrapIfPastHalf();
    };

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;

      wrapIfPastHalf();

      if (
        !prefersReducedMotionRef.current &&
        !userPausedRef.current &&
        !dragRef.current.active
      ) {
        const half = el.scrollWidth / 2;
        if (half > 1) {
          const speed = half / OFFERS_SCROLL_MS_PER_LOOP;
          isAutoScrollRef.current = true;
          el.scrollLeft += speed * dt;
          while (el.scrollLeft >= half - 0.5) {
            el.scrollLeft -= half;
          }
          markAutoScrollEnd();
        }
      }

      raf = requestAnimationFrame(tick);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
      clearResumeTimer();
    };
  }, [landingOffers.length]);

  const onWheel = () => {
    bumpUserPause();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    bumpUserPause();
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 6) {
      suppressClickRef.current = true;
    }
    el.scrollLeft = dragRef.current.startScroll - dx;
  };

  const endPointerDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    dragRef.current.active = false;
    if (suppressClickRef.current) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  };

  if (landingOffers.length === 0) return null;

  const wrapClass =
    variant === 'landing' ? 'relative -mx-4 sm:-mx-6 lg:-mx-8' : 'relative -mx-4 sm:-mx-6';
  const padClass = variant === 'landing' ? 'pl-4 pr-4 sm:pl-6 sm:pr-6' : 'pl-4 pr-4 sm:px-0';
  const thumbScroll =
    variant === 'landing'
      ? '[&::-webkit-scrollbar-thumb]:bg-purple-200/60 dark:[&::-webkit-scrollbar-thumb]:bg-purple-400/40'
      : '[&::-webkit-scrollbar-thumb]:bg-orange-200/70 dark:[&::-webkit-scrollbar-thumb]:bg-orange-400/35';

  return (
    <div className={wrapClass}>
      <div
        ref={scrollerRef}
        role="region"
        aria-label="Featured offers"
        className={`overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x cursor-grab active:cursor-grabbing pb-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full ${thumbScroll}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        onClickCapture={(e) => {
          if (suppressClickRef.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div className={`flex w-max gap-3 sm:gap-4 py-1 ${padClass}`}>
          {[...landingOffers, ...landingOffers].map((offerCard, index) => {
            const isLoopClone = index >= landingOffers.length;
            const cardShell =
              variant === 'landing'
                ? 'rounded-3xl border border-purple-100 bg-gradient-to-br from-white to-purple-50 p-4 sm:p-6 md:p-7 shadow-md'
                : 'rounded-2xl border border-orange-100 dark:border-orange-900/40 bg-gradient-to-br from-white to-orange-50/90 dark:from-slate-900 dark:to-orange-950/20 p-4 shadow-md';
            const cardWidth =
              variant === 'landing'
                ? 'shrink-0 w-[min(100vw-3rem,380px)] sm:w-[360px] md:w-[380px]'
                : 'shrink-0 w-[min(100vw-2.5rem,320px)] sm:w-[300px]';
            const logoFallback =
              variant === 'landing'
                ? 'h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white flex items-center justify-center font-semibold pointer-events-none'
                : 'h-11 w-11 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center text-sm font-semibold pointer-events-none';
            const logoSize = variant === 'landing' ? 'h-12 w-12' : 'h-11 w-11';
            const titleSize = variant === 'landing' ? 'text-2xl' : 'text-xl';
            const btnClass =
              variant === 'landing'
                ? 'mt-4 inline-flex rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700'
                : 'mt-3 inline-flex rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600';

            return (
              <div
                key={`${offerCard.vendorId}-${offerCard.offer.id}-${index}`}
                className={cardWidth}
                aria-hidden={isLoopClone || undefined}
              >
                <div className={`h-full ${cardShell}`}>
                  <div className={`${variant === 'landing' ? 'mb-3' : 'mb-2'} flex items-center gap-3`}>
                    {offerCard.vendorLogoUrl ? (
                      <img
                        src={offerCard.vendorLogoUrl}
                        alt={isLoopClone ? '' : offerCard.vendorName}
                        className={`${logoSize} rounded-lg object-cover pointer-events-none`}
                      />
                    ) : (
                      <div className={`${logoSize} ${logoFallback}`}>
                        {offerCard.vendorName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                        {offerCard.vendorName}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`${titleSize} font-extrabold text-gray-900 dark:text-slate-50 leading-tight`}
                  >
                    {offerCard.offer.type === 'flat'
                      ? `Flat ₹${offerCard.offer.value} off`
                      : `${offerCard.offer.value}% off${offerCard.offer.max_discount ? ` up to ₹${offerCard.offer.max_discount}` : ''}`}
                  </p>
                  <p
                    className={`${variant === 'landing' ? 'mt-2' : 'mt-1.5'} text-xs text-gray-600 dark:text-slate-400`}
                  >
                    Min order ₹{offerCard.offer.min_order.toLocaleString('en-IN')}
                    {offerCard.offer.promo_code ? (
                      <span className="ml-1 font-medium">· {offerCard.offer.promo_code}</span>
                    ) : null}
                  </p>
                  <Link
                    to={storefrontPath(
                      offerCard.vendorId,
                      offerCard.offer.promo_code ? { promo: offerCard.offer.promo_code } : undefined
                    )}
                    tabIndex={isLoopClone ? -1 : undefined}
                    className={btnClass}
                  >
                    View Offer
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
