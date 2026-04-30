'use client';

import type { OneTimeTask } from '@/lib/types';

interface Props {
  tasks: OneTimeTask[];
  onTaskClick: (id: string) => void;
}

const STATUS_DOTS: Record<string, string> = {
  backlog:   'bg-gray-500',
  scheduled: 'bg-amber-400',
  done:      'bg-green-400',
};

export default function TaskDayCell({ tasks, onTaskClick }: Props) {
  if (tasks.length === 0) return <td className="px-2 py-3 min-w-[80px]" />;

  return (
    <td className="px-2 py-2 min-w-[80px] align-top">
      <div className="flex flex-col gap-1">
        {tasks.map(task => (
          <button
            key={task.id}
            onClick={() => onTaskClick(task.id)}
            className="flex items-center gap-1.5 text-left group"
            title={task.title}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOTS[task.status] ?? 'bg-gray-500'}`} />
            <span className="text-xs text-gray-400 group-hover:text-white truncate max-w-[72px]">
              {task.title}
            </span>
          </button>
        ))}
      </div>
    </td>
  );
}
