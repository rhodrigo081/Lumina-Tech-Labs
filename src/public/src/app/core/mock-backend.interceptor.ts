import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { mergeMap, of, throwError, timer } from 'rxjs';
import { DEFAULT_INPUT, DEFAULT_LEAD, buildReport, calcDiagnostic } from './calc';
import { DEFAULT_REPORT_ID, LATENCY_MS } from './config';
import { Booking, BookingRequest, DaySlots, DiagnosticInput, LeadSummary } from './models';
import { isGenericDomain } from './utils';

/** Backend em memória para desenvolvimento. Remova (USE_MOCK=false) ao integrar com a API real. */
const leads = new Map<string, { lead: LeadSummary; input: DiagnosticInput }>([[DEFAULT_REPORT_ID, { lead: DEFAULT_LEAD, input: DEFAULT_INPUT }]]);
const BUSY = [['11:15', '16:15'], ['09:45', '14:45', '17:00'], ['09:00', '10:30', '11:15', '15:30', '16:15'], ['09:00', '15:30']];
const DAYS = [['2026-10-05', 'Segunda-feira'], ['2026-10-06', 'Terça-feira'], ['2026-10-07', 'Quarta-feira'], ['2026-10-08', 'Quinta-feira']];
const TIMES = ['09:00', '09:45', '10:30', '11:15', '14:00', '14:45', '15:30', '16:15', '17:00'];
const taken = new Set<string>();
const bookings = new Map<string, Booking>();

const slots = (): DaySlots[] =>
  DAYS.map(([date, weekday], i) => ({
    date, weekday, slots: TIMES.map((time) => ({ time, free: !BUSY[i].includes(time) && !taken.has(`${date}T${time}`) })),
  }));

const addMinutes = (t: string, min: number) => {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + min;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export const mockBackendInterceptor: HttpInterceptorFn = (req) => {
  const path = req.url.replace(/^.*\/api\/v1/, '');
  const trace = `#ECM-${Math.floor(10000 + Math.random() * 89999)}`;

  const reply = (status: number, body: unknown) =>
    timer(LATENCY_MS).pipe(
      mergeMap(() => status >= 400
        ? throwError(() => new HttpErrorResponse({ status, url: req.url, error: { ...(body as object), traceId: trace } }))
        : of(new HttpResponse({ status, body }))),
    );

  if (req.method === 'POST' && path === '/contact') return reply(201, { protocol: `CTT-${Math.floor(10000 + Math.random() * 89999)}` });

  if (req.method === 'POST' && path === '/diagnostics/preview') return reply(200, calcDiagnostic(req.body as DiagnosticInput));

  if (req.method === 'POST' && path === '/leads') {
    const body = req.body as { lead: Omit<LeadSummary, 'id'>; input: DiagnosticInput };
    if (isGenericDomain(body.lead.email)) return reply(400, { code: 'ERR_CORPORATE_DOMAIN_REQUIRED', message: 'Provedor pessoal não aceito.' });
    const id = `ECM-2026-${Math.floor(1000 + Math.random() * 8999)}`;
    leads.set(id, { lead: { ...body.lead, id }, input: body.input });
    return reply(201, { id });
  }

  const report = path.match(/^\/leads\/([^/]+)\/report$/);
  if (req.method === 'GET' && report) {
    const hit = leads.get(report[1]);
    return hit ? reply(200, buildReport(report[1], hit.lead, hit.input)) : reply(404, { code: 'DIAGNOSTIC_NOT_FOUND', message: 'Sessão expirada ou inexistente.' });
  }

  const bk = path.match(/^\/schedule\/bookings\/([^/]+)$/);
  if (req.method === 'GET' && bk) {
    const hit = bookings.get(bk[1]);
    return hit ? reply(200, hit) : reply(404, { code: 'BOOKING_NOT_FOUND', message: 'Reserva não localizada.' });
  }

  if (req.method === 'GET' && path === '/schedule/slots') return reply(200, slots());

  if (req.method === 'POST' && path === '/schedule/book') {
    const b = req.body as BookingRequest;
    const slot = slots().find((d) => d.date === b.date)?.slots.find((s) => s.time === b.time);
    if (!slot?.free) return reply(409, { code: 'SLOT_ALREADY_RESERVED', message: 'Horário já reservado.' });
    taken.add(`${b.date}T${b.time}`);
    const booking: Booking = {
      protocol: `ECM-AG-2026-${b.date.slice(5).replace('-', '')}-${Math.floor(100 + Math.random() * 899)}`,
      leadId: b.leadId, attendee: b.attendee, date: b.date, time: b.time, endTime: addMinutes(b.time, 45),
      meetUrl: 'https://meet.google.com/ecm-diag-9842', issuedAt: new Date().toISOString(),
    };
    bookings.set(booking.protocol, booking);
    return reply(201, booking);
  }

  return reply(404, { code: 'NOT_FOUND', message: 'Rota inexistente no mock.' });
};
