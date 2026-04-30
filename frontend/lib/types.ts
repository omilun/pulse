export interface User {
  id: string;
  email: string;
  display_name: string;
}

export type LTStatus = 'backlog' | 'in_progress' | 'done';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: LTStatus;
  start_date?: string;
  due_date?: string;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  goal_id: string;
  title: string;
  description: string;
  status: LTStatus;
  start_date?: string;
  due_date?: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  story_id: string;
  title: string;
  description: string;
  status: LTStatus;
  start_date?: string;
  due_date?: string;
  created_at: string;
}

export type Frequency = 'daily' | 'weekdays' | 'weekly';
export type DailyStatus = 'backlog' | 'scheduled' | 'done';

export interface Commitment {
  id: string;
  title: string;
  description: string;
  frequency: Frequency;
  time_of_day: string;
  active: boolean;
  created_at: string;
}

export interface DailyEntry {
  id: number;
  commitment_id: string;
  date: string;
  done: boolean;
  title: string;
  time_of_day: string;
}

export interface OneTimeTask {
  id: string;
  title: string;
  description: string;
  status: DailyStatus;
  scheduled_at?: string;
  created_at: string;
}

export interface WeekDay {
  date: string;
  commitments: DailyEntry[];
  tasks: OneTimeTask[];
}
