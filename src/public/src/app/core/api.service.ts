import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE, SILENT } from './config';
import {
  BookingRequest, BookingResponse, ContactReceipt, ContactRequest, DiagnosticInput, DiagnosticResult, LeadRequest, LeadResponse, Slot,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  preview(input: DiagnosticInput) {
    return this.http.post<DiagnosticResult>(`${API_BASE}/diagnostics/preview`, input, { context: new HttpContext().set(SILENT, true) });
  }

  createLead(body: LeadRequest, idempotencyKey: string) {
    return this.http.post<LeadResponse>(`${API_BASE}/leads`, body, { headers: { 'Idempotency-Key': idempotencyKey } });
  }

  getReportText(leadId: string) {
    return this.http.get(`${API_BASE}/leads/${encodeURIComponent(leadId)}/report`, { responseType: 'text' });
  }

  getSlots(technicianId?: string) {
    return this.http.get<Slot[]>(`${API_BASE}/schedule/slots`, { params: technicianId ? { technicianId } : {} });
  }

  book(body: BookingRequest) {
    return this.http.post<BookingResponse>(`${API_BASE}/schedule/book`, body);
  }

  sendContact(body: ContactRequest, idempotencyKey: string) {
    return this.http.post<ContactReceipt | null>(`${API_BASE}/contact`, body, { headers: { 'Idempotency-Key': idempotencyKey } });
  }
}
