import type { ServiceTicket } from './types';

export function durationLabel(minutes?: number) {
  if (!minutes) return 'Belum ditentukan';
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return [hours ? `${hours} jam` : '', rest ? `${rest} menit` : ''].filter(Boolean).join(' ');
}

export function ticketDeadline(ticket: Pick<ServiceTicket, 'status' | 'nextDeadlineAt'>, now = Date.now()) {
  const due = ticket.nextDeadlineAt ? new Date(ticket.nextDeadlineAt).getTime() : NaN;
  if (['completed', 'cancelled', 'rejected'].includes(ticket.status) || !Number.isFinite(due)) return { level: 'normal', rank: 3, label: 'Tanpa tenggat', remaining: '', dueAt: undefined };
  const delta = due - now;
  const level = delta <= 0 ? 'overdue' : delta <= 86400000 ? 'high' : delta <= 172800000 ? 'soon' : 'normal';
  const minutes = Math.ceil(Math.abs(delta) / 60000);
  const remaining = minutes >= 1440 ? `${Math.ceil(minutes / 1440)} hari` : minutes >= 60 ? `${Math.ceil(minutes / 60)} jam` : `${minutes} menit`;
  return { level, rank: { overdue: 0, high: 1, soon: 2, normal: 3 }[level], label: { overdue: 'Terlambat', high: 'Prioritas tinggi', soon: 'Segera jatuh tempo', normal: 'Terjadwal' }[level], remaining: `${delta <= 0 ? 'Lewat' : 'Sisa'} ${remaining}`, dueAt: new Date(due).toISOString() };
}

export function localDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
