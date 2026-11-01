import { Routes } from '@angular/router';
import { ShellComponent } from './shared/shell.component';
import { reportFlowGuard } from './core/guards';
import { adminGuard, adminLoginGuard } from './core/admin/admin.guards';

export const routes: Routes = [
  // Área administrativa: layout próprio, fora do funil público.
  { path: 'admin/login', title: 'Lumina Tech Labs — Entrar', canActivate: [adminLoginGuard], loadComponent: () => import('./pages/admin/admin-login.page').then((m) => m.AdminLoginPage) },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'leads' },
      { path: 'leads', title: 'Admin — Leads', loadComponent: () => import('./pages/admin/admin-leads.page').then((m) => m.AdminLeadsPage) },
      { path: 'leads/:id', title: 'Admin — Lead', loadComponent: () => import('./pages/admin/admin-lead-detail.page').then((m) => m.AdminLeadDetailPage) },
      { path: 'agenda', title: 'Admin — Agenda de horários', loadComponent: () => import('./pages/admin/admin-agenda.page').then((m) => m.AdminAgendaPage) },
      { path: 'tecnicos', title: 'Admin — Técnicos', loadComponent: () => import('./pages/admin/admin-technicians.page').then((m) => m.AdminTechniciansPage) },
      { path: '**', redirectTo: 'leads' },
    ],
  },
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'diagnostico' },
      { path: 'diagnostico', title: 'Lumina Tech Labs — Diagnóstico Energético', loadComponent: () => import('./pages/diagnostico.page').then((m) => m.DiagnosticoPage) },
      { path: 'relatorio', title: 'Lumina Tech Labs — Relatório de Auditoria', canActivate: [reportFlowGuard], loadComponent: () => import('./pages/relatorio.page').then((m) => m.RelatorioPage) },
      { path: 'agendamento', title: 'Lumina Tech Labs — Agendamento', loadComponent: () => import('./pages/agendamento.page').then((m) => m.AgendamentoPage) },
      { path: 'confirmacao/:protocol', title: 'Lumina Tech Labs — Agendamento confirmado', loadComponent: () => import('./pages/confirmacao.page').then((m) => m.ConfirmacaoPage) },
      { path: 'sobre', title: 'Lumina Tech Labs — Sobre', loadComponent: () => import('./pages/sobre.page').then((m) => m.SobrePage) },
      { path: 'contato', title: 'Lumina Tech Labs — Contato', loadComponent: () => import('./pages/contato.page').then((m) => m.ContatoPage) },
      { path: '**', redirectTo: 'diagnostico' },
    ],
  },
];
