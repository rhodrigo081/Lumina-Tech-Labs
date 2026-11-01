/** Todas as datas/horas da interface seguem o horário de Brasília, independente do fuso do computador do usuário. */
const TZ = 'America/Sao_Paulo';
const fmt = (o: Intl.DateTimeFormatOptions, loc = 'pt-BR') => new Intl.DateTimeFormat(loc, { timeZone: TZ, ...o });

const dayFmt = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }, 'en-CA');
const timeFmt = fmt({ hour: '2-digit', minute: '2-digit', hour12: false });
const hourFmt = fmt({ hour: 'numeric', hour12: false });
const weekdayFmt = fmt({ weekday: 'long' });
const dateTimeFmt = fmt({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const monthFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "2026-10-19" (data em Brasília) */
export const dayKey = (iso: string) => dayFmt.format(new Date(iso));
/** "14:00" */
export const timeOf = (iso: string) => timeFmt.format(new Date(iso));
export const hourOf = (iso: string) => Number(hourFmt.format(new Date(iso))) % 24;
export const weekdayOf = (iso: string) => cap(weekdayFmt.format(new Date(iso)));
/** "19/10/2026 14:00" */
export const dateTimeOf = (iso: string) => dateTimeFmt.format(new Date(iso)).replace(',', '');
/** "19/10/2026" a partir de "2026-10-19" */
export const brDateOf = (key: string) => key.split('-').reverse().join('/');
/** "Outubro de 2026" a partir de "2026-10-19" */
export const monthYearOf = (key: string) => cap(monthFmt.format(new Date(key + 'T12:00:00Z')));
/** "20261019T170000Z" (formato de convites de calendário) */
export const compactUtc = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '');
export const addMinutes = (iso: string, min: number) => new Date(new Date(iso).getTime() + min * 60000).toISOString();

/* ---------- Aritmética de dias (chaves "AAAA-MM-DD" no calendário de Brasília) ---------- */
/** Hoje em Brasília: "2026-10-19" */
export const todayKey = () => dayFmt.format(new Date());
/** Soma dias a uma chave de data, sem depender do fuso do navegador. */
export const addDaysKey = (key: string, n: number) => {
  const d = new Date(key + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** 0 = domingo ... 6 = sábado */
export const weekdayIndex = (key: string) => new Date(key + 'T12:00:00Z').getUTCDay();
/** Segunda-feira da semana da data. */
export const mondayOf = (key: string) => addDaysKey(key, -((weekdayIndex(key) + 6) % 7));
/**
 * Instante ISO de uma data/hora de Brasília. Brasília está em UTC-3 fixo
 * (sem horário de verão desde 2019) — o mesmo critério exibido na interface.
 */
export const brtInstant = (key: string, time = '00:00') => new Date(`${key}T${time}:00-03:00`).toISOString();
/** "seg., 19/10" */
export const shortDayLabel = (key: string) =>
  `${new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'short' }).format(new Date(key + 'T12:00:00Z'))} ${brDateOf(key).slice(0, 5)}`;
