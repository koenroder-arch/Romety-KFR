import React from 'react';

/**
 * Instagram / iOS-style Radial Spoke Activity Indicator
 * Clean, bare spinner with no background box or card
 */
export function InstagramSpinner({
  size = 30,
  isRefreshing = false,
  pullDistance = 0,
  color = '#FF4B72',
}) {
  const spokes = 8;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={isRefreshing ? 'animate-spin' : ''}
      style={{
        display: 'block',
        transform: isRefreshing ? undefined : `rotate(${pullDistance * 6.5}deg)`,
        transition: isRefreshing ? undefined : 'transform 0.05s ease-out',
        animationDuration: '0.8s',
      }}
    >
      {Array.from({ length: spokes }).map((_, i) => {
        const angle = (i * 360) / spokes;
        // iOS style spoke opacity gradient
        const opacity = 0.22 + (0.78 * (i + 1)) / spokes;
        return (
          <line
            key={i}
            x1="12"
            y1="3.2"
            x2="12"
            y2="7.2"
            stroke={color}
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity={isRefreshing ? opacity : Math.min(1, 0.35 + (i / spokes) * 0.65)}
            transform={`rotate(${angle} 12 12)`}
          />
        );
      })}
    </svg>
  );
}

/**
 * Expanding Pull-to-Refresh area (Instagram style)
 * Stretches the page down smoothly when pulling, revealing the spinner in the gap
 */
export function PullToRefreshContainer({
  pullDistance = 0,
  isRefreshing = false,
  isPulling = false,
  color = '#FF4B72',
  className = '',
}) {
  const isVisible = pullDistance > 0 || isRefreshing;
  const height = isRefreshing ? 52 : pullDistance;

  return (
    <div
      className={`w-full flex items-center justify-center overflow-hidden pointer-events-none ${className}`}
      style={{
        height: isVisible ? `${height}px` : '0px',
        transition: isPulling ? 'none' : 'height 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'height',
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          opacity: isRefreshing ? 1 : Math.min(1, Math.max(0, (pullDistance - 6) / 20)),
          transform: `scale(${isRefreshing ? 1 : Math.min(1, 0.45 + (pullDistance / 48) * 0.55)})`,
          transition: isPulling ? 'none' : 'transform 0.22s ease-out, opacity 0.2s ease-out',
        }}
      >
        <InstagramSpinner
          size={30}
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
          color={color}
        />
      </div>
    </div>
  );
}

export { PullToRefreshContainer as PullToRefreshSpinner };
export default PullToRefreshContainer;
