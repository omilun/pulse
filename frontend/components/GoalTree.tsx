'use client';

import { useState } from 'react';
import type { Goal, Story, Task, LTStatus } from '@/lib/types';

const STATUS_STYLES: Record<LTStatus, string> = {
  backlog:     'bg-gray-700/60 text-gray-400',
  in_progress: 'bg-amber-900/50 text-amber-300',
  done:        'bg-green-900/50 text-green-300',
};

const TYPE_COLORS = {
  goal:  'text-blue-400',
  story: 'text-purple-400',
  task:  'text-green-400',
};

interface TreeTask {
  task: Task;
  onStatusChange: (id: string, s: LTStatus) => void;
  onClick: (id: string) => void;
}

function TaskRow({ task, onStatusChange, onClick }: TreeTask) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-800 cursor-pointer group"
      onClick={() => onClick(task.id)}
    >
      <span className="text-xs text-green-600 font-mono w-4">─</span>
      <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${TYPE_COLORS.task} font-mono bg-green-900/20`}>
        TASK-{task.id.substring(0, 4).toUpperCase()}
      </span>
      <span className="text-sm text-gray-300 group-hover:text-white flex-1 truncate">{task.title}</span>
      <button
        onClick={e => { e.stopPropagation(); onStatusChange(task.id, task.status === 'done' ? 'backlog' : task.status === 'backlog' ? 'in_progress' : 'done'); }}
        className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[task.status]}`}
      >
        {task.status.replace('_', ' ')}
      </button>
    </div>
  );
}

interface TreeStory {
  story: Story;
  tasks: Task[];
  goalTitle: string;
  onStatusChange: (type: 'story' | 'task', id: string, s: LTStatus) => void;
  onClick: (type: 'story' | 'task', id: string) => void;
}

function StoryRow({ story, tasks, goalTitle, onStatusChange, onClick }: TreeStory) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800 cursor-pointer group"
        onClick={() => onClick('story', story.id)}
      >
        <button
          onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
          className="text-gray-600 hover:text-gray-400 w-4 text-xs shrink-0"
        >
          {open ? '▼' : '▶'}
        </button>
        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 font-mono ${TYPE_COLORS.story} bg-purple-900/20`}>
          STORY-{story.id.substring(0, 4).toUpperCase()}
        </span>
        <span className="text-sm text-gray-200 group-hover:text-white flex-1 truncate">{story.title}</span>
        <span className="text-xs text-gray-600 shrink-0">{goalTitle}</span>
        <button
          onClick={e => { e.stopPropagation(); onStatusChange('story', story.id, story.status === 'done' ? 'backlog' : story.status === 'backlog' ? 'in_progress' : 'done'); }}
          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[story.status]}`}
        >
          {story.status.replace('_', ' ')}
        </button>
      </div>
      {open && (
        <div className="ml-6 border-l border-gray-800 pl-2">
          {tasks.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              onStatusChange={(id, s) => onStatusChange('task', id, s)}
              onClick={id => onClick('task', id)}
            />
          ))}
          {tasks.length === 0 && (
            <p className="text-xs text-gray-700 py-1 px-3">No tasks</p>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  goals: Goal[];
  stories: Record<string, Story[]>;
  tasks: Record<string, Task[]>;
  onStatusChange: (type: 'goal' | 'story' | 'task', id: string, status: LTStatus) => void;
  onCardClick: (type: 'goal' | 'story' | 'task', id: string) => void;
}

export default function GoalTree({ goals, stories, tasks, onStatusChange, onCardClick }: Props) {
  const [openGoals, setOpenGoals] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setOpenGoals(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  if (goals.length === 0) {
    return <p className="text-gray-600 text-sm text-center py-16">No goals yet. Create one with the + button.</p>;
  }

  return (
    <div className="space-y-1">
      {goals.map(goal => {
        const goalStories = stories[goal.id] ?? [];
        const isOpen = openGoals.has(goal.id);
        return (
          <div key={goal.id} className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <div
              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-800 group"
              onClick={() => onCardClick('goal', goal.id)}
            >
              <button
                onClick={e => { e.stopPropagation(); toggle(goal.id); }}
                className="text-gray-500 hover:text-gray-300 w-4 text-xs shrink-0"
              >
                {isOpen ? '▼' : '▶'}
              </button>
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded shrink-0 ${TYPE_COLORS.goal} bg-blue-900/20`}>
                GOAL-{goal.id.substring(0, 4).toUpperCase()}
              </span>
              <span className="text-sm font-medium text-gray-100 group-hover:text-white flex-1">{goal.title}</span>
              <span className="text-xs text-gray-600 shrink-0">{goalStories.length} stories</span>
              <button
                onClick={e => { e.stopPropagation(); onStatusChange('goal', goal.id, goal.status === 'done' ? 'backlog' : goal.status === 'backlog' ? 'in_progress' : 'done'); }}
                className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[goal.status]}`}
              >
                {goal.status.replace('_', ' ')}
              </button>
            </div>
            {isOpen && (
              <div className="border-t border-gray-800 py-1">
                {goalStories.map(story => (
                  <StoryRow
                    key={story.id}
                    story={story}
                    tasks={tasks[story.id] ?? []}
                    goalTitle={goal.title}
                    onStatusChange={(type, id, s) => onStatusChange(type, id, s)}
                    onClick={(type, id) => onCardClick(type, id)}
                  />
                ))}
                {goalStories.length === 0 && (
                  <p className="text-xs text-gray-700 py-2 px-8">No stories</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
