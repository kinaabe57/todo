/// <reference types="vite/client" />

import { Project, Todo, Note, ChatMessage, AppSettings } from './types'

interface ClaudeResponse {
  content: string;
  suggestedTodos?: { text: string; projectId?: string; added: boolean }[];
}

interface ElectronAPI {
  getProjects: () => Promise<Project[]>;
  getArchivedProjects: () => Promise<Project[]>;
  addProject: (name: string, description: string) => Promise<Project>;
  archiveProject: (id: string) => Promise<Project>;
  restoreProject: (id: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  
  getTodos: () => Promise<Todo[]>;
  addTodo: (projectId: string, text: string, source: 'manual' | 'ai') => Promise<Todo>;
  toggleTodo: (id: string, completed: boolean) => Promise<Todo>;
  deleteTodo: (id: string) => Promise<void>;
  updateTodoPriority: (id: string, priority: 'high' | 'medium' | 'low') => Promise<Todo>;
  
  getNotes: () => Promise<Note[]>;
  addNote: (projectId: string, content: string) => Promise<Note>;
  
  getMessages: () => Promise<ChatMessage[]>;
  saveMessage: (message: ChatMessage) => Promise<void>;
  
  sendToClaude: (message: string, projects: Project[], todos: Todo[], notes: Note[]) => Promise<ClaudeResponse>;
  
  getSettings: () => Promise<AppSettings | null>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  
  checkForUpdates: () => Promise<{ currentVersion?: string } | undefined>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  openReleasePage: () => Promise<void>;
  getAppVersion: () => Promise<string>;
  onUpdateStatus: (callback: (payload: { event: string; data?: unknown }) => void) => void;
  removeUpdateStatusListener: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
