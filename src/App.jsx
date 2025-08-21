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
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-800 to-indigo-900 text-slate-100 antialiased selection:bg-pink-400/30">
      {/* Sparkle Layer */}
      <SparklesBackground />

      <div className="relative z-10 mx-auto w-full max-w-full px-4 sm:max-w-2xl md:max-w-3xl py-8 sm:px-6 sm:py-12">
        <Header />
        <TaskBoard />
        <Footer />
      </div>
    </div>
  );
}

function SparklesBackground() {
  useEffect(() => {
    const canvas = document.getElementById("sparkles");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 1,
      d: Math.random() * 0.5 + 0.2,
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, false);
        ctx.fill();
      });
      update();
    }

    function update() {
      particles.forEach((p) => {
        p.y += p.d;
        if (p.y > canvas.height) {
          p.y = 0;
          p.x = Math.random() * canvas.width;
        }
      });
    }

    const interval = setInterval(draw, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <canvas
      id="sparkles"
      className="absolute inset-0 z-0 pointer-events-none"
    />
  );
}


function Header() {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-4">
        <img
          src="/BG_LOGO.png"
          alt="Logo"
          className="w-14 h-14 object-contain"
        />
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Let's Create Memories
          </h1>
          <p className="text-slate-300/80">
            Add a moment you want to live with me.Once complete, it’s locked forever ✨
          </p>
        </div>
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

function TaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [addText, setAddText] = useState(""); // for adding new tasks
  const [queryText, setQueryText] = useState(""); // for search/filter
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
    setAddText(""); // clear input after adding
    inputRef.current?.focus();
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

  // 🔹 Move up/down locally
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

  // 🔹 Active/Completed Tasks Filtering
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
      {/* Add + Search Inputs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <TaskInput
          text={addText}
          setText={setAddText}
          inputRef={inputRef}
          onAdd={addTask}
        />

        <input
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="Search moments…"
          className="flex-1 rounded-2xl bg-slate-900/50 px-4 py-3 outline-none ring-1 ring-white/10 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
        <div className="flex items-center gap-2 text-sm">
          <Badge>{stats.total} total</Badge>
          <Badge>{stats.active} active</Badge>
          <Badge>{stats.done} done</Badge>
        </div>
      </div>

      {/* Active Tasks */}
      <div className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
        <ul className="divide-y divide-white/10">
          {activeTasks.length === 0 && (
            <li className="p-8 text-center text-slate-400">
              No active moment. Add one above.
            </li>
          )}
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
      </div>

      {/* Completed Tasks Collapsible */}
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10">
        <button
          onClick={() => setShowCompleted((s) => !s)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10"
        >
          Completed Moments ({completedTasks.length})
          <span>{showCompleted ? "▲" : "▼"}</span>
        </button>

        {showCompleted && (
          <ul className="divide-y divide-white/10 bg-slate-900/40">
            {completedTasks.length === 0 && (
              <li className="p-6 text-center text-slate-400">
                Nothing completed yet.
              </li>
            )}
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
    </div>
  );
}

function TaskInput({ text, setText, inputRef, onAdd }) {
  const submit = () => {
    if (!text.trim()) return;
    onAdd(text);
    setText("");
    inputRef.current?.focus();
  };

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
          placeholder="Add a moment…"
          className="flex-1 rounded-2xl bg-slate-900/50 px-4 py-3 outline-none ring-1 ring-white/10 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={submit}
          className="w-full sm:w-auto rounded-2xl bg-indigo-500 px-5 py-3 font-medium shadow-lg shadow-indigo-900/40 transition active:scale-[.98] hover:bg-indigo-400 sm:px-6 sm:py-3"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function TaskRow({ task, onComplete, onRemove, onMoveUp, onMoveDown }) {
  const completed = Boolean(task.completedAt);
  const created = new Date(task.createdAt);
  const completedDate = task.completedAt ? new Date(task.completedAt) : null;

  return (
    <li className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4 hover:bg-white/3">
      <div className="flex items-center gap-3">
        <label
          className={`relative flex h-6 w-6 items-center justify-center rounded-md ring-1 ${
            completed
              ? "bg-green-600/80 ring-green-400/50"
              : "bg-slate-900/60 ring-white/10"
          }`}
        >
          <input
            type="checkbox"
            checked={completed}
            disabled={completed}
            onChange={() => onComplete(task.id)}
            className="peer absolute h-6 w-6 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-sm ${
              completed ? "bg-white" : "bg-transparent"
            }`}
          ></span>
        </label>
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p
            className={`truncate text-base font-medium ${
              completed ? "text-slate-400 line-through" : "text-slate-100"
            }`}
          >
            {task.text}
          </p>
          {completed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-300 ring-1 ring-green-500/30">
              🔒 locked
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          added {created.toLocaleString()}{" "}
          {completedDate && `• completed ${completedDate.toLocaleString()}`}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        <button
          onClick={onMoveUp}
          title="Move up"
          className="rounded-lg p-2 text-slate-300 ring-1 ring-white/10 hover:bg-white/10 hover:text-white active:scale-[.98]"
        >
          ⬆️
        </button>
        <button
          onClick={onMoveDown}
          title="Move down"
          className="rounded-lg p-2 text-slate-300 ring-1 ring-white/10 hover:bg-white/10 hover:text-white active:scale-[.98]"
        >
          ⬇️
        </button>
        <div className="w-px self-stretch bg-white/10" />
        <button
          onClick={() => onRemove(task.id)}
          title="Delete"
          className="rounded-lg p-2 text-slate-300 ring-1 ring-white/10 hover:bg-white/10 hover:text-white active:scale-[.98]"
        >
          🗑️
        </button>
      </div>
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

function Footer() {
  return (
    <div className="mt-10 text-center text-xs text-slate-400">
      Built with ❤️ — Stored in your ❤️
    </div>
  );
}
