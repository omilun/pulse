"use client";
import { useState, useEffect, useCallback } from "react";

type Entry = {
  id: number;
  content: string;
  category: string;
  created_at: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const CATEGORIES = ["general", "idea", "note", "task", "log"];

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [tab, setTab] = useState<"add" | "all">("add");
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    const res = await fetch(`${API}/entries`);
    const data = await res.json();
    setEntries(data);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    await fetch(`${API}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, category }),
    });
    setContent("");
    await fetchEntries();
    setLoading(false);
    setTab("all");
  }

  async function deleteEntry(id: number) {
    await fetch(`${API}/entries/${id}`, { method: "DELETE" });
    await fetchEntries();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold mb-1 tracking-tight">⚡ pulse</h1>
        <p className="text-zinc-400 mb-8 text-sm">
          Log anything. Forget nothing.
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["add", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {t === "add" ? "Add entry" : `All data (${entries.length})`}
            </button>
          ))}
        </div>

        {/* Add entry */}
        {tab === "add" && (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3
                         text-zinc-100 placeholder-zinc-500 focus:outline-none
                         focus:ring-2 focus:ring-violet-500 resize-none"
            />
            <div className="flex gap-3 items-center">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2
                           text-sm text-zinc-300 focus:outline-none focus:ring-2
                           focus:ring-violet-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={loading}
                className="ml-auto px-6 py-2 bg-violet-600 hover:bg-violet-500
                           disabled:opacity-50 rounded-lg text-sm font-medium
                           transition-colors"
              >
                {loading ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}

        {/* All data */}
        {tab === "all" && (
          <div className="flex flex-col gap-2">
            {entries.length === 0 && (
              <p className="text-zinc-500 text-sm">No entries yet.</p>
            )}
            {entries.map((e) => (
              <div
                key={e.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3
                           flex gap-3 items-start group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-100 text-sm leading-relaxed break-words">
                    {e.content}
                  </p>
                  <div className="flex gap-2 mt-1.5 items-center">
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                      {e.category}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteEntry(e.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors
                             opacity-0 group-hover:opacity-100 text-xs mt-1 shrink-0"
                >
                  delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
