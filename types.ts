
export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
  author: string;
  notes?: string;
}

export interface LogEntry {
  id: string;
  author: string;
  timestamp: string;
  content: string;
  type: 'update' | 'plan' | 'issue';
}

export interface DesignItem {
  id: string;
  url: string;
  caption: string;
  timestamp: string;
  author: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text?: string;
  audioUrl?: string;
  type: 'text' | 'audio';
  timestamp: string;
}

export interface TimelineMilestone {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'planned' | 'in-progress' | 'delayed' | 'completed';
  description?: string;
}

export interface ProjectState {
  totalBudget: number;
  projectName: string;
  expenses: Expense[];
  logs: LogEntry[];
  designs: DesignItem[];
  messages: ChatMessage[];
  timeline: TimelineMilestone[];
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  EXPENSES = 'EXPENSES',
  LOGS = 'LOGS',
  DESIGN = 'DESIGN',
  CHAT = 'CHAT',
  TIMELINE = 'TIMELINE',
  SETTINGS = 'SETTINGS'
}

export interface UserSession {
  name: string;
  isAuthenticated: boolean;
}
