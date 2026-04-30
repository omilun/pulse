'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import NavTabs from '@/components/NavTabs';
import KanbanBoard from '@/components/KanbanBoard';
import GoalTree from '@/components/GoalTree';
import Timeline from '@/components/Timeline';
import ItemDrawer, { type DrawerItem } from '@/components/ItemDrawer';
import { api } from '@/lib/api';
import type { Goal, Story, Task, LTStatus } from '@/lib/types';

type View = 'kanban' | 'timeline' | 'tree';

interface NewGoalForm { title: string; description: string; status: LTStatus; }
interface NewStoryForm { title: string; description: string; goalId: string; }
interface NewTaskForm  { title: string; description: string; storyId: string; }

export default function LongtermPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [goals, setGoals]   = useState<Goal[]>([]);
  const [stories, setStories] = useState<Record<string, Story[]>>({});
  const [tasks, setTasks]   = useState<Record<string, Task[]>>({});
  const [view, setView]     = useState<View>('kanban');
  const [drawerItem, setDrawerItem] = useState<DrawerItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Create modals
  const [showGoalModal, setShowGoalModal]   = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showTaskModal, setShowTaskModal]   = useState(false);
  const [newGoal, setNewGoal]   = useState<NewGoalForm>({ title: '', description: '', status: 'backlog' });
  const [newStory, setNewStory] = useState<NewStoryForm>({ title: '', description: '', goalId: '' });
  const [newTask, setNewTask]   = useState<NewTaskForm>({ title: '', description: '', storyId: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const goalList = await api.lt.goals.list();

      const storyResults = await Promise.all(
        goalList.map(g => api.lt.stories.listByGoal(g.id).catch((): Story[] => []))
      );
      const newStories: Record<string, Story[]> = {};
      goalList.forEach((g, i) => { newStories[g.id] = storyResults[i]; });

      const allStories = storyResults.flat();
      const taskResults = await Promise.all(
        allStories.map(s => api.lt.tasks.listByStory(s.id).catch((): Task[] => []))
      );
      const newTasks: Record<string, Task[]> = {};
      allStories.forEach((s, i) => { newTasks[s.id] = taskResults[i]; });

      setGoals(goalList);
      setStories(newStories);
      setTasks(newTasks);
    } catch (err) {
      console.error('Failed to load longterm data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const handleStatusChange = async (type: 'goal' | 'story' | 'task', id: string, status: LTStatus) => {
    try {
      if (type === 'goal')  await api.lt.goals.update(id, { status });
      if (type === 'story') await api.lt.stories.update(id, { status });
      if (type === 'task')  await api.lt.tasks.update(id, { status });
      await loadData();
    } catch (err) {
      console.error('Status update failed', err);
    }
  };

  const handleCardClick = (type: 'goal' | 'story' | 'task', id: string) => {
    if (type === 'goal') {
      const item = goals.find(g => g.id === id);
      if (item) setDrawerItem({ type: 'goal', item });
    } else if (type === 'story') {
      const allStories = Object.values(stories).flat();
      const item = allStories.find(s => s.id === id);
      if (item) {
        const goal = goals.find(g => g.id === item.goal_id);
        setDrawerItem({ type: 'story', item, goal });
      }
    } else {
      const allTasks = Object.values(tasks).flat();
      const item = allTasks.find(t => t.id === id);
      if (item) {
        const allStories = Object.values(stories).flat();
        const story = allStories.find(s => s.id === item.story_id);
        const goal  = goals.find(g => g.id === story?.goal_id);
        setDrawerItem({ type: 'task', item, story, goal });
      }
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.lt.goals.create(newGoal);
      setShowGoalModal(false);
      setNewGoal({ title: '', description: '', status: 'backlog' });
      await loadData();
    } finally { setCreating(false); }
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.lt.stories.create(newStory.goalId, { title: newStory.title, description: newStory.description });
      setShowStoryModal(false);
      setNewStory({ title: '', description: '', goalId: '' });
      await loadData();
    } finally { setCreating(false); }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.lt.tasks.create(newTask.storyId, { title: newTask.title, description: newTask.description });
      setShowTaskModal(false);
      setNewTask({ title: '', description: '', storyId: '' });
      await loadData();
    } finally { setCreating(false); }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-950">
        <NavTabs />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      <NavTabs />

      {/* Sub-nav */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-6 py-2 flex items-center gap-1 shrink-0">
        {(['kanban', 'timeline', 'tree'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors capitalize ${
              view === v ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        {view === 'kanban' && (
          <KanbanBoard
            goals={goals}
            stories={stories}
            tasks={tasks}
            onStatusChange={handleStatusChange}
            onCardClick={handleCardClick}
            onCreateStory={goalId => { setNewStory(s => ({ ...s, goalId })); setShowStoryModal(true); }}
            onCreateTask={storyId => { setNewTask(t => ({ ...t, storyId })); setShowTaskModal(true); }}
          />
        )}
        {view === 'timeline' && (
          <Timeline
            goals={goals}
            stories={stories}
            onGoalClick={id => handleCardClick('goal', id)}
            onStoryClick={id => handleCardClick('story', id)}
          />
        )}
        {view === 'tree' && (
          <GoalTree
            goals={goals}
            stories={stories}
            tasks={tasks}
            onStatusChange={handleStatusChange}
            onCardClick={handleCardClick}
          />
        )}
      </div>

      {/* Floating + button */}
      <button
        onClick={() => setShowGoalModal(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white text-2xl transition-colors z-30"
        title="New Goal"
      >
        +
      </button>

      {/* Item Drawer */}
      <ItemDrawer
        drawerItem={drawerItem}
        onClose={() => setDrawerItem(null)}
        onSaved={loadData}
      />

      {/* Create Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">New Goal</h2>
            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Title</label>
                <input
                  value={newGoal.title}
                  onChange={e => setNewGoal(g => ({ ...g, title: e.target.value }))}
                  required autoFocus
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Description</label>
                <textarea
                  value={newGoal.description}
                  onChange={e => setNewGoal(g => ({ ...g, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Status</label>
                <select
                  value={newGoal.status}
                  onChange={e => setNewGoal(g => ({ ...g, status: e.target.value as LTStatus }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowGoalModal(false)} className="flex-1 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors">
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      {showStoryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">New Story</h2>
            <form onSubmit={handleCreateStory} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Goal</label>
                <select
                  value={newStory.goalId}
                  onChange={e => setNewStory(s => ({ ...s, goalId: e.target.value }))}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a goal…</option>
                  {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Title</label>
                <input
                  value={newStory.title}
                  onChange={e => setNewStory(s => ({ ...s, title: e.target.value }))}
                  required autoFocus
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Description</label>
                <textarea
                  value={newStory.description}
                  onChange={e => setNewStory(s => ({ ...s, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowStoryModal(false)} className="flex-1 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors">
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Story</label>
                <select
                  value={newTask.storyId}
                  onChange={e => setNewTask(t => ({ ...t, storyId: e.target.value }))}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a story…</option>
                  {Object.values(stories).flat().map(s => (
                    <option key={s.id} value={s.id}>
                      {goals.find(g => g.id === s.goal_id)?.title} › {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Title</label>
                <input
                  value={newTask.title}
                  onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                  required autoFocus
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTaskModal(false)} className="flex-1 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors">
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
