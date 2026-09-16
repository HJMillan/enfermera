import type { PropsWithChildren } from 'react';
import { useReveal } from '../../hooks/useReveal';

interface RevealSectionProps {
  className?: string;
  delayMs?: number;
}

/**
 * Componente envoltorio para revelado suave con física Apple.
 * Utiliza --duration-slow (550ms) y --ease-standard, con desplazamiento máximo de 20px.
 */
export function RevealSection({
  children,
  className = '',
  delayMs = 0,
}: PropsWithChildren<RevealSectionProps>) {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible && delayMs > 0 ? `${delayMs}ms` : '0ms' }}
      className={`transition-[opacity,transform] duration-[var(--duration-slow)] ease-[var(--ease-standard)] ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      } ${className}`}
    >
      {children}
    </div>
  );
}
