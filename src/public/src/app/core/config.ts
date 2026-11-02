import { HttpContextToken } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const API_BASE = `${environment.apiOrigin}/api/v1`;

export const TERMS_VERSION = 'v1.0';

export const WHATSAPP_NUMBER = '';

export const SILENT = new HttpContextToken<boolean>(() => false);
