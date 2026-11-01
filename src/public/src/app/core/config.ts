import { HttpContextToken } from '@angular/common/http';

/** Base da API. O nginx (Docker) e o proxy do `ng serve` encaminham /api para o backend Spring Boot. */
export const API_BASE = '/api/v1';

/** Versão dos Termos de Uso enviada no consentimento (LGPD). */
export const TERMS_VERSION = 'v1.0';

/** WhatsApp comercial: DDI + DDD + número, só dígitos (ex.: '5581999990001'). Vazio = o usuário escolhe o contato no WhatsApp. */
export const WHATSAPP_NUMBER = '';

/** Requisições "silenciosas": sem retry automático (ex.: preview da calculadora, que o próprio componente trata). */
export const SILENT = new HttpContextToken<boolean>(() => false);
