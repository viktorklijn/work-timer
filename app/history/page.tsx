"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CalendarDays, Trash2, Copy, CheckCircle2 } from "lucide-react";

type Entry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  comment: string;
  createdAt: string;
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedGroupDate, setCopiedGroupDate] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/entries")
      .then((r) => r.json())
      .then((data) => {
        setEntries(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleCopyToSpreadsheet = async (group: Group) => {
    if (group.entries.length === 0) return;
    const header = "Date\tTime (hrs mins)\tTask/Log\n";
    const rows = group.entries.map(entry => {
      const d = entry.date.split("T")[0];
      const t = formatDuration(entry.durationSeconds);
      const c = entry.comment.replace(/\t/g, " ").replace(/\n/g, " ");
      return `${d}\t${t}\t${c}`;
    }).join("\n");
    
    await navigator.clipboard.writeText(header + rows);
    setCopiedGroupDate(group.dateStr);
    setTimeout(() => setCopiedGroupDate(null), 2000);
  };

  type Group = { dateStr: string; entries: Entry[]; totalSeconds: number };
  const groupsRecord = entries.reduce((acc, entry) => {
    const dStr = entry.date.split("T")[0];
    if (!acc[dStr]) {
      acc[dStr] = { dateStr: dStr, entries: [], totalSeconds: 0 };
    }
    acc[dStr].entries.push(entry);
    acc[dStr].totalSeconds += entry.durationSeconds;
    return acc;
  }, {} as Record<string, Group>);

  const groups = Object.values(groupsRecord);

  const formatDateStr = (ymd: string) => {
    const [y, m, d] = ymd.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <motion.header 
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="px-6 sm:px-12 py-8 flex items-center justify-between relative z-10 w-full max-w-4xl mx-auto"
      >
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="w-10 h-10 glass-pill bg-white flex items-center justify-center text-[var(--color-text-primary)] hover:bg-white/90 group shadow-sm border-[var(--color-text-muted)]/10"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          </Link>
          <h1 className="text-2xl font-light tracking-wide text-[var(--color-text-primary)] flex items-center gap-3">
            <span className="text-gradient font-semibold">Activity Ledger</span>
          </h1>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 px-6 sm:px-12 pb-24 relative z-10 w-full max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex flex-col gap-6 mt-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-panel h-48 rounded-2xl animate-pulse bg-white border-[var(--color-text-muted)]/10" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-[50vh] text-center"
          >
            <div className="w-20 h-20 rounded-full bg-white shadow-sm border border-[var(--color-text-muted)]/10 flex items-center justify-center mb-6">
              <CalendarDays className="w-10 h-10 text-[var(--color-brand-primary)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">No History Yet</h3>
            <p className="text-[var(--color-text-secondary)]">Your logged sessions will appear here.</p>
            <Link href="/" className="mt-8 text-[var(--color-brand-primary)] hover:brightness-90 transition-colors text-sm font-semibold">
              Start your first session →
            </Link>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-10 mt-8"
          >
            {groups.map((group) => (
              <motion.section key={group.dateStr} variants={itemVariants} className="relative">
                {/* Date Header */}
                <div className="sticky top-0 z-20 py-4 mb-4 backdrop-blur-xl bg-[var(--color-bg-base)]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-text-muted)]/10">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {formatDateStr(group.dateStr)}
                    </h2>
                    <span className="text-sm font-mono font-medium text-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 px-3 py-1 rounded-full border border-[var(--color-brand-primary)]/20">
                      {formatDuration(group.totalSeconds)}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleCopyToSpreadsheet(group)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 transition-colors w-fit"
                  >
                    {copiedGroupDate === group.dateStr ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedGroupDate === group.dateStr ? "Copied!" : "Copy to Sheets"}
                  </button>
                </div>

                {/* Day's Entries */}
                <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-[var(--color-text-muted)]/10 bg-white/60 shadow-sm border-[var(--color-text-muted)]/10">
                  <AnimatePresence>
                    {group.entries.map((entry) => (
                      <motion.div
                        key={entry.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="group flex items-start sm:items-center gap-4 px-6 py-5 hover:bg-white transition-colors"
                      >
                        <div className="w-20 shrink-0 pt-0.5 sm:pt-0">
                          <span className="text-xs font-mono font-medium text-[var(--color-text-secondary)] bg-[var(--color-text-primary)]/5 px-2.5 py-1.5 rounded-md">
                            {formatDuration(entry.durationSeconds)}
                          </span>
                        </div>
                        <span className="text-[15px] font-medium text-[var(--color-text-primary)] leading-relaxed flex-1">
                          {entry.comment}
                        </span>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-brand-secondary)] hover:bg-[var(--color-brand-secondary)]/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 transform translate-x-2 group-hover:translate-x-0"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
