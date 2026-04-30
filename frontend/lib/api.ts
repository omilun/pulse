import { getToken, clearToken } from './auth';
import type {
  User, Goal, Story, Task,
  Commitment, DailyEntry, OneTimeTask, WeekDay,
} from './types';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(p: string) => request<T>('GET', p);
const post = <T>(p: string, b: unknown) => request<T>('POST', p, b);
const put = <T>(p: string, b: unknown) => request<T>('PUT', p, b);
const del = <T>(p: string) => request<T>('DELETE', p);

interface AuthResp { token: string; user?: User; }
type LTBody = Partial<{ title: string; description: string; status: string; start_date: string; due_date: string; }>;
type CommBody = Partial<{ title: string; description: string; frequency: string; time_of_day: string; active: boolean; }>;
type OTBody = Partial<{ title: string; description: string; status: string; scheduled_at: string; }>;

export const api = {
  auth: {
    login:    (email: string, password: string) =>
      post<AuthResp>('/auth/login', { email, password }),
    register: (email: string, password: string, display_name: string) =>
      post<AuthResp>('/auth/register', { email, password, display_name }),
    me:       () => get<User>('/auth/me'),
  },
  lt: {
    goals: {
      list:   () => get<Goal[]>('/api/lt/goals'),
      create: (b: LTBody) => post<Goal>('/api/lt/goals', b),
      update: (id: string, b: LTBody | Record<string, unknown>) => put<Goal>(`/api/lt/goals/${id}`, b),
      delete: (id: string) => del<void>(`/api/lt/goals/${id}`),
    },
    stories: {
      listByGoal: (goalId: string) => get<Story[]>(`/api/lt/goals/${goalId}/stories`),
      create:     (goalId: string, b: LTBody) => post<Story>(`/api/lt/goals/${goalId}/stories`, b),
      update:     (id: string, b: LTBody | Record<string, unknown>) => put<Story>(`/api/lt/stories/${id}`, b),
      delete:     (id: string) => del<void>(`/api/lt/stories/${id}`),
    },
    tasks: {
      listByStory: (storyId: string) => get<Task[]>(`/api/lt/stories/${storyId}/tasks`),
      create:      (storyId: string, b: LTBody) => post<Task>(`/api/lt/stories/${storyId}/tasks`, b),
      update:      (id: string, b: LTBody | Record<string, unknown>) => put<Task>(`/api/lt/tasks/${id}`, b),
      delete:      (id: string) => del<void>(`/api/lt/tasks/${id}`),
    },
    timeline: () => get<{ goals: Goal[]; stories: Story[] }>('/api/lt/timeline'),
  },
  daily: {
    commitments: {
      list:   () => get<Commitment[]>('/api/daily/commitments'),
      create: (b: CommBody) => post<Commitment>('/api/daily/commitments', b),
      update: (id: string, b: CommBody | Record<string, unknown>) => put<Commitment>(`/api/daily/commitments/${id}`, b),
      delete: (id: string) => del<void>(`/api/daily/commitments/${id}`),
    },
    tasks: {
      list:   () => get<OneTimeTask[]>('/api/daily/tasks'),
      create: (b: OTBody) => post<OneTimeTask>('/api/daily/tasks', b),
      update: (id: string, b: OTBody | Record<string, unknown>) => put<OneTimeTask>(`/api/daily/tasks/${id}`, b),
      delete: (id: string) => del<void>(`/api/daily/tasks/${id}`),
    },
    week:      (date?: string) => get<WeekDay[]>(`/api/daily/week${date ? `?date=${date}` : ''}`),
    markEntry: (id: number, done: boolean) => put<DailyEntry>(`/api/daily/entries/${id}`, { done }),
  },
};
