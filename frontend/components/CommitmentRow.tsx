'use client';

import type { Commitment, DailyEntry, WeekDay } from '@/lib/types';
import { api } from '@/lib/api';

interface Props {
  commitment: Commitment;
  weekDays: WeekDay[];
  onEntryToggled: () => void;
}

export default function CommitmentRow({ commitment, weekDays, onEntryToggled }: Props) {
  const handleToggle = async (entry: DailyEntry) => {
    try {
      await api.daily.markEntry(entry.id, !entry.done);
      onEntryToggled();
    } catch (err) {
      console.error('Toggle failed', err);
    }
  };

  const FREQ_LABELS: Record<string, string> = { daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly' };

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/30">
      {/* Commitment info */}
      <td className="px-4 py-3 min-w-[180px]">
        <div className="text-sm font-medium text-gray-200 truncate max-w-[170px]">{commitment.title}</div>
        <div className="flex gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{FREQ_LABELS[commitment.frequency]}</span>
          {commitment.time_of_day && (
            <span className="text-xs text-gray-600">{commitment.time_of_day}</span>
          )}
        </div>
      </td>

      {/* 7 day cells */}
      {weekDays.map(day => {
        const entry = day.commitments.find(e => e.commitment_id === commitment.id);
        return (
          <td key={day.date} className="px-2 py-3 text-center">
            {entry ? (
              <button
                onClick={() => handleToggle(entry)}
                className={`w-7 h-7 rounded-md border transition-all flex items-center justify-center mx-auto ${
                  entry.done
                    ? 'bg-green-600 border-green-500 text-white'
                    : 'bg-gray-800 border-gray-700 hover:border-indigo-500 text-transparent hover:text-gray-600'
                }`}
                title={entry.done ? 'Mark undone' : 'Mark done'}
              >
                ✓
              </button>
            ) : (
              <div className="w-7 h-7 rounded-md border border-gray-800/50 mx-auto opacity-30" />
            )}
          </td>
        );
      })}
    </tr>
  );
}
