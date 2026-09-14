/** CSS selects the matching asset before hydration, including system dark mode. */
export default function BrandIcon({ className = "", size = 30 }: { className?: string; size?: number }) {
  return <span className={`brand-art ${className}`} style={{ width: size, height: size }} aria-hidden="true">
    {/* eslint-disable @next/next/no-img-element */}
    <img className="brand-art-light" src="/assets/leaf-logo.png" alt="" width={size} height={size} draggable={false} />
    <img className="brand-art-dark" src="/assets/leaf-logo-dark.png" alt="" width={size} height={size} draggable={false} />
  </span>;
}
