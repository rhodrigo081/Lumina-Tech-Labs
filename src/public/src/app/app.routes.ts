import { Routes } from '@angular/router';
import { ShellComponent } from './shared/shell.component';
import { reportFlowGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'diagnostico' },
      { path: 'diagnostico', title: 'Lumina Tech Labs — Diagnóstico Energético', loadComponent: () => import('./pages/diagnostico.page').then((m) => m.DiagnosticoPage) },
      { path: 'relatorio', title: 'Lumina Tech Labs — Relatório de Auditoria', canActivate: [reportFlowGuard], loadComponent: () => import('./pages/relatorio.page').then((m) => m.RelatorioPage) },
      { path: 'agendamento', title: 'Lumina Tech Labs — Agendamento', loadComponent: () => import('./pages/agendamento.page').then((m) => m.AgendamentoPage) },
      { path: 'agendamento/:id', title: 'Lumina Tech Labs — Agendamento', loadComponent: () => import('./pages/agendamento.page').then((m) => m.AgendamentoPage) },
      { path: 'confirmacao/:protocol', title: 'Lumina Tech Labs — Agendamento confirmado', loadComponent: () => import('./pages/confirmacao.page').then((m) => m.ConfirmacaoPage) },
      { path: 'sobre', title: 'Lumina Tech Labs — Sobre', loadComponent: () => import('./pages/sobre.page').then((m) => m.SobrePage) },
      { path: 'contato', title: 'Lumina Tech Labs — Contato', loadComponent: () => import('./pages/contato.page').then((m) => m.ContatoPage) },
      { path: '**', redirectTo: 'diagnostico' },
    ],
  },
];
