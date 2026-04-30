'use client';

import type { Goal, Story, Task, LTStatus } from '@/lib/types';

export type KanbanItemType = 'goal' | 'story' | 'task';
export type KanbanItem = Goal | Story | Task;

const STATUS_STYLES: Record<LTStatus, string> = {
  backlog:     'bg-gray-700/60 text-gray-300',
  in_progress: 'bg-amber-900/50 text-amber-300',
  done:        'bg-green-900/50 text-green-300',
};

const STATUS_CYCLE: Record<LTStatus, LTStatus> = {
  backlog:     'in_progress',
  in_progress: 'done',
  done:        'backlog',
};

const TYPE_BADGE: Record<KanbanItemType, string> = {
  goal:  'bg-blue-900/60 text-blue-300',
  story: 'bg-purple-900/60 text-purple-300',
  task:  'bg-green-900/60 text-green-300',
};

const TYPE_PREFIX: Record<KanbanItemType, string> = {
  goal:  'GOAL',
  story: 'STORY',
  task:  'TASK',
};

interface Props {
  item: KanbanItem;
  type: KanbanItemType;
  breadcrumb?: string;
  onStatusChange: (status: LTStatus) => void;
  onClick: () => void;
}

export default function KanbanCard({ item, type, breadcrumb, onStatusChange, onClick }: Props) {
  const shortId = item.id.substring(0, 6).toUpperCase();
  const status = item.status as LTStatus;

  return (
    <div
      className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-indigo-500/50 hover:shadow-md transition-all group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded shrink-0 ${TYPE_BADGE[type]}`}>
          {TYPE_PREFIX[type]}-{shortId}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onStatusChange(STATUS_CYCLE[status]); }}
          className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors shrink-0 ${STATUS_STYLES[status]}`}
        >
          {status.replace('_', ' ')}
        </button>
      </div>
      <p className="text-sm text-gray-100 group-hover:text-white leading-snug line-clamp-2">{item.title}</p>
      {breadcrumb && (
        <p className="text-xs text-gray-500 mt-1.5 truncate">{breadcrumb}</p>
      )}
    </div>
  );
}
