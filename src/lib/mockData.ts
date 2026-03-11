export type SecurityLevel = "normal" | "private" | "ultra";
export type Priority = "high" | "medium" | "low";

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  priority: Priority;
  security: SecurityLevel;
  isGroup: boolean;
  isOnline: boolean;
  members?: number;
}

export interface Message {
  id: string;
  content: string;
  sender: "me" | "other";
  time: string;
  read: boolean;
}

export interface AISummary {
  groupId: string;
  groupName: string;
  summary: string;
  decisions: string[];
  tasks: string[];
  importantMessages: string[];
  generatedAt: string;
}

export const mockChats: Chat[] = [
  {
    id: "1",
    name: "Operação Delta",
    avatar: "OD",
    lastMessage: "Arquivos atualizados. Revisem antes da reunião.",
    time: "22:14",
    unread: 5,
    priority: "high",
    security: "ultra",
    isGroup: true,
    isOnline: false,
    members: 8,
  },
  {
    id: "2",
    name: "Marina Silva",
    avatar: "MS",
    lastMessage: "Confirmado para amanhã.",
    time: "21:30",
    unread: 2,
    priority: "high",
    security: "private",
    isGroup: false,
    isOnline: true,
  },
  {
    id: "3",
    name: "Equipe Phantom",
    avatar: "EP",
    lastMessage: "Novo protocolo de segurança implementado.",
    time: "20:45",
    unread: 12,
    priority: "medium",
    security: "normal",
    isGroup: true,
    isOnline: false,
    members: 15,
  },
  {
    id: "4",
    name: "Lucas Mendes",
    avatar: "LM",
    lastMessage: "Vou enviar o relatório agora.",
    time: "19:20",
    unread: 0,
    priority: "medium",
    security: "normal",
    isGroup: false,
    isOnline: false,
  },
  {
    id: "5",
    name: "Alertas do Sistema",
    avatar: "AS",
    lastMessage: "Login detectado de novo dispositivo.",
    time: "18:00",
    unread: 1,
    priority: "low",
    security: "normal",
    isGroup: false,
    isOnline: true,
  },
  {
    id: "6",
    name: "Projeto Nexus",
    avatar: "PN",
    lastMessage: "Deploy realizado com sucesso.",
    time: "17:30",
    unread: 0,
    priority: "low",
    security: "private",
    isGroup: true,
    isOnline: false,
    members: 6,
  },
];

export const mockMessages: Message[] = [
  { id: "1", content: "Os arquivos foram criptografados e enviados.", sender: "other", time: "22:10", read: true },
  { id: "2", content: "Recebi. Verificando integridade agora.", sender: "me", time: "22:11", read: true },
  { id: "3", content: "Hash SHA-256 confirmado. Tudo limpo.", sender: "other", time: "22:12", read: true },
  { id: "4", content: "Perfeito. Vou atualizar o repositório.", sender: "me", time: "22:13", read: true },
  { id: "5", content: "Arquivos atualizados. Revisem antes da reunião.", sender: "other", time: "22:14", read: false },
];

export const mockSummaries: AISummary[] = [
  {
    groupId: "1",
    groupName: "Operação Delta",
    summary: "Equipe discutiu atualização de arquivos criptografados e agendou reunião de revisão para as 22h. Novo protocolo de segurança foi aprovado por unanimidade.",
    decisions: ["Reunião de revisão às 22h", "Novo protocolo aprovado"],
    tasks: ["Revisar arquivos antes da reunião", "Confirmar presença de todos"],
    importantMessages: ["Arquivos atualizados. Revisem antes da reunião."],
    generatedAt: "22:15",
  },
  {
    groupId: "3",
    groupName: "Equipe Phantom",
    summary: "Implementação do novo protocolo concluída. Testes programados para amanhã. 3 vulnerabilidades corrigidas.",
    decisions: ["Protocolo v2.1 implementado", "Testes agendados"],
    tasks: ["Executar testes", "Documentar vulnerabilidades"],
    importantMessages: ["Novo protocolo de segurança implementado."],
    generatedAt: "20:50",
  },
];
