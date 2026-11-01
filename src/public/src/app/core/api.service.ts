import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE, SILENT } from './config';
import {
  BookingRequest, BookingResponse, ContactReceipt, ContactRequest, DiagnosticInput, DiagnosticResult, LeadRequest, LeadResponse, Slot,
} from './models';

/** Único lugar com chamadas HTTP. Contratos conforme o Swagger do backend (/api/v1). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /** POST /diagnostics/preview */
  preview(input: DiagnosticInput) {
    return this.http.post<DiagnosticResult>(`${API_BASE}/diagnostics/preview`, input, { context: new HttpContext().set(SILENT, true) });
  }

  /** POST /leads — o header Idempotency-Key evita lead duplicado em reenvios. */
  createLead(body: LeadRequest, idempotencyKey: string) {
    return this.http.post<LeadResponse>(`${API_BASE}/leads`, body, { headers: { 'Idempotency-Key': idempotencyKey } });
  }

  /** GET /leads/{id}/report — o backend devolve o relatório como texto. */
  getReportText(leadId: string) {
    return this.http.get(`${API_BASE}/leads/${encodeURIComponent(leadId)}/report`, { responseType: 'text' });
  }

  /** GET /schedule/slots — horários livres criados pela equipe (opcionalmente de um técnico). */
  getSlots(technicianId?: string) {
    return this.http.get<Slot[]>(`${API_BASE}/schedule/slots`, { params: technicianId ? { technicianId } : {} });
  }

  /** POST /schedule/book */
  book(body: BookingRequest) {
    return this.http.post<BookingResponse>(`${API_BASE}/schedule/book`, body);
  }

  /** POST /contact — endpoint a ser criado no backend (não consta no Swagger atual). */
  sendContact(body: ContactRequest, idempotencyKey: string) {
    return this.http.post<ContactReceipt | null>(`${API_BASE}/contact`, body, { headers: { 'Idempotency-Key': idempotencyKey } });
  }
}
