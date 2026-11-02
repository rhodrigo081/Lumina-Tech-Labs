import { TERMS_VERSION } from './config';

export type LegalDocKind = 'terms' | 'privacy';

export interface LegalClause {
  title: string;
  paragraphs: string[];
}

export interface LegalDoc {
  title: string;
  version: string;
  updatedAt: string;
  intro: string;
  clauses: LegalClause[];
}

const DPO_EMAIL = 'dpo@lumina.tech.labs.com.br';

export const LEGAL_DOCS: Record<LegalDocKind, LegalDoc> = {
  terms: {
    title: 'Termos de Uso',
    version: TERMS_VERSION,
    updatedAt: '02/11/2026',
    intro:
      'Estes Termos de Uso regulam o acesso e a utilização da plataforma de diagnóstico de eficiência energética da Lumina Tech Labs. Ao marcar a caixa de aceite, você declara ter lido, compreendido e concordado com as condições abaixo.',
    clauses: [
      {
        title: '1. Objeto',
        paragraphs: [
          'A plataforma oferece uma simulação de eficiência energética para ambientes corporativos, gerando um relatório executivo com estimativas de economia, payback e emissões evitadas, além da possibilidade de agendar uma visita ou reunião técnica.',
        ],
      },
      {
        title: '2. Cadastro e veracidade das informações',
        paragraphs: [
          'Para gerar o relatório, o usuário deve informar nome, cargo, empresa, telefone e e-mail corporativo. O usuário é responsável pela veracidade, exatidão e atualização dos dados fornecidos.',
          'Não são aceitos e-mails de provedores genéricos (ex.: Gmail, Hotmail), pois o serviço destina-se exclusivamente a pessoas jurídicas e seus representantes.',
        ],
      },
      {
        title: '3. Natureza das estimativas',
        paragraphs: [
          'Os valores apresentados no diagnóstico são estimativas calculadas a partir dos parâmetros informados pelo usuário e de premissas de mercado. Eles não constituem proposta comercial, garantia de resultado ou laudo técnico.',
          'Resultados reais dependem de vistoria técnica, condições do local, tarifas vigentes e outros fatores fora do controle da Lumina Tech Labs.',
        ],
      },
      {
        title: '4. Uso adequado',
        paragraphs: [
          'É vedado utilizar a plataforma para fins ilícitos, inserir dados de terceiros sem autorização, tentar acessar áreas restritas, sobrecarregar a infraestrutura ou realizar engenharia reversa do serviço.',
        ],
      },
      {
        title: '5. Agendamentos',
        paragraphs: [
          'Os horários de visita ou reunião estão sujeitos à disponibilidade da equipe técnica. A Lumina Tech Labs pode reagendar ou cancelar compromissos mediante aviso prévio pelos contatos informados.',
        ],
      },
      {
        title: '6. Propriedade intelectual',
        paragraphs: [
          'Marcas, layout, metodologia de cálculo, textos e relatórios gerados são de propriedade da Lumina Tech Labs. O relatório pode ser utilizado internamente pela empresa do usuário, sendo vedada sua comercialização.',
        ],
      },
      {
        title: '7. Limitação de responsabilidade',
        paragraphs: [
          'A Lumina Tech Labs não se responsabiliza por decisões de investimento tomadas exclusivamente com base nas estimativas do diagnóstico, nem por indisponibilidades temporárias da plataforma.',
        ],
      },
      {
        title: '8. Alterações dos termos',
        paragraphs: [
          'Estes termos podem ser atualizados a qualquer momento. A versão aceita fica registrada junto ao seu consentimento, e novas versões serão apresentadas para aceite quando aplicável.',
        ],
      },
      {
        title: '9. Legislação e foro',
        paragraphs: [
          'Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede da Lumina Tech Labs para dirimir eventuais controvérsias.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Política de Privacidade',
    version: TERMS_VERSION,
    updatedAt: '02/11/2026',
    intro:
      'Esta Política de Privacidade descreve como a Lumina Tech Labs coleta, utiliza, armazena e protege os dados pessoais tratados na plataforma, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).',
    clauses: [
      {
        title: '1. Controlador',
        paragraphs: [
          `A Lumina Tech Labs é a controladora dos dados pessoais tratados nesta plataforma. O Encarregado pelo Tratamento de Dados (DPO) pode ser contatado pelo e-mail ${DPO_EMAIL}.`,
        ],
      },
      {
        title: '2. Dados coletados',
        paragraphs: [
          'Dados de identificação e contato: nome completo, cargo, empresa, telefone e e-mail corporativo.',
          'Dados do diagnóstico: área do ambiente, número de estações de trabalho, valor da fatura de energia e demais parâmetros informados na simulação.',
          'Dados de consentimento: data e hora do aceite, endereço IP e versão dos termos aceitos.',
          'Dados de agendamento: data, horário e modalidade da visita ou reunião escolhida.',
        ],
      },
      {
        title: '3. Finalidades do tratamento',
        paragraphs: [
          'Gerar e enviar o relatório de eficiência energética; entrar em contato para apresentar os resultados; agendar e realizar visitas ou reuniões técnicas; e cumprir obrigações legais e regulatórias.',
        ],
      },
      {
        title: '4. Base legal',
        paragraphs: [
          'O tratamento é realizado com base no consentimento do titular (art. 7º, I, da LGPD), na execução de procedimentos preliminares relacionados a contrato (art. 7º, V) e no cumprimento de obrigação legal (art. 7º, II), conforme o caso.',
        ],
      },
      {
        title: '5. Compartilhamento',
        paragraphs: [
          'Os dados não são vendidos. Podem ser compartilhados apenas com a equipe técnica responsável pelo atendimento, com prestadores de serviço essenciais à operação da plataforma (como hospedagem e ferramentas de videoconferência), sob obrigação de confidencialidade, ou com autoridades, quando exigido por lei.',
        ],
      },
      {
        title: '6. Armazenamento e segurança',
        paragraphs: [
          'Adotamos medidas técnicas e administrativas para proteger os dados contra acessos não autorizados, perda ou alteração, incluindo controle de acesso à área administrativa e comunicação criptografada.',
          'Os dados são mantidos pelo tempo necessário ao cumprimento das finalidades descritas ou pelo prazo exigido por lei, sendo eliminados ou anonimizados após esse período.',
        ],
      },
      {
        title: '7. Direitos do titular',
        paragraphs: [
          'Nos termos do art. 18 da LGPD, você pode solicitar: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; informação sobre compartilhamento; e revogação do consentimento.',
          `As solicitações podem ser feitas pelo e-mail ${DPO_EMAIL} e serão respondidas nos prazos legais.`,
        ],
      },
      {
        title: '8. Revogação do consentimento',
        paragraphs: [
          'O consentimento pode ser revogado a qualquer momento, sem prejuízo da legalidade do tratamento realizado anteriormente. A revogação pode impedir a continuidade do atendimento.',
        ],
      },
      {
        title: '9. Alterações desta política',
        paragraphs: [
          'Esta política pode ser atualizada periodicamente. A versão vigente estará sempre disponível na plataforma, com a indicação da data da última atualização.',
        ],
      },
    ],
  },
};
