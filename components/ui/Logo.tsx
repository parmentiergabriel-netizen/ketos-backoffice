/** Baleine Ketos : la queue ondule et le souffle jaillit en boucle (CSS dans globals.css). */
export function Whale({ size = 40, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g className="spout" stroke={color} strokeWidth={2.6} strokeLinecap="round">
        <path d="M24 17v-7" />
        <path d="M24 13c-1.5-3-4-4-6.5-4" />
        <path d="M24 13c1.5-3 4-4 6.5-4" />
      </g>
      <path
        fill={color}
        d="M6 36c0-9.4 8.6-16 19.5-16C35 20 41 24.6 44 31.5c.6 1.4 2.4 1.8 3.5.8L52 28c1-1 2.7-.1 2.4 1.3l-1 5 .1.4 3.5 3.6c1 1-.1 2.6-1.4 2.1l-5.5-2c-1.5-.5-3 .3-3.6 1.7C43.5 46.4 36 50 27 50 14.6 50 6 44.6 6 36z"
      />
      <circle cx="19" cy="33" r="2.2" fill="#0750a8" />
      <path d="M12 41c4 3.2 10 4.6 17 3.6" stroke="#0750a8" strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ subtitle = "Backoffice" }: { subtitle?: string }) {
  return (
    <div className="brand">
      <div className="brand-badge"><Whale size={22} /></div>
      <div>Ketos<small>{subtitle}</small></div>
    </div>
  );
}
