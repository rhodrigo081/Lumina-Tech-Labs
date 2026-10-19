import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE, SILENT } from './config';
import { Booking, BookingRequest, ContactReceipt, ContactRequest, DaySlots, DiagnosticInput, DiagnosticResult, LeadForm, Report } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  preview(input: DiagnosticInput) {
    return this.http.post<DiagnosticResult>(`${API_BASE}/diagnostics/preview`, input, { context: new HttpContext().set(SILENT, true) });
  }
  createLead(lead: LeadForm, input: DiagnosticInput, idempotencyKey: string) {
    return this.http.post<{ id: string }>(`${API_BASE}/leads`, { lead, input }, { headers: { 'X-Idempotency-Key': idempotencyKey } });
  }
  getReport(id: string) { return this.http.get<Report>(`${API_BASE}/leads/${encodeURIComponent(id)}/report`); }
  sendContact(body: ContactRequest, idempotencyKey: string) {
    return this.http.post<ContactReceipt>(`${API_BASE}/contact`, body, { headers: { 'X-Idempotency-Key': idempotencyKey } });
  }
  getBooking(protocol: string) { return this.http.get<Booking>(`${API_BASE}/schedule/bookings/${encodeURIComponent(protocol)}`); }
  getSlots() { return this.http.get<DaySlots[]>(`${API_BASE}/schedule/slots`); }
  book(req: BookingRequest, idempotencyKey: string) {
    return this.http.post<Booking>(`${API_BASE}/schedule/book`, req, { headers: { 'X-Idempotency-Key': idempotencyKey } });
  }
}
