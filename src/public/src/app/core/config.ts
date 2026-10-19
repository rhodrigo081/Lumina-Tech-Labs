import { HttpContextToken } from '@angular/common/http';

/** true = backend simulado em memória (sem API). Mude para false ao integrar com o Spring Boot. */
export const USE_MOCK = true;
export const API_BASE = '/api/v1';
export const DEFAULT_REPORT_ID = 'ECM-2026-8942';
export const TARIFF_KWH = 0.84;
/** WhatsApp comercial: DDI + DDD + número, só dígitos (ex.: '5581999990001'). Vazio = o usuário escolhe o contato no WhatsApp. */
export const WHATSAPP_NUMBER = '';

/** Requisições "silenciosas": sem retry automático e sem toast de erro (ex.: preview em tempo real). */
export const SILENT = new HttpContextToken<boolean>(() => false);

/** Latência simulada do backend mock (ms). */
export const LATENCY_MS = 450;
