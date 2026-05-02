import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;          // ms
  variant?: "up" | "fade" | "scale";
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  threshold?: number;
  once?: boolean;
  style?: CSSProperties;
};

/**
 * Cinematic on-scroll reveal. Adds .reveal + .is-visible classes
 * once the element enters the viewport.
 */
export function Reveal({
  children,
  delay = 0,
  variant = "up",
  className = "",
  as = "div",
  threshold = 0.15,
  once = true,
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) io.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);

  const variantClass =
    variant === "fade" ? "reveal reveal-fade" : variant === "scale" ? "reveal reveal-scale" : "reveal";

  const Tag = as as any;
  return (
    <Tag
      ref={ref as any}
      className={`${variantClass} ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}

/** Splits text into per-letter spans with cinematic letter-rise animation. */
export function LetterReveal({
  text,
  className = "",
  delayStart = 0,
  perLetter = 35,
}: {
  text: string;
  className?: string;
  delayStart?: number;
  perLetter?: number;
}) {
  return (
    <span className={className} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          className="cine-letter"
          style={{ animationDelay: `${delayStart + i * perLetter}ms` }}
          aria-hidden
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}
