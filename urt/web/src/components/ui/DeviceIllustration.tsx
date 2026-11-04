type DeviceIllustrationProps = { category?: string; size?: number };

/** Small category-aware device illustration for service summary cards. */
export function DeviceIllustration({ category = '', size = 72 }: DeviceIllustrationProps) {
  const value = category.toLocaleLowerCase('id-ID');
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 96 72',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  if (value.includes('phone') || value.includes('smartphone') || value.includes('ponsel')) {
    return <svg {...common}><rect x="32" y="5" width="32" height="62" rx="6" /><path d="M42 12h12M44 58h8" /><circle cx="48" cy="62" r="1" fill="currentColor" /></svg>;
  }
  if (value.includes('tablet')) {
    return <svg {...common}><rect x="23" y="7" width="50" height="58" rx="6" /><circle cx="48" cy="59" r="1.5" fill="currentColor" /></svg>;
  }
  if (value.includes('desktop') || value.includes('komputer')) {
    return <svg {...common}><rect x="12" y="7" width="72" height="46" rx="4" /><path d="M48 53v10M34 65h28" /><path d="M18 13h60v34H18z" /></svg>;
  }
  if (value.includes('printer')) {
    return <svg {...common}><path d="M27 25V9h42v16M26 52H17V29h62v23h-9" /><path d="M27 44h42v21H27zM34 15h28M35 52h26M68 35h1" /></svg>;
  }
  if (value.includes('monitor')) {
    return <svg {...common}><rect x="12" y="7" width="72" height="46" rx="4" /><path d="M48 53v10M34 65h28" /></svg>;
  }
  if (value.includes('kamera') || value.includes('camera')) {
    return <svg {...common}><path d="M14 24h15l5-8h25l5 8h18a5 5 0 015 5v28a5 5 0 01-5 5H14a5 5 0 01-5-5V29a5 5 0 015-5z" /><circle cx="48" cy="42" r="13" /><circle cx="48" cy="42" r="6" /></svg>;
  }
  if (value.includes('audio') || value.includes('speaker') || value.includes('headphone')) {
    return <svg {...common}><rect x="22" y="10" width="52" height="55" rx="7" /><circle cx="48" cy="32" r="12" /><circle cx="48" cy="52" r="5" /></svg>;
  }
  if (value.includes('laptop')) {
    return <svg {...common}><rect x="18" y="8" width="60" height="42" rx="4" /><path d="M10 58h76l-6 7H16zM42 58h12" /></svg>;
  }
  return <svg {...common}><rect x="16" y="8" width="64" height="56" rx="8" /><path d="M28 22h40M28 34h28M28 46h34" /><circle cx="67" cy="53" r="3" fill="currentColor" /></svg>;
}
