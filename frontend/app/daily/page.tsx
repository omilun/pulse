'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import NavTabs from '@/components/NavTabs';
import WeeklyGrid from '@/components/WeeklyGrid';
import ItemDrawer, { type DrawerItem } from '@/components/ItemDrawer';
import { api } from '@/lib/api';
import type { Commitment, OneTimeTask, WeekDay, DailyStatus } from '@/lib/types';

type AddType = 'commitment' | 'ot-task';

interface NewCommitment {
  title: string; description: string; frequency: string; time_of_day: string;
}
interface NewOTTask {
  title: string; description: string; scheduled_at: string;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const STATUS_STYLES: Record<DailyStatus, string> = {
  backlog:   'bg-gray-700/60 text-gray-300',
  scheduled: 'bg-amber-900/50 text-amber-300',
  done:      'bg-green-900/50 text-green-300',
};

export default function DailyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [weekDays, setWeekDays]     = useState<WeekDay[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [otTasks, setOtTasks]       = useState<OneTimeTask[]>([]);
  const [loading, setLoading]       = useState(true);
  const [drawerItem, setDrawerItem] = useState<DrawerItem | null>(null);

  // Add modal state
  const [showAddModal, setShowAddModal]   = useState(false);
  const [addType, setAddType]             = useState<AddType>('commitment');
  const [newComm, setNewComm]             = useState<NewCommitment>({ title: '', description: '', frequency: 'daily', time_of_day: '' });
  const [newOT, setNewOT]                 = useState<NewOTTask>({ title: '', description: '', scheduled_at: '' });
  const [creating, setCreating]           = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [days, comms, tasks] = await Promise.all([
        api.daily.week(weekStart),
        api.daily.commitments.list(),
        api.daily.tasks.list(),
      ]);
      setWeekDays(days);
      setCommitments(comms);
      setOtTasks(tasks);
    } catch (err) {
      console.error('Failed to load daily data', err);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const goToday = () => setWeekStart(getWeekStart(new Date()));

  const weekLabel = () => {
    if (weekDays.length === 0) return '';
    const start = new Date(weekDays[0].date + 'T00:00:00');
    const end   = new Date(weekDays[weekDays.length - 1].date + 'T00:00:00');
    return `${start.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const handleOTTaskClick = (id: string) => {
    const task = otTasks.find(t => t.id === id) ??
      weekDays.flatMap(d => d.tasks).find(t => t.id === id);
    if (task) setDrawerItem({ type: 'ot-task', item: task });
  };

  const handleCommitmentClick = (id: string) => {
    const comm = commitments.find(c => c.id === id);
    if (comm) setDrawerItem({ type: 'commitment', item: comm });
  };

  const handleCreateCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.daily.commitments.create(newComm);
      setShowAddModal(false);
      setNewComm({ title: '', description: '', frequency: 'daily', time_of_day: '' });
      await loadData();
    } finally { setCreating(false); }
  };

  const handleCreateOTTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.daily.tasks.create(newOT);
      setShowAddModal(false);
      setNewOT({ title: '', description: '', scheduled_at: '' });
      await loadData();
    } finally { setCreating(false); }
  };

  const handleStatusChange = async (id: string, status: DailyStatus) => {
    try {
      await api.daily.tasks.update(id, { status });
      await loadData();
    } catch (err) {
      console.error('Status change failed', err);
    }
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

  // Group OT tasks by status for mini-kanban
  const otByStatus = {
    backlog:   otTasks.filter(t => t.status === 'backlog'),
    scheduled: otTasks.filter(t => t.status === 'scheduled'),
    done:      otTasks.filter(t => t.status === 'done'),
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      <NavTabs />

      {/* Week navigation */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-6 py-2.5 flex items-center gap-3 shrink-0">
        <button onClick={prevWeek} className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors text-sm">← Prev</button>
        <button onClick={goToday} className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1 rounded border border-indigo-900 hover:bg-indigo-900/30 transition-colors">Today</button>
        <button onClick={nextWeek} className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors text-sm">Next →</button>
        <span className="text-sm text-gray-400 font-medium ml-2">{weekLabel()}</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto p-6 space-y-8">
        {/* Weekly Grid */}
        <section>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <WeeklyGrid
              commitments={commitments}
              weekDays={weekDays}
              onEntryToggled={loadData}
              onTaskClick={handleOTTaskClick}
            />
          </div>
        </section>

        {/* One-time Tasks mini-kanban */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">One-time Tasks</h2>
          <div className="grid grid-cols-3 gap-4">
            {(['backlog', 'scheduled', 'done'] as DailyStatus[]).map(status => (
              <div key={status} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-800">
                  <span className="text-sm font-medium text-gray-300 capitalize">{status}</span>
                  <span className="text-xs text-gray-600 ml-auto">{otByStatus[status].length}</span>
                </div>
                <div className="space-y-2">
                  {otByStatus[status].map(task => (
                    <div
                      key={task.id}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-indigo-500/50 transition-all group"
                      onClick={() => handleOTTaskClick(task.id)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 shrink-0">
                          OT-{task.id.substring(0, 4).toUpperCase()}
                        </span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const next: DailyStatus = status === 'backlog' ? 'scheduled' : status === 'scheduled' ? 'done' : 'backlog';
                            handleStatusChange(task.id, next);
                          }}
                          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[status]}`}
                        >
                          {status}
                        </button>
                      </div>
                      <p className="text-sm text-gray-200 group-hover:text-white line-clamp-2">{task.title}</p>
                      {task.scheduled_at && (
                        <p className="text-xs text-gray-600 mt-1">{new Date(task.scheduled_at + 'T00:00:00').toLocaleDateString()}</p>
                      )}
                    </div>
                  ))}
                  {otByStatus[status].length === 0 && (
                    <p className="text-xs text-gray-700 text-center py-4">Empty</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Commitments list */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">All Commitments</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {commitments.map(c => (
              <div
                key={c.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-all"
                onClick={() => handleCommitmentClick(c.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-orange-900/60 text-orange-300 shrink-0">
                    COMM-{c.id.substring(0, 4).toUpperCase()}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${c.active ? 'bg-green-900/50 text-green-300' : 'bg-gray-700/60 text-gray-400'}`}>
                    {c.active ? 'active' : 'inactive'}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-200">{c.title}</p>
                <p className="text-xs text-gray-500 mt-1">{c.frequency} · {c.time_of_day}</p>
              </div>
            ))}
            {commitments.length === 0 && (
              <p className="text-sm text-gray-600 col-span-full text-center py-4">No commitments yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Floating + button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white text-2xl transition-colors z-30"
        title="Add commitment or task"
      >
        +
      </button>

      {/* Item Drawer */}
      <ItemDrawer
        drawerItem={drawerItem}
        onClose={() => setDrawerItem(null)}
        onSaved={loadData}
      />

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Add New</h2>

            {/* Type toggle */}
            <div className="flex gap-1 p-1 bg-gray-800 rounded-lg mb-4">
              {(['commitment', 'ot-task'] as AddType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setAddType(t)}
                  className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
                    addType === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t === 'commitment' ? 'Commitment' : 'One-time Task'}
                </button>
              ))}
            </div>

            {addType === 'commitment' ? (
              <form onSubmit={handleCreateCommitment} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Title</label>
                  <input value={newComm.title} onChange={e => setNewComm(c => ({ ...c, title: e.target.value }))} required autoFocus
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Frequency</label>
                    <select value={newComm.frequency} onChange={e => setNewComm(c => ({ ...c, frequency: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="daily">Daily</option>
                      <option value="weekdays">Weekdays</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Time</label>
                    <input type="time" value={newComm.time_of_day} onChange={e => setNewComm(c => ({ ...c, time_of_day: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">Cancel</button>
                  <button type="submit" disabled={creating} className="flex-1 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors">
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateOTTask} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Title</label>
                  <input value={newOT.title} onChange={e => setNewOT(t => ({ ...t, title: e.target.value }))} required autoFocus
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Description</label>
                  <textarea value={newOT.description} onChange={e => setNewOT(t => ({ ...t, description: e.target.value }))} rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Scheduled Date</label>
                  <input type="date" value={newOT.scheduled_at} onChange={e => setNewOT(t => ({ ...t, scheduled_at: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">Cancel</button>
                  <button type="submit" disabled={creating} className="flex-1 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors">
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
