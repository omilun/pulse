'use client';

import { useState, useEffect } from 'react';
import type { Goal, Story, Task, Commitment, OneTimeTask, LTStatus, DailyStatus } from '@/lib/types';
import { api } from '@/lib/api';

export type DrawerItem =
  | { type: 'goal';       item: Goal }
  | { type: 'story';      item: Story;   goal?: Goal }
  | { type: 'task';       item: Task;    story?: Story; goal?: Goal }
  | { type: 'commitment'; item: Commitment }
  | { type: 'ot-task';    item: OneTimeTask };

interface Props {
  drawerItem: DrawerItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const LT_STATUSES: LTStatus[]    = ['backlog', 'in_progress', 'done'];
const DAILY_STATUSES: DailyStatus[] = ['backlog', 'scheduled', 'done'];

const TYPE_INFO: Record<DrawerItem['type'], { prefix: string; color: string }> = {
  goal:       { prefix: 'GOAL',  color: 'bg-blue-900/60 text-blue-300' },
  story:      { prefix: 'STORY', color: 'bg-purple-900/60 text-purple-300' },
  task:       { prefix: 'TASK',  color: 'bg-green-900/60 text-green-300' },
  commitment: { prefix: 'COMM',  color: 'bg-orange-900/60 text-orange-300' },
  'ot-task':  { prefix: 'OT',    color: 'bg-red-900/60 text-red-300' },
};

export default function ItemDrawer({ drawerItem, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!drawerItem) return;
    const it = drawerItem.item;
    setTitle(it.title);
    setDescription(it.description ?? '');
    setStatus((it as Goal).status ?? '');
    if (drawerItem.type === 'ot-task') {
      setStartDate((it as OneTimeTask).scheduled_at ?? '');
      setDueDate('');
    } else if (drawerItem.type !== 'commitment') {
      setStartDate((it as Goal).start_date ?? '');
      setDueDate((it as Goal).due_date ?? '');
    } else {
      setStartDate('');
      setDueDate('');
    }
    setSaving(false);
  }, [drawerItem]);

  if (!drawerItem) return null;

  const typeInfo = TYPE_INFO[drawerItem.type];
  const shortId = String(drawerItem.item.id).substring(0, 6).toUpperCase();
  const isLT = ['goal', 'story', 'task'].includes(drawerItem.type);
  const statuses = isLT ? LT_STATUSES : DAILY_STATUSES;

  const breadcrumb = (() => {
    if (drawerItem.type === 'story') return drawerItem.goal?.title ?? '';
    if (drawerItem.type === 'task')  return [drawerItem.goal?.title, drawerItem.story?.title].filter(Boolean).join(' › ');
    return '';
  })();

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      switch (drawerItem.type) {
        case 'goal':       await api.lt.goals.update(drawerItem.item.id, patch);        break;
        case 'story':      await api.lt.stories.update(drawerItem.item.id, patch);      break;
        case 'task':       await api.lt.tasks.update(drawerItem.item.id, patch);        break;
        case 'commitment': await api.daily.commitments.update(drawerItem.item.id, patch); break;
        case 'ot-task':    await api.daily.tasks.update(drawerItem.item.id, patch);     break;
      }
      onSaved();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete this ${drawerItem.type}?`)) return;
    try {
      switch (drawerItem.type) {
        case 'goal':       await api.lt.goals.delete(drawerItem.item.id);        break;
        case 'story':      await api.lt.stories.delete(drawerItem.item.id);      break;
        case 'task':       await api.lt.tasks.delete(drawerItem.item.id);        break;
        case 'commitment': await api.daily.commitments.delete(drawerItem.item.id); break;
        case 'ot-task':    await api.daily.tasks.delete(drawerItem.item.id);     break;
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-800 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded shrink-0 ${typeInfo.color}`}>
              {typeInfo.prefix}-{shortId}
            </span>
            {saving && <span className="text-xs text-gray-500 truncate">Saving…</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors ml-2 shrink-0">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {breadcrumb && (
            <p className="text-xs text-gray-500 bg-gray-800/50 rounded px-2 py-1">{breadcrumb}</p>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => save({ title })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={() => save({ description })}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Status</label>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); save({ status: e.target.value }); }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {(isLT || drawerItem.type === 'ot-task') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">
                  {drawerItem.type === 'ot-task' ? 'Scheduled' : 'Start Date'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  onBlur={() => save(drawerItem.type === 'ot-task' ? { scheduled_at: startDate } : { start_date: startDate })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {isLT && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    onBlur={() => save({ due_date: dueDate })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs text-gray-600">
              Created: {new Date(drawerItem.item.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-800 shrink-0">
          <button
            onClick={handleDelete}
            className="w-full text-sm text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700 rounded-lg py-2 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  );
}
