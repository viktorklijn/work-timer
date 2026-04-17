"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, CheckCircle2, History, Trash2, Clock, Copy, X, Circle } from "lucide-react";

type Project = {
  id: string;
  name: string;
  color: string | null;
};

type Entry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  comment: string;
  createdAt: string;
  project?: Project;
};

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
};

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  
  if (h > 0) {
    return [
      String(h).padStart(2, "0"),
      String(m).padStart(2, "0"),
      String(s).padStart(2, "0"),
    ].join(":");
  }
  return [
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ].join(":");
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDurationHHMM(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const LiveClock = ({ sessionStartRef, checkpointRef, isRunning, lastActionTick }: { 
  sessionStartRef: React.MutableRefObject<number | null>;
  checkpointRef: React.MutableRefObject<number | null>;
  isRunning: boolean;
  lastActionTick: number;
}) => {
  const [sessionMs, setSessionMs] = useState(0);
  const [taskMs, setTaskMs] = useState(0);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      if (sessionStartRef.current) setSessionMs(now - sessionStartRef.current);
      else setSessionMs(0);
      if (checkpointRef.current) setTaskMs(now - checkpointRef.current);
      else setTaskMs(0);
    };

    update();
    if (!isRunning) return;

    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [isRunning, sessionStartRef, checkpointRef, lastActionTick]);

  return (
    <>
      <div
        className="font-mono tabular-nums tracking-tighter relative z-10 transition-all duration-700 ease-out"
        style={{
          fontSize: "clamp(5rem, 15vw, 9rem)",
          fontWeight: 400,
          color: isRunning ? "var(--color-brand-primary)" : "var(--color-text-primary)",
          textShadow: isRunning ? "0 4px 32px rgba(116, 97, 232, 0.3)" : "none",
        }}
      >
        {formatTime(sessionMs)}
      </div>
      
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-1/2 -translate-x-1/2 -bottom-6 flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-accent)] animate-pulse shadow-[0_0_8px_rgba(45,196,138,0.6)]" />
            <span className="text-xs font-mono tracking-widest text-[var(--color-brand-accent)] uppercase font-semibold">
              {formatTime(taskMs)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const LogTaskButton = ({ checkpointRef, isRunning, isSaving, comment, onLogTask, lastActionTick }: {
  checkpointRef: React.MutableRefObject<number | null>;
  isRunning: boolean;
  isSaving: boolean;
  comment: string;
  onLogTask: () => void;
  lastActionTick: number;
}) => {
  const [canLog, setCanLog] = useState(false);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const update = () => {
      if (!isRunning || !checkpointRef.current) {
        setCanLog(false);
      } else {
        const elapsed = Date.now() - checkpointRef.current;
        if (elapsed >= 60000) {
          setCanLog(true);
          if (id) {
            clearInterval(id);
            id = null;
          }
        } else {
          setCanLog(false);
        }
      }
    };
    update();
    if (!isRunning) return;
    id = setInterval(update, 1000);
    return () => { if (id) clearInterval(id); };
  }, [isRunning, checkpointRef, lastActionTick]);

  return (
    <button
      onClick={onLogTask}
      disabled={!comment.trim() || isSaving || !canLog}
      className="h-[56px] px-6 bg-[var(--color-brand-primary)] text-white font-medium rounded-xl flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_8px_16px_-4px_rgba(116,97,232,0.4)] disabled:opacity-50 disabled:active:scale-100 flex-1 sm:flex-none justify-center"
    >
      <CheckCircle2 className="w-5 h-5" />
      <span>{!canLog ? "< 1 min" : "Log Task"}</span>
    </button>
  );
};

export default function TimerPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastActionTick, setLastActionTick] = useState(0);
  const [comment, setComment] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const sessionStartRef = useRef<number | null>(null);
  const checkpointRef = useRef<number | null>(null);

  const syncState = (run: boolean, ss: number | null, cs: number | null, c: string, p: string) => {
    if (!run || !ss || !cs) {
      fetch("/api/timer", { method: "DELETE" }).catch(console.error);
    } else {
      fetch("/api/timer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionStart: ss, checkpointStart: cs, comment: c, projectId: p || null })
      }).catch(console.error);
    }
  };

  // Restore state from global database on mount
  useEffect(() => {
    fetch("/api/timer")
      .then(res => res.json())
      .then(parsed => {
        if (parsed && parsed.sessionStart) {
          sessionStartRef.current = new Date(parsed.sessionStart).getTime();
          checkpointRef.current = new Date(parsed.checkpointStart).getTime();
          setComment(parsed.comment || "");
          if (parsed.projectId) setSelectedProjectId(parsed.projectId);
          setIsRunning(true);
        }
      })
      .catch(e => console.error("Failed to fetch global timer state", e))
      .finally(() => setIsHydrated(true));
  }, []);

  // Live polling for cross-device sync
  useEffect(() => {
    if (!isHydrated) return;

    const fetchTimer = () => {
      if (document.hidden) return; // Prevent background memory leaks
      fetch("/api/timer")
        .then((res) => res.json())
        .then((parsed) => {
          if (!parsed && isRunning) {
            // Stopped remotely
            setIsRunning(false);
            setLastActionTick(Date.now());
            sessionStartRef.current = null;
            checkpointRef.current = null;
            setComment("");
          } else if (parsed && parsed.sessionStart) {
            // Started or updated remotely
            const rSession = new Date(parsed.sessionStart).getTime();
            const rCheckpoint = new Date(parsed.checkpointStart).getTime();
            
            if (!isRunning || sessionStartRef.current !== rSession || checkpointRef.current !== rCheckpoint) {
              sessionStartRef.current = rSession;
              checkpointRef.current = rCheckpoint;
              setIsRunning(true);
              
              if (document.activeElement?.tagName !== "INPUT") {
                setComment(parsed.comment || "");
              }
              if (parsed.projectId) setSelectedProjectId(parsed.projectId);
            }
          }
        })
        .catch((e) => console.error("Polling error", e));
    };

    const intervalId = setInterval(fetchTimer, 10000); // 10s relaxed polling
    window.addEventListener("focus", fetchTimer);
    window.addEventListener("visibilitychange", fetchTimer);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", fetchTimer);
      window.removeEventListener("visibilitychange", fetchTimer);
    };
  }, [isHydrated, isRunning]);

  // Auto-sync active state to global api automatically on input edits
  useEffect(() => {
    if (!isHydrated) return;
    if (isRunning && sessionStartRef.current && checkpointRef.current) {
      const timeout = setTimeout(() => {
        syncState(true, sessionStartRef.current, checkpointRef.current, comment, selectedProjectId);
      }, 1000); // 1s debounce
      return () => clearTimeout(timeout);
    }
  }, [isRunning, comment, isHydrated, selectedProjectId]);

  useEffect(() => {
    const today = todayDateString();
    fetch(`/api/entries?from=${today}&to=${today}`)
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch("/api/todos")
      .then((r) => r.json())
      .then((data) => setTodos(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const handleStart = () => {
    const now = Date.now();
    sessionStartRef.current = now;
    checkpointRef.current = now;
    setLastActionTick(now);
    setIsRunning(true);
    syncState(true, now, now, comment, selectedProjectId);
  };

  const saveEntry = useCallback(
    async (text: string, endMs: number): Promise<Entry | null> => {
      if (!checkpointRef.current || !text.trim()) return null;
      const durationSeconds = Math.floor(
        (endMs - checkpointRef.current) / 1000
      );
      if (durationSeconds < 60) return null;

      setIsSaving(true);
      try {
        const res = await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: todayDateString(),
            startTime: new Date(checkpointRef.current).toISOString(),
            endTime: new Date(endMs).toISOString(),
            durationSeconds,
            comment: text.trim(),
            projectId: selectedProjectId || undefined,
          }),
        });
        const entry: Entry = await res.json();
        setEntries((prev) => [entry, ...prev]);
        return entry;
      } catch (e) {
        console.error(e);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [selectedProjectId]
  );

  const handleLogTask = async () => {
    if (!comment.trim() || !isRunning) return;
    const now = Date.now();
    await saveEntry(comment, now);
    checkpointRef.current = now;
    setLastActionTick(now);
    setComment("");
    
    // Synchronously force push the new checkpoint
    syncState(true, sessionStartRef.current, now, "", selectedProjectId);
  };

  const handleStop = async () => {
    const now = Date.now();
    if (comment.trim()) {
      await saveEntry(comment, now);
      setComment("");
    }
    setIsRunning(false);
    setLastActionTick(now);
    sessionStartRef.current = null;
    checkpointRef.current = null;
    syncState(false, null, null, "", "");
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      if (res.ok) {
        const p = await res.json();
        setProjects((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedProjectId(p.id);
        setNewProjectName("");
        setIsCreatingProject(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTodo = async () => {
    if (!newTodo.trim()) return;
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newTodo.trim() }),
      });
      if (res.ok) {
        const todo = await res.json();
        setTodos((prev) => [todo, ...prev]);
        setNewTodo("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTodo = async (id: string, completed: boolean) => {
    try {
      await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: !completed }),
      });
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await fetch("/api/todos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyToSpreadsheet = async () => {
    if (entries.length === 0) return;
    const header = "Date\tProject\tDuration\tTask/Log\n";
    const rows = entries.map(entry => {
      const d = entry.date.split("T")[0];
      const p = entry.project?.name || "Uncategorized";
      const t = formatDurationHHMM(entry.durationSeconds);
      const c = entry.comment.replace(/\t/g, " ").replace(/\n/g, " "); // sanitize for tsv
      return `${d}\t${p}\t${t}\t${c}`;
    }).join("\n");
    
    await navigator.clipboard.writeText(header + rows);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const totalToday = entries.reduce((s, e) => s + e.durationSeconds, 0);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      
      {/* Top Nav */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="px-8 py-6 flex items-center justify-between relative z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-brand-primary)]/10 border border-[var(--color-brand-primary)]/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-[var(--color-brand-primary)]" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-[var(--color-text-primary)]">
            WorkFlow
          </span>
        </div>
        <Link
          href="/history"
          className="glass-pill px-5 py-2.5 flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] group bg-white/50 hover:bg-white border border-[var(--color-text-primary)]/5"
        >
          <History className="w-4 h-4 transition-transform group-hover:-rotate-12" />
          History
        </Link>
      </motion.header>

      {/* Main Timer Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 w-full max-w-2xl mx-auto -mt-10">
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="text-center mb-16 relative"
        >
          {/* Subtle glow behind timer when running */}
          {isRunning && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 bg-[var(--color-brand-primary)]/10 blur-[80px] rounded-full z-0"
            />
          )}

          {/* Project Selector */}
          <div className="flex justify-center mb-6 relative z-20">
            {isCreatingProject ? (
              <div className="flex items-center gap-2 glass-panel bg-white/50 px-3 py-1.5 rounded-full border border-white/80 shadow-sm">
                <input
                  type="text"
                  autoFocus
                  placeholder="New project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                  className="bg-transparent border-none px-2 text-sm font-medium text-[var(--color-text-primary)] focus:outline-none focus:ring-0 w-36 placeholder-[var(--color-text-muted)]"
                />
                <button onClick={handleCreateProject} className="text-[var(--color-brand-primary)] hover:brightness-110 p-1">
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <button onClick={() => { setIsCreatingProject(false); setNewProjectName(""); }} className="text-[var(--color-text-muted)] hover:text-red-500 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative flex items-center">
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    if (e.target.value === "NEW_PROJECT") {
                      setIsCreatingProject(true);
                    } else {
                      setSelectedProjectId(e.target.value);
                    }
                  }}
                  className="appearance-none glass-panel bg-white/50 pl-4 pr-10 py-1.5 rounded-full border border-white/80 shadow-sm text-sm font-medium text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/20 cursor-pointer min-w-[140px]"
                >
                  <option value="">No Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="NEW_PROJECT" className="font-semibold text-[var(--color-brand-primary)]">+ Add New Project</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            )}
          </div>

          <LiveClock 
            sessionStartRef={sessionStartRef} 
            checkpointRef={checkpointRef} 
            isRunning={isRunning} 
            lastActionTick={lastActionTick} 
          />
        </motion.div>

        {/* Input & Controls Panel */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="w-full glass-panel rounded-2xl p-2.5 flex flex-col sm:flex-row gap-2.5 bg-white/70 shadow-sm border border-white/80"
        >
          <div className="flex-1 relative">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isRunning) handleLogTask();
              }}
              placeholder={isRunning ? "What are you working on?" : "Ready to focus?"}
              disabled={!isRunning}
              className="w-full h-full min-h-[56px] bg-transparent border-none px-5 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-0 disabled:opacity-50 text-[15px] font-medium"
            />
          </div>

          <div className="flex gap-2.5">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="h-[56px] px-8 bg-[var(--color-text-primary)] text-white font-semibold rounded-xl flex items-center gap-2 hover:bg-black active:scale-95 transition-all shadow-[0_8px_16px_-4px_rgba(23,24,33,0.3)] w-full sm:w-auto justify-center"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Focus</span>
              </button>
            ) : (
              <>
                <LogTaskButton 
                  checkpointRef={checkpointRef} 
                  isRunning={isRunning} 
                  isSaving={isSaving} 
                  comment={comment} 
                  onLogTask={handleLogTask} 
                  lastActionTick={lastActionTick} 
                />
                <button
                  onClick={handleStop}
                  className="h-[56px] w-[56px] bg-white border border-[var(--color-text-muted)]/20 text-[var(--color-text-secondary)] hover:text-[var(--color-brand-secondary)] hover:border-[var(--color-brand-secondary)]/30 rounded-xl flex items-center justify-center hover:bg-white active:scale-95 transition-all shadow-sm shrink-0"
                  aria-label="Stop Timer"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      </main>

      {/* Today's Log */}
      <AnimatePresence>
        {entries.length > 0 && (
          <motion.section
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl mx-auto px-6 pb-12 relative z-10"
          >
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Today&apos;s Progress</h2>
                <span className="text-sm font-mono text-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 px-3 py-1 rounded-full font-medium">
                  {formatDuration(totalToday)}
                </span>
              </div>
              <button
                onClick={handleCopyToSpreadsheet}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 transition-colors"
                title="Copy to Spreadsheet"
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {isCopied ? "Copied!" : "Copy to Sheets"}
              </button>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-[var(--color-text-primary)]/5 bg-white/60">
              <AnimatePresence initial={false}>
                {entries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ height: 0, opacity: 0, backgroundColor: "rgba(255,255,255,0.8)" }}
                    animate={{ height: "auto", opacity: 1, backgroundColor: "rgba(255,255,255,0)" }}
                    exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="group"
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="w-16 shrink-0">
                        <span className="text-xs font-mono text-[var(--color-text-secondary)] bg-[var(--color-text-primary)]/5 px-2.5 py-1.5 rounded-md font-medium">
                          {formatDuration(entry.durationSeconds)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <span className="text-[15px] font-medium text-[var(--color-text-primary)] truncate block">
                          {entry.comment}
                        </span>
                        {entry.project && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5 mt-1 bg-[var(--color-text-primary)]/5 border border-[var(--color-text-primary)]/10 px-2 py-0.5 rounded-md w-fit shadow-sm">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: entry.project.color || 'var(--color-brand-primary)' }}
                            />
                            {entry.project.name}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-brand-secondary)] hover:bg-[var(--color-brand-secondary)]/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Todo List */}
      <motion.section
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="w-full max-w-2xl mx-auto px-6 pb-12 relative z-10"
      >
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Todo</h2>
          {todos.filter(t => !t.completed).length > 0 && (
            <span className="text-sm font-mono text-[var(--color-brand-accent)] bg-[var(--color-brand-accent)]/10 px-3 py-1 rounded-full font-medium">
              {todos.filter(t => !t.completed).length} remaining
            </span>
          )}
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden bg-white/60">
          {/* Add todo input */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-text-primary)]/5">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTodo()}
              placeholder="Add a todo..."
              className="flex-1 bg-transparent border-none text-[15px] font-medium text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-0"
            />
            <button
              onClick={handleCreateTodo}
              disabled={!newTodo.trim()}
              className="text-[var(--color-brand-primary)] hover:brightness-110 disabled:opacity-40 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </div>

          {/* Todo list */}
          {todos.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">No todos yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-text-primary)]/5">
              {todos.map((todo) => (
                <div key={todo.id} className="group flex items-center gap-3 px-5 py-3 hover:bg-black/5 transition-colors">
                  <button
                    onClick={() => handleToggleTodo(todo.id, todo.completed)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                      todo.completed
                        ? "bg-[var(--color-brand-accent)] border-[var(--color-brand-accent)]"
                        : "border-[var(--color-text-muted)] hover:border-[var(--color-brand-accent)]"
                    }`}
                  >
                    {todo.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                    {!todo.completed && <Circle className="w-3.5 h-3.5 text-transparent group-hover:text-[var(--color-brand-accent)]" />}
                  </button>
                  <span className={`flex-1 text-[15px] font-medium ${todo.completed ? "line-through text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]"}`}>
                    {todo.text}
                  </span>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-brand-secondary)] hover:bg-[var(--color-brand-secondary)]/10 transition-all opacity-0 group-hover:opacity-100"
                    aria-label="Delete todo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}
