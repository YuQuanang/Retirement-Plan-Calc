import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InfoTooltipProps {
  content: string;
  title?: string;
  className?: string;
}

export function InfoTooltip({ content, title, className = '' }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeLeft: boolean }>({
    top: 0,
    left: 0,
    placeLeft: false,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = 270;
    const padding = 12;

    // Check if there is enough space on the right (prefer right side popup)
    const spaceOnRight = window.innerWidth - rect.right;
    const placeLeft = spaceOnRight < tooltipWidth + padding + 10;

    // Horizontal placement: slightly to the side
    const left = placeLeft
      ? Math.max(padding, rect.left - tooltipWidth - 10)
      : Math.min(window.innerWidth - tooltipWidth - padding, rect.right + 10);

    // Vertical placement: align near the trigger center, clamped to viewport
    const desiredTop = rect.top + rect.height / 2 - 28;
    const top = Math.max(padding, Math.min(window.innerHeight - 200, desiredTop));

    setCoords({ top, left, placeLeft });
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // Grace period so user can smoothly move mouse from trigger onto the card
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleCardMouseEnter = () => {
    // Keep open while hovering the tooltip content
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleCardMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Keep position accurate during scroll or resize
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <div
        className={`inline-flex items-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          ref={buttonRef}
          type="button"
          className="p-0.5 text-zinc-400 hover:text-apple-blue dark:text-zinc-500 dark:hover:text-blue-400 rounded-full transition-colors focus:outline-none cursor-help"
          aria-label={title || 'More information'}
        >
          <Info size={13} strokeWidth={2} />
        </button>
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                style={{
                  position: 'fixed',
                  top: coords.top,
                  left: coords.left,
                  width: 270,
                  zIndex: 99999,
                }}
                initial={{
                  opacity: 0,
                  scale: 0.94,
                  x: coords.placeLeft ? 6 : -6,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.94,
                  x: coords.placeLeft ? 4 : -4,
                }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={handleCardMouseEnter}
                onMouseLeave={handleCardMouseLeave}
                className="p-3.5 rounded-2xl bg-zinc-900/95 dark:bg-zinc-850/95 backdrop-blur-2xl text-zinc-100 border border-white/[0.12] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.4)] pointer-events-auto text-left"
              >
                {title && (
                  <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-apple-blue flex-shrink-0" />
                    <p className="text-[11px] font-semibold tracking-wide text-zinc-100">
                      {title}
                    </p>
                  </div>
                )}
                <p className="text-[11px] leading-relaxed text-zinc-300 font-normal">
                  {content}
                </p>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
