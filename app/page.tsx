"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, CheckCircle2, History, Trash2, Clock, Copy } from "lucide-react";

type Entry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  comment: string;
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

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TimerPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [sessionDisplayMs, setSessionDisplayMs] = useState(0);
  const [taskDisplayMs, setTaskDisplayMs] = useState(0);
  const [comment, setComment] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const sessionStartRef = useRef<number | null>(null);
  const checkpointRef = useRef<number | null>(null);

  // Restore state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("work-timer-active");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isRunning) {
          sessionStartRef.current = parsed.sessionStart;
          checkpointRef.current = parsed.checkpointStart;
          setComment(parsed.comment || "");
          setIsRunning(true);
        }
      }
    } catch (e) {
      console.error("Failed to parse saved timer state", e);
    }
    setIsHydrated(true);
  }, []);

  // Save current active state to localStorage automatically
  useEffect(() => {
    if (!isHydrated) return;
    if (isRunning) {
      localStorage.setItem("work-timer-active", JSON.stringify({
        isRunning: true,
        sessionStart: sessionStartRef.current,
        checkpointStart: checkpointRef.current,
        comment
      }));
    } else {
      localStorage.removeItem("work-timer-active");
    }
  }, [isRunning, comment, isHydrated]);

  useEffect(() => {
    const today = todayDateString();
    fetch(`/api/entries?from=${today}&to=${today}`)
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      const now = Date.now();
      if (sessionStartRef.current)
        setSessionDisplayMs(now - sessionStartRef.current);
      if (checkpointRef.current)
        setTaskDisplayMs(now - checkpointRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const handleStart = () => {
    const now = Date.now();
    sessionStartRef.current = now;
    checkpointRef.current = now;
    setSessionDisplayMs(0);
    setTaskDisplayMs(0);
    setIsRunning(true);
  };

  const saveEntry = useCallback(
    async (text: string, endMs: number): Promise<Entry | null> => {
      if (!checkpointRef.current || !text.trim()) return null;
      const durationSeconds = Math.floor(
        (endMs - checkpointRef.current) / 1000
      );
      if (durationSeconds < 1) return null;

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
    []
  );

  const handleLogTask = async () => {
    if (!comment.trim() || !isRunning) return;
    const now = Date.now();
    await saveEntry(comment, now);
    checkpointRef.current = now;
    setTaskDisplayMs(0);
    setComment("");
    
    // Manually force an update to localStorage right after logging so the new checkpoint is saved
    localStorage.setItem("work-timer-active", JSON.stringify({
      isRunning: true,
      sessionStart: sessionStartRef.current,
      checkpointStart: now,
      comment: ""
    }));
  };

  const handleStop = async () => {
    const now = Date.now();
    if (comment.trim()) {
      await saveEntry(comment, now);
      setComment("");
    }
    setIsRunning(false);
    setSessionDisplayMs(0);
    setTaskDisplayMs(0);
    sessionStartRef.current = null;
    checkpointRef.current = null;
    localStorage.removeItem("work-timer-active");
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleCopyToSpreadsheet = async () => {
    if (entries.length === 0) return;
    const header = "Date\tTime (hrs mins)\tTask/Log\n";
    const rows = entries.map(entry => {
      const d = entry.date.split("T")[0];
      const t = formatDuration(entry.durationSeconds);
      const c = entry.comment.replace(/\t/g, " ").replace(/\n/g, " "); // sanitize for tsv
      return `${d}\t${t}\t${c}`;
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

          <div
            className="font-mono tabular-nums tracking-tighter relative z-10 transition-all duration-700 ease-out"
            style={{
              fontSize: "clamp(5rem, 15vw, 9rem)",
              fontWeight: 400,
              color: isRunning ? "var(--color-brand-primary)" : "var(--color-text-primary)",
              textShadow: isRunning ? "0 4px 32px rgba(116, 97, 232, 0.3)" : "none",
            }}
          >
            {formatTime(sessionDisplayMs)}
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
                  {formatTime(taskDisplayMs)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
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
                <button
                  onClick={handleLogTask}
                  disabled={!comment.trim() || isSaving}
                  className="h-[56px] px-6 bg-[var(--color-brand-primary)] text-white font-medium rounded-xl flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_8px_16px_-4px_rgba(116,97,232,0.4)] disabled:opacity-50 disabled:active:scale-100 flex-1 sm:flex-none justify-center"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Log Task</span>
                </button>
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
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Today's Progress</h2>
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
                      <span className="text-[15px] font-medium text-[var(--color-text-primary)] flex-1 truncate">
                        {entry.comment}
                      </span>
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
    </div>
  );
}
