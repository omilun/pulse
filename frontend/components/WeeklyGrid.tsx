'use client';

import type { Commitment, WeekDay } from '@/lib/types';
import CommitmentRow from './CommitmentRow';
import TaskDayCell from './TaskDayCell';

interface Props {
  commitments: Commitment[];
  weekDays: WeekDay[];
  onEntryToggled: () => void;
  onTaskClick: (id: string) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.getDate().toString();
}

function isToday(iso: string) {
  return iso === new Date().toISOString().slice(0, 10);
}

export default function WeeklyGrid({ commitments, weekDays, onEntryToggled, onTaskClick }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide min-w-[180px]">
              Commitment
            </th>
            {weekDays.map((day, i) => (
              <th
                key={day.date}
                className={`px-2 py-2 text-center min-w-[80px] ${isToday(day.date) ? 'text-indigo-400' : 'text-gray-500'}`}
              >
                <div className="text-xs font-medium uppercase tracking-wide">{DAY_LABELS[i]}</div>
                <div className={`text-lg font-semibold mt-0.5 ${isToday(day.date) ? 'text-indigo-400' : 'text-gray-400'}`}>
                  {formatDate(day.date)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {commitments.filter(c => c.active).map(commitment => (
            <CommitmentRow
              key={commitment.id}
              commitment={commitment}
              weekDays={weekDays}
              onEntryToggled={onEntryToggled}
            />
          ))}

          {/* One-time tasks row */}
          {weekDays.some(d => d.tasks.length > 0) && (
            <tr className="border-b border-gray-800">
              <td className="px-4 py-2">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">One-time</span>
              </td>
              {weekDays.map(day => (
                <TaskDayCell
                  key={day.date}
                  tasks={day.tasks}
                  onTaskClick={onTaskClick}
                />
              ))}
            </tr>
          )}

          {commitments.filter(c => c.active).length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-600">
                No active commitments. Add one with the + button.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
