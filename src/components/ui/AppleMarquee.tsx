import React, { useRef, useState, useEffect } from 'react';

interface AppleMarqueeProps {
  text: string;
  className?: string;
  title?: string;
}

export function AppleMarquee({ text, className = '', title }: AppleMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;
        const diff = textWidth - containerWidth;
        // If text exceeds container by more than 2px, enable marquee
        setOverflow(diff > 2 ? diff + 12 : 0);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(checkOverflow);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', checkOverflow);
      resizeObserver?.disconnect();
    };
  }, [text]);

  const isOverflowing = overflow > 0;
  // Dynamic duration: ~22px per second, clamped between 3.5s and 7.5s + 3s pause
  const duration = Math.max(3.5, Math.min(7.5, overflow / 22));

  return (
    <div
      ref={containerRef}
      title={title || text}
      className={`relative overflow-hidden whitespace-nowrap min-w-0 ${className}`}
      style={{
        maskImage: isOverflowing
          ? 'linear-gradient(to right, black 0%, black calc(100% - 18px), transparent 100%)'
          : 'none',
        WebkitMaskImage: isOverflowing
          ? 'linear-gradient(to right, black 0%, black calc(100% - 18px), transparent 100%)'
          : 'none',
      }}
    >
      <span
        ref={textRef}
        className="inline-block transition-transform will-change-transform"
        style={
          isOverflowing
            ? ({
                '--marquee-distance': `-${overflow}px`,
                animation: `apple-marquee-scroll ${duration + 3}s cubic-bezier(0.42, 0, 0.58, 1) infinite alternate`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {text}
      </span>
    </div>
  );
}

