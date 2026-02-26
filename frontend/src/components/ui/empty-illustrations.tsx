"use client";

/** Theme-aware SVG illustrations for empty states */

export function EmptyBook() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="20" width="70" height="85" rx="6" stroke="var(--color-primary)" strokeWidth="2" opacity="0.3" />
      <rect x="30" y="25" width="60" height="75" rx="4" stroke="var(--color-accent)" strokeWidth="1.5" opacity="0.2" />
      <path d="M60 40 L60 75" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" />
      <path d="M40 50 C40 40, 60 35, 60 45" stroke="var(--color-primary)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M80 50 C80 40, 60 35, 60 45" stroke="var(--color-accent)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
      <line x1="38" y1="60" x2="55" y2="60" stroke="var(--color-primary)" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
      <line x1="38" y1="66" x2="50" y2="66" stroke="var(--color-primary)" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
      <line x1="65" y1="60" x2="82" y2="60" stroke="var(--color-accent)" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
      <line x1="65" y1="66" x2="78" y2="66" stroke="var(--color-accent)" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
      <circle cx="60" cy="85" r="6" stroke="var(--color-primary)" strokeWidth="1.5" opacity="0.4" fill="none" />
      <path d="M57 85 L59 87 L63 83" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  );
}

export function EmptyCheckStar() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="35" stroke="var(--color-primary)" strokeWidth="2" opacity="0.15" />
      <circle cx="60" cy="60" r="25" stroke="var(--color-accent)" strokeWidth="1.5" opacity="0.2" />
      <path d="M48 60 L56 68 L74 50" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      <path d="M85 25 L87 30 L92 30 L88 34 L89 39 L85 36 L81 39 L82 34 L78 30 L83 30 Z" fill="var(--color-accent)" opacity="0.4" />
      <path d="M30 80 L31.5 83 L35 83 L32.5 85.5 L33 89 L30 87 L27 89 L27.5 85.5 L25 83 L28.5 83 Z" fill="var(--color-primary)" opacity="0.3" />
      <path d="M90 75 L91 77 L93 77 L91.5 78.5 L92 80.5 L90 79.5 L88 80.5 L88.5 78.5 L87 77 L89 77 Z" fill="var(--color-accent)" opacity="0.3" />
    </svg>
  );
}

export function EmptyTelescope() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="100" rx="30" ry="4" fill="var(--color-border)" opacity="0.3" />
      <line x1="60" y1="100" x2="45" y2="55" stroke="var(--color-text-secondary)" strokeWidth="2" opacity="0.3" />
      <line x1="60" y1="100" x2="75" y2="55" stroke="var(--color-text-secondary)" strokeWidth="2" opacity="0.3" />
      <line x1="60" y1="100" x2="60" y2="50" stroke="var(--color-text-secondary)" strokeWidth="2" opacity="0.4" />
      <rect x="48" y="30" width="24" height="25" rx="4" stroke="var(--color-primary)" strokeWidth="2" opacity="0.5" transform="rotate(-15 60 42)" />
      <circle cx="55" cy="28" r="10" stroke="var(--color-accent)" strokeWidth="2" opacity="0.4" fill="none" />
      <circle cx="55" cy="28" r="6" stroke="var(--color-accent)" strokeWidth="1" opacity="0.2" fill="none" />
      <circle cx="85" cy="20" r="2" fill="var(--color-primary)" opacity="0.4" />
      <circle cx="30" cy="30" r="1.5" fill="var(--color-accent)" opacity="0.3" />
      <circle cx="95" cy="40" r="1" fill="var(--color-primary)" opacity="0.3" />
      <circle cx="25" cy="50" r="1.5" fill="var(--color-accent)" opacity="0.2" />
    </svg>
  );
}
