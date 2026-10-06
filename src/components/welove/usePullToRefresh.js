import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for smooth Instagram / iOS style Pull-to-Refresh
 * Never interferes with normal page scrolling (no sudden stopping/freezing)
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 55,
  maxPull = 80,
  disabled = false,
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const containerRef = useRef(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const canPullRef = useRef(false);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const disabledRef = useRef(disabled);

  isRefreshingRef.current = isRefreshing;
  disabledRef.current = disabled;

  const getScrollTop = useCallback(() => {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (disabledRef.current || isRefreshingRef.current) return;
    if (e.touches.length !== 1) return;

    const scrollTop = getScrollTop();
    if (scrollTop <= 1) {
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      canPullRef.current = true;
    } else {
      canPullRef.current = false;
    }
    isPullingRef.current = false;
  }, [getScrollTop]);

  const rafIdRef = useRef(null);
  const pendingDistanceRef = useRef(0);

  const setSmoothPullDistance = useCallback((dist) => {
    pendingDistanceRef.current = dist;
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        setPullDistance(pendingDistanceRef.current);
        rafIdRef.current = null;
      });
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!canPullRef.current || isRefreshingRef.current || disabledRef.current) return;
    if (e.touches.length !== 1) return;

    const scrollTop = getScrollTop();
    if (scrollTop > 1) {
      canPullRef.current = false;
      if (isPullingRef.current) {
        isPullingRef.current = false;
        setIsPulling(false);
        setPullDistance(0);
      }
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const diffY = currentY - startYRef.current;
    const diffX = currentX - startXRef.current;

    // If user is swiping up (scrolling down into page), abort pull immediately
    if (diffY <= 0) {
      canPullRef.current = false;
      if (isPullingRef.current) {
        isPullingRef.current = false;
        setIsPulling(false);
        setPullDistance(0);
      }
      return;
    }

    // If user is swiping horizontally more than vertically, abort
    if (Math.abs(diffX) > Math.abs(diffY)) {
      canPullRef.current = false;
      return;
    }

    // Active downward pull at top of page - immediately prevent iOS rubberband bounce
    if (diffY > 0) {
      if (e.cancelable) {
        e.preventDefault();
      }
      if (diffY > 4) {
        if (!isPullingRef.current) {
          isPullingRef.current = true;
          setIsPulling(true);
        }
        const distance = Math.min(maxPull, (diffY - 4) * 0.42);
        setSmoothPullDistance(distance);
      }
    }
  }, [maxPull, getScrollTop, setSmoothPullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    canPullRef.current = false;
    if (!isPullingRef.current) return;

    isPullingRef.current = false;
    setIsPulling(false);

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(20); } catch (e) {}
      }
      try {
        await onRefresh?.();
      } catch (err) {
        console.error('[PullToRefresh] Error refreshing:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 320);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  // Non-passive event listener on container element for smooth cancellable pull
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => handleTouchStart(e);
    const onTouchMove = (e) => handleTouchMove(e);
    const onTouchEnd = () => handleTouchEnd();

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Desktop Mouse Support for testing on desktop
  const handleMouseDown = useCallback((e) => {
    if (disabledRef.current || isRefreshingRef.current || e.button !== 0) return;
    if (getScrollTop() <= 1) {
      startYRef.current = e.clientY;
      canPullRef.current = true;
    }
  }, [getScrollTop]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!canPullRef.current || isRefreshingRef.current || disabledRef.current) return;
      if (getScrollTop() > 1) {
        canPullRef.current = false;
        if (isPullingRef.current) {
          isPullingRef.current = false;
          setIsPulling(false);
          setPullDistance(0);
        }
        return;
      }
      const diffY = e.clientY - startYRef.current;
      if (diffY > 8) {
        if (!isPullingRef.current) {
          isPullingRef.current = true;
          setIsPulling(true);
        }
        const distance = Math.min(maxPull, (diffY - 8) * 0.42);
        setPullDistance(distance);
      } else if (diffY <= 0) {
        canPullRef.current = false;
        if (isPullingRef.current) {
          isPullingRef.current = false;
          setIsPulling(false);
          setPullDistance(0);
        }
      }
    };

    const handleMouseUp = async () => {
      canPullRef.current = false;
      if (!isPullingRef.current) return;
      isPullingRef.current = false;
      setIsPulling(false);
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        setPullDistance(threshold);
        try {
          await onRefresh?.();
        } catch (err) {
          console.error('[PullToRefresh] Error refreshing:', err);
        } finally {
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 320);
        }
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [maxPull, pullDistance, threshold, onRefresh, getScrollTop]);

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    containerRef,
    containerProps: {
      ref: containerRef,
      onMouseDown: handleMouseDown,
    },
  };
}
