export function formatCurrentDateTime(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function getCurrentDateISO(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${year}-${month}-${day}`;
}

export function parseFechaHora(fechaHora: string): { date: string; time: string } {
  const match = String(fechaHora || '').match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/
  );
  if (!match) {
    return { date: getCurrentDateISO(), time: currentTimeValue() };
  }
  const day = String(match[1]).padStart(2, '0');
  const month = String(match[2]).padStart(2, '0');
  const hours = String(match[4] || '00').padStart(2, '0');
  const minutes = String(match[5] || '00').padStart(2, '0');
  return { date: `${match[3]}-${month}-${day}`, time: `${hours}:${minutes}` };
}

export function composeFechaHora(dateIso: string, time: string): string {
  const [year, month, day] = (dateIso || getCurrentDateISO()).split('-');
  const safeTime = time || currentTimeValue();
  return `${day}/${month}/${year} ${safeTime}`;
}

export function currentTimeValue(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatIsoDateDisplay(iso: string): string {
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso || '-';
  return `${match[3]}/${match[2]}/${match[1]}`;
}
