'use client';

import type { Goal, Story } from '@/lib/types';

interface Props {
  goals: Goal[];
  stories: Record<string, Story[]>;
  onGoalClick: (id: string) => void;
  onStoryClick: (id: string) => void;
}

function dateToMs(d: string | undefined): number {
  return d ? new Date(d).getTime() : 0;
}

export default function Timeline({ goals, stories, onGoalClick, onStoryClick }: Props) {
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const windowEnd   = new Date(now.getFullYear(), now.getMonth() + 3, 0); // last day of +2 month
  const totalMs = windowEnd.getTime() - windowStart.getTime();

  const toPercent = (d: string | undefined, fallback: number) => {
    const ms = d ? new Date(d).getTime() : fallback;
    return Math.max(0, Math.min(100, ((ms - windowStart.getTime()) / totalMs) * 100));
  };

  // Build week ticks
  const ticks: Date[] = [];
  const t = new Date(windowStart);
  t.setDate(t.getDate() - t.getDay() + 1); // start on Monday
  while (t <= windowEnd) {
    ticks.push(new Date(t));
    t.setDate(t.getDate() + 7);
  }

  const todayPct = toPercent(now.toISOString().slice(0, 10), now.getTime());

  if (goals.length === 0) {
    return <p className="text-gray-600 text-sm text-center py-16">No goals with dates to display.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* X-axis header */}
        <div className="relative h-8 mb-2 ml-48">
          {ticks.map((tick, i) => {
            const pct = toPercent(tick.toISOString().slice(0, 10), tick.getTime());
            return (
              <div
                key={i}
                className="absolute top-0 text-xs text-gray-600 select-none"
                style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
              >
                {tick.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </div>
            );
          })}
        </div>

        {/* Grid + bars */}
        <div className="relative">
          {/* Grid lines */}
          <div className="absolute inset-0 ml-48 pointer-events-none">
            {ticks.map((tick, i) => {
              const pct = toPercent(tick.toISOString().slice(0, 10), tick.getTime());
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-gray-800"
                  style={{ left: `${pct}%` }}
                />
              );
            })}
            {/* Today line */}
            <div
              className="absolute top-0 bottom-0 border-l-2 border-indigo-500/50"
              style={{ left: `${todayPct}%` }}
            />
          </div>

          {/* Rows */}
          <div className="flex flex-col gap-1">
            {goals.map(goal => {
              const goalStories = stories[goal.id] ?? [];
              const gs = toPercent(goal.start_date, windowStart.getTime());
              const ge = toPercent(goal.due_date, windowEnd.getTime());
              const gw = Math.max(1, ge - gs);

              return (
                <div key={goal.id}>
                  {/* Goal row */}
                  <div className="flex items-center h-9 gap-2">
                    <div
                      className="w-48 shrink-0 text-sm text-gray-300 truncate pr-2 cursor-pointer hover:text-indigo-300"
                      onClick={() => onGoalClick(goal.id)}
                    >
                      {goal.title}
                    </div>
                    <div className="flex-1 relative h-full flex items-center">
                      {(goal.start_date || goal.due_date) && (
                        <div
                          className="absolute h-5 bg-blue-600/70 hover:bg-blue-500/80 rounded cursor-pointer transition-colors flex items-center px-2"
                          style={{ left: `${gs}%`, width: `${gw}%` }}
                          onClick={() => onGoalClick(goal.id)}
                          title={`${goal.start_date ?? '?'} → ${goal.due_date ?? '?'}`}
                        >
                          <span className="text-xs text-blue-100 truncate font-medium">{goal.title}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Story rows */}
                  {goalStories.map(story => {
                    const ss = toPercent(story.start_date, windowStart.getTime());
                    const se = toPercent(story.due_date, windowEnd.getTime());
                    const sw = Math.max(0.5, se - ss);
                    return (
                      <div key={story.id} className="flex items-center h-7 gap-2">
                        <div
                          className="w-48 shrink-0 text-xs text-gray-500 truncate pr-2 pl-4 cursor-pointer hover:text-indigo-300"
                          onClick={() => onStoryClick(story.id)}
                        >
                          ↳ {story.title}
                        </div>
                        <div className="flex-1 relative h-full flex items-center">
                          {(story.start_date || story.due_date) && (
                            <div
                              className="absolute h-3.5 bg-purple-600/60 hover:bg-purple-500/70 rounded cursor-pointer transition-colors"
                              style={{ left: `${ss}%`, width: `${sw}%` }}
                              onClick={() => onStoryClick(story.id)}
                              title={`${story.start_date ?? '?'} → ${story.due_date ?? '?'}`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 pt-3 border-t border-gray-800 text-xs text-gray-500 ml-48">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 bg-blue-600/70 rounded" />
            <span>Goal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2 bg-purple-600/60 rounded" />
            <span>Story</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-px h-4 bg-indigo-500/50" />
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
