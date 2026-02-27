/// <reference types="vite/client" />

import { Project, Todo, Note, ChatMessage, AppSettings } from './types'

interface ClaudeResponse {
  content: string;
  suggestedTodos?: { text: string; projectId?: string; added: boolean }[];
}

interface ElectronAPI {
  getProjects: () => Promise<Project[]>;
  addProject: (name: string, description: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  
  getTodos: () => Promise<Todo[]>;
  addTodo: (projectId: string, text: string, source: 'manual' | 'ai') => Promise<Todo>;
  toggleTodo: (id: string, completed: boolean) => Promise<Todo>;
  deleteTodo: (id: string) => Promise<void>;
  
  getNotes: () => Promise<Note[]>;
  addNote: (projectId: string, content: string) => Promise<Note>;
  
  getMessages: () => Promise<ChatMessage[]>;
  saveMessage: (message: ChatMessage) => Promise<void>;
  
  sendToClaude: (message: string, projects: Project[], todos: Todo[], notes: Note[]) => Promise<ClaudeResponse>;
  
  getSettings: () => Promise<AppSettings | null>;
  saveSettings: (settings: AppSettings) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
