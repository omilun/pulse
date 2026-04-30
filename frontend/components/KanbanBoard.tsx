'use client';

import { useState } from 'react';
import type { Goal, Story, Task, LTStatus } from '@/lib/types';
import KanbanCard from './KanbanCard';

interface Props {
  goals: Goal[];
  stories: Record<string, Story[]>;
  tasks: Record<string, Task[]>;
  onStatusChange: (type: 'goal' | 'story' | 'task', id: string, status: LTStatus) => void;
  onCardClick: (type: 'goal' | 'story' | 'task', id: string) => void;
  onCreateStory: (goalId: string) => void;
  onCreateTask: (storyId: string) => void;
}

const COLUMNS: { status: LTStatus; label: string; dot: string }[] = [
  { status: 'backlog',     label: 'Backlog',      dot: 'bg-gray-500' },
  { status: 'in_progress', label: 'In Progress',  dot: 'bg-amber-400' },
  { status: 'done',        label: 'Done',         dot: 'bg-green-400' },
];

export default function KanbanBoard({
  goals, stories, tasks,
  onStatusChange, onCardClick, onCreateStory, onCreateTask,
}: Props) {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());

  const toggleGoal = (id: string) => setExpandedGoals(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleStory = (id: string) => setExpandedStories(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="grid grid-cols-3 gap-4 h-full min-h-0">
      {COLUMNS.map(col => {
        const colGoals = goals.filter(g => g.status === col.status);
        return (
          <div key={col.status} className="flex flex-col gap-2 min-h-0">
            {/* Column header */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-800 shrink-0">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <span className="text-sm font-semibold text-gray-300">{col.label}</span>
              <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-full ml-auto">
                {colGoals.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 overflow-y-auto pb-2">
              {colGoals.map(goal => {
                const goalStories = stories[goal.id] ?? [];
                const isGoalExpanded = expandedGoals.has(goal.id);

                return (
                  <div key={goal.id}>
                    <div className="flex items-start gap-1">
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="mt-3.5 text-gray-600 hover:text-gray-400 shrink-0 w-4 text-xs"
                        title={isGoalExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isGoalExpanded ? '▼' : '▶'}
                      </button>
                      <div className="flex-1 min-w-0">
                        <KanbanCard
                          item={goal}
                          type="goal"
                          onStatusChange={s => onStatusChange('goal', goal.id, s)}
                          onClick={() => onCardClick('goal', goal.id)}
                        />
                      </div>
                    </div>

                    {isGoalExpanded && (
                      <div className="ml-5 mt-1.5 flex flex-col gap-1.5 border-l-2 border-gray-800 pl-2">
                        {goalStories.map(story => {
                          const storyTasks = tasks[story.id] ?? [];
                          const isStoryExpanded = expandedStories.has(story.id);

                          return (
                            <div key={story.id}>
                              <div className="flex items-start gap-1">
                                <button
                                  onClick={() => toggleStory(story.id)}
                                  className="mt-3.5 text-gray-600 hover:text-gray-400 shrink-0 w-4 text-xs"
                                >
                                  {isStoryExpanded ? '▼' : '▶'}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <KanbanCard
                                    item={story}
                                    type="story"
                                    breadcrumb={goal.title}
                                    onStatusChange={s => onStatusChange('story', story.id, s)}
                                    onClick={() => onCardClick('story', story.id)}
                                  />
                                </div>
                              </div>

                              {isStoryExpanded && (
                                <div className="ml-5 mt-1 flex flex-col gap-1 border-l-2 border-gray-800/60 pl-2">
                                  {storyTasks.map(task => (
                                    <KanbanCard
                                      key={task.id}
                                      item={task}
                                      type="task"
                                      breadcrumb={`${goal.title} › ${story.title}`}
                                      onStatusChange={s => onStatusChange('task', task.id, s)}
                                      onClick={() => onCardClick('task', task.id)}
                                    />
                                  ))}
                                  <button
                                    onClick={() => onCreateTask(story.id)}
                                    className="text-xs text-gray-600 hover:text-indigo-400 text-left py-1 px-2 rounded hover:bg-gray-800 transition-colors"
                                  >
                                    + Add task
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <button
                          onClick={() => onCreateStory(goal.id)}
                          className="text-xs text-gray-600 hover:text-indigo-400 text-left py-1 px-2 rounded hover:bg-gray-800 transition-colors"
                        >
                          + Add story
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {colGoals.length === 0 && (
                <div className="text-xs text-gray-700 text-center py-8 border border-dashed border-gray-800 rounded-lg">
                  No goals
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
