import { ApiError } from './models';

export type ErrorContext = 'preview' | 'lead' | 'slots' | 'book' | 'contact' | 'admin';
export interface FriendlyError { title: string; message: string; details?: string[]; }

export function friendly(e: ApiError, ctx: ErrorContext): FriendlyError {
  const details = e.details?.length ? e.details : undefined;
  if (e.status === 0) return { title: 'Sem conexão com o servidor', message: 'Verifique sua internet e tente novamente. Seus dados foram mantidos.' };
  if (e.status >= 500) return { title: 'Servidor indisponível no momento', message: 'Tentamos reconectar automaticamente sem sucesso. Seus dados foram mantidos: tente novamente em instantes.' };
  if (e.status === 429) return { title: 'Muitas tentativas', message: 'Aguarde alguns segundos e tente novamente.' };

  switch (ctx) {
    case 'lead':
      if (e.status === 409 && e.code === 'REQUEST_IN_PROGRESS') return { title: 'Seu envio ainda está sendo processado', message: 'Aguarde alguns segundos e tente novamente.' };
      if (e.code === 'TERMS_VERSION_MISMATCH') return { title: 'Os termos foram atualizados', message: 'Recarregue a página, leia a versão atual dos Termos de Uso e da Política de Privacidade e aceite novamente.' };
      if (e.status === 409) return { title: 'Já existe um diagnóstico para este e-mail', message: 'Use outro e-mail ou fale com a nossa equipe para retomar o seu relatório.' };
      if (e.status === 400 || e.status === 422) return { title: 'Revise os dados informados', message: e.message || 'Alguns campos não foram aceitos.', details };
      break;
    case 'book':
      if (e.status === 409 && e.code === 'LEAD_ALREADY_SCHEDULED') return { title: 'Você já tem uma reunião agendada', message: 'Para alterar o horário, fale com a nossa equipe pelo WhatsApp ou pela página de contato.' };
      if (e.status === 409) return { title: 'Esse horário acabou de ser reservado', message: 'Atualizamos a grade: escolha outro horário disponível.' };
      if (e.status === 404 && e.code === 'SLOT_NOT_FOUND') return { title: 'Horário indisponível', message: 'Esse horário foi removido da agenda. Escolha outro horário.' };
      if (e.status === 404) return { title: 'Diagnóstico não encontrado', message: 'Não localizamos o seu cadastro. Refaça o diagnóstico para continuar.' };
      if (e.status === 400 || e.status === 422) return { title: 'Não foi possível agendar', message: e.message || 'Os dados do agendamento não foram aceitos.', details };
      break;
    case 'admin':
      if (e.status === 401) return { title: 'Sessão expirada', message: 'Entre novamente para continuar.' };
      if (e.status === 403) return { title: 'Acesso negado', message: 'Seu usuário não tem permissão para esta ação.' };
      if (e.status === 400 || e.status === 409 || e.status === 404) return { title: 'Não foi possível concluir', message: e.message || 'Verifique os dados e tente novamente.', details };
      break;
    case 'contact':
      if (e.status === 404 || e.status === 405) return { title: 'Envio por formulário indisponível', message: 'Não foi possível enviar agora. Fale com a nossa equipe pelo WhatsApp.' };
      if (e.status === 400 || e.status === 422) return { title: 'Revise os dados informados', message: e.message || 'Alguns campos não foram aceitos.', details };
      break;
    case 'preview':
      if (e.status === 400 || e.status === 422) return { title: 'Revise os valores informados', message: 'Algum dos valores está fora do intervalo aceito pela simulação.', details };
      break;
  }
  return { title: 'Não foi possível concluir a ação', message: e.message || 'Tente novamente.', details };
}
