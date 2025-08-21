import React, { useEffect, useMemo, useRef, useState } from "react";
import { UserRound, UserCircle } from "lucide-react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

export default function App() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 antialiased selection:bg-indigo-500/30">
      <div className="mx-auto w-full max-w-full px-4 sm:max-w-2xl md:max-w-3xl py-8 sm:px-6 sm:py-12">
        <Header />
        <TaskBoard />
        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Ye sab karna hai
        </h1>

        <p className="text-slate-300/80">
          Add a moment you want to live with me. Complete once, locked forever.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-700/50 px-4 py-2 text-xs sm:text-sm text-slate-200 shadow-inner shadow-black/30 ring-1 ring-white/10">
        <span className="flex items-center gap-2">
          Laddoo <UserRound className="w-6 h-6 text-blue-400" />
        </span>
        <span className="flex items-center gap-2">
          Buddhu <UserCircle className="w-6 h-6 text-pink-400" />
        </span>
      </div>
    </div>
  );
}

const STORAGE_KEY = "beautiful-permanent-tasklist:v1";

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {}
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function TaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [queryText, setQueryText] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const inputRef = useRef(null);

  // 🔹 Real-time Firestore listener
  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedTasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(updatedTasks);
    });
    return () => unsubscribe();
  }, []);

  // 🔹 Add task
  const addTask = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await addDoc(collection(db, "tasks"), {
      text: trimmed,
      createdAt: Date.now(),
      completedAt: null,
    });
  };

  // 🔹 Complete task
  const completeTask = async (id) => {
    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, { completedAt: Date.now() });
  };

  // 🔹 Remove task
  const removeTask = async (id) => {
    const taskRef = doc(db, "tasks", id);
    await deleteDoc(taskRef);
  };

  // 🔹 Move up/down locally (optional, does not affect Firestore)
  const move = (id, dir) => {
    setTasks((prev) => {
      const i = prev.findIndex((t) => t.id === id);
      if (i === -1) return prev;
      const j =
        dir === "up" ? Math.max(0, i - 1) : Math.min(prev.length - 1, i + 1);
      if (i === j) return prev;
      const arr = [...prev];
      const [item] = arr.splice(i, 1);
      arr.splice(j, 0, item);
      return arr;
    });
  };

  // 🔹 Stats
  const stats = useMemo(
    () => ({
      total: tasks.length,
      done: tasks.filter((t) => t.completedAt).length,
      active: tasks.filter((t) => !t.completedAt).length,
    }),
    [tasks]
  );

  // 🔹 Filtered tasks
  const activeTasks = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    let out = tasks.filter((t) => !t.completedAt);
    if (q) out = out.filter((t) => t.text.toLowerCase().includes(q));
    return out;
  }, [tasks, queryText]);

  const completedTasks = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    let out = tasks.filter((t) => t.completedAt);
    if (q) out = out.filter((t) => t.text.toLowerCase().includes(q));
    return out;
  }, [tasks, queryText]);

  return (
    <div className="space-y-6">
      {/* Task input */}
      <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Add a moment and press Enter…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addTask(queryText);
                setQueryText("");
                inputRef.current?.focus();
              }
            }}
            className="flex-1 rounded-2xl bg-slate-900/50 px-4 py-3 outline-none ring-1 ring-white/10 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
        <div className="flex items-center gap-2 text-sm">
          <span>{stats.total} total</span>
          <span>{stats.active} active</span>
          <span>{stats.done} done</span>
        </div>
      </div>

      {/* Active tasks */}
      <ul className="divide-y divide-white/10">
        {activeTasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            onComplete={completeTask}
            onRemove={removeTask}
            onMoveUp={() => move(t.id, "up")}
            onMoveDown={() => move(t.id, "down")}
          />
        ))}
      </ul>

      {/* Completed tasks */}
      <button onClick={() => setShowCompleted((s) => !s)}>
        Completed ({completedTasks.length}) {showCompleted ? "▲" : "▼"}
      </button>
      {showCompleted && (
        <ul>
          {completedTasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onComplete={completeTask}
              onRemove={removeTask}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskInput({ onAdd }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  function submit() {
    if (!text.trim()) return;
    onAdd(text);
    setText("");
    inputRef.current?.focus();
  }

  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Add a moment and press Enter…"
          className="flex-1 rounded-2xl bg-slate-900/50 px-4 py-3 outline-none ring-1 ring-white/10 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={submit}
          className="w-full sm:w-auto rounded-2xl bg-indigo-500 px-5 py-3 font-medium shadow-lg shadow-indigo-900/40 transition active:scale-[.98] hover:bg-indigo-400 sm:px-6 sm:py-3 "
        >
          Add
        </button>
      </div>
    </div>
  );
}

function TaskRow({ task, onComplete, onRemove, onMoveUp, onMoveDown }) {
  const completed = Boolean(task.completedAt);
  return (
    <li>
      <span>{task.text}</span>
      {!completed && (
        <button onClick={() => onComplete(task.id)}>Complete</button>
      )}
      <button onClick={() => onRemove(task.id)}>Delete</button>
      <button onClick={onMoveUp}>Up</button>
      <button onClick={onMoveDown}>Down</button>
    </li>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-1 text-xs text-slate-300 ring-1 ring-white/10">
      {children}
    </span>
  );
}

function IconButton({ children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-lg p-2 text-slate-300 ring-1 ring-white/10 hover:bg-white/10 hover:text-white active:scale-[.98]"
    >
      {children}
    </button>
  );
}

function LockIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z" />
    </svg>
  );
}
function TrashIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M9 3a1 1 0 00-1 1v1H4a1 1 0 100 2h16a1 1 0 100-2h-4V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z" />
    </svg>
  );
}
function UpIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 4l-7 7h4v9h6v-9h4z" />
    </svg>
  );
}
function DownIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 20l7-7h-4V4H9v9H5z" />
    </svg>
  );
}

function Footer() {
  return (
    <div className="mt-10 text-center text-xs text-slate-400">
      Built with ❤️ — Stored in your ❤️ (no server).
    </div>
  );
}
