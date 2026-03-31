/// <reference types="vite/client" />

import { Project, Todo, Note, ChatMessage, AppSettings, Subtask, GranolaMeetingReview } from './types'

interface ClaudeResponse {
  content: string;
  suggestedTodos?: { text: string; projectId?: string; added: boolean }[];
}

interface ElectronAPI {
  getProjects: () => Promise<Project[]>;
  getArchivedProjects: () => Promise<Project[]>;
  addProject: (name: string, description: string, color: string) => Promise<Project>;
  updateProject: (id: string, name: string, description: string, color: string) => Promise<Project>;
  archiveProject: (id: string) => Promise<Project>;
  restoreProject: (id: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  reorderProjects: (orderedIds: string[]) => Promise<void>;

  getTodos: () => Promise<Todo[]>;
  addTodo: (projectId: string, text: string, source: 'manual' | 'ai') => Promise<Todo>;
  toggleTodo: (id: string, completed: boolean) => Promise<Todo>;
  deleteTodo: (id: string) => Promise<void>;
  moveTodo: (id: string, newProjectId: string) => Promise<Todo>;
  
  getAllSubtasks: () => Promise<Subtask[]>;
  addSubtask: (todoId: string, text: string) => Promise<Subtask>;
  toggleSubtask: (id: string, completed: boolean) => Promise<Subtask>;
  deleteSubtask: (id: string) => Promise<void>;
  completeAllSubtasks: (todoId: string) => Promise<void>;

  getNotes: () => Promise<Note[]>;
  addNote: (projectId: string | null, content: string, title?: string | null) => Promise<Note>;
  updateNote: (id: string, updates: { content?: string; title?: string | null; pinned?: boolean }) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  
  getMessages: () => Promise<ChatMessage[]>;
  saveMessage: (message: ChatMessage) => Promise<void>;
  
  sendToClaude: (message: string, projects: Project[], todos: Todo[], notes: Note[], history: ChatMessage[]) => Promise<ClaudeResponse>;
  
  getSettings: () => Promise<AppSettings | null>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  
  checkForUpdates: () => Promise<{ currentVersion?: string } | undefined>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  openReleasePage: () => Promise<void>;
  getAppVersion: () => Promise<string>;
  onUpdateStatus: (callback: (payload: { event: string; data?: unknown }) => void) => void;
  removeUpdateStatusListener: () => void;

  getGranolaReviews: () => Promise<GranolaMeetingReview[]>;
  dismissGranolaReview: (id: string) => Promise<void>;
  onGranolaReviewsUpdated: (callback: () => void) => void;
  removeGranolaListener: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
