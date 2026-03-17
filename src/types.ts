export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  archived: boolean;
  archivedAt: string | null;
}

export interface Note {
  id: string;
  projectId: string | null;
  title: string | null;
  content: string;
  createdAt: string;
  pinned: boolean;
}

export interface Subtask {
  id: string;
  todoId: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface Todo {
  id: string;
  projectId: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  source: 'manual' | 'ai';
  priority: 'high' | 'medium' | 'low';
  subtasks?: Subtask[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedTodos?: SuggestedTodo[];
}

export interface SuggestedTodo {
  text: string;
  projectId?: string;
  added: boolean;
}

export interface AppSettings {
  apiKey: string;
  celebrationSoundEnabled: boolean;
}
