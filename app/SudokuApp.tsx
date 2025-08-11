"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCcw,
  HelpCircle,
  Pencil,
  Eraser,
  TimerReset,
  Undo2,
  Redo2,
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
} from "lucide-react";

/* ============================================================
   Zenny Sudoku – Single-file React (Tailwind-only)
   - Tema verde/giallo pastello
   - Titolo + polletto
   - Generatore puzzle + difficoltà
   - Numerini (pencil), Gomma, 3 Aiuti, Conflitti
   - Timer: parte alla PRIMA mossa
   - Annulla/Ripeti (undo/redo) – NON ripristina gli aiuti
   - Ricomincia (reset), Rigenera (nuovo puzzle con conferma)
   - Musichetta con Mute nell’angolo + Tutorial accanto
   - Popup conferme e tutorial a 2 pagine
   - Animazione polletto felice alla vittoria
   - Layout aggiornato: top bar (Semplice–Rigenera–Aiuto(n)–Ricomincia),
     poi griglia, poi keypad, poi barra (Numerini–Gomma–Annulla–Ripeti)
   ============================================================ */

/* -----------------------------
   PRNG / Sudoku helpers
----------------------------- */
type Diff = "easy" | "medium" | "hard";
type Board = number[][];

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], rng: () => number = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function cloneBoard(b: Board): Board { return b.map((row) => row.slice()); }
function findEmptyCell(board: Board) {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board[r][c] === 0) return [r, c] as const;
  return null;
}
function isValid(board: Board, row: number, col: number, val: number) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === val) return false;
    if (board[i][col] === val) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) if (board[r][c] === val) return false;
  return true;
}
function solveBoard(board: Board, countSolutions = false, limit = 2) {
  const b = cloneBoard(board);
  let solutions = 0;
  function backtrack(): boolean | void {
    if (solutions >= limit) return;
    const pos = findEmptyCell(b);
    if (!pos) { solutions += 1; return true; }
    const [r, c] = pos;
    for (let n = 1; n <= 9; n++) {
      if (isValid(b, r, c, n)) {
        b[r][c] = n;
        if (backtrack() && !countSolutions) return true;
        b[r][c] = 0;
      }
    }
    return false;
  }
  const ok = backtrack();
  return countSolutions ? solutions : (ok ? b : null);
}
function generateFullSolution(rng: () => number = Math.random) {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (let box = 0; box < 9; box += 4) {
    const nums = shuffle([1,2,3,4,5,6,7,8,9], rng);
    const br = Math.floor(box / 3) * 3;
    const bc = (box % 3) * 3;
    let k = 0;
    for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) board[r][c] = nums[k++];
  }
  return solveBoard(board)!;
}
function countSolutions(board: Board) { return solveBoard(board, true, 2) as number; }
function digHolesFromSolved(solved: Board, difficulty: Diff, rng: () => number = Math.random) {
  const targets = { easy: { minClues: 36, maxClues: 45 }, medium: { minClues: 30, maxClues: 35 }, hard: { minClues: 24, maxClues: 29 } };
  const { minClues, maxClues } = targets[difficulty];
  const targetClues = Math.floor(minClues + rng() * (maxClues - minClues + 1));
  const puzzle = cloneBoard(solved);
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as const), rng);
  let clues = 81;
  for (const [r, c] of cells) {
    if (clues <= targetClues) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    const nsol = countSolutions(puzzle);
    if (nsol !== 1) puzzle[r][c] = backup;
    else clues--;
  }
  return puzzle;
}
function generateSudoku(difficulty: Diff = "easy", seed = Math.floor(Math.random() * 1e9)) {
  const rng = mulberry32(seed);
  const solution = generateFullSolution(rng);
  const puzzle = digHolesFromSolved(solution, difficulty, rng);
  return { puzzle, solution, seed };
}

/* -----------------------------
   Persistence & theme
----------------------------- */
const STORAGE_KEY = "zenny-sudoku-state-v1";
function emptyNotes() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>()));
}
function serializeNotes(notes: Set<number>[][]) { return notes.map((row) => row.map((s) => Array.from(s))); }
function deserializeNotes(raw: number[][][]) { return raw.map((row) => row.map((arr) => new Set(arr))); }
function usePersistentState<T>(initial: T) {
  const [state, setState] = useState<T>(() => {
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); return saved ?? initial; }
    catch { return initial; }
  });
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  return [state, setState] as const;
}

const pastel = {
  bg: "bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50",
  card: "backdrop-blur-xl bg-white/70 border border-emerald-200/60 rounded-2xl",
  gridBorder: "border-emerald-200",
  given: "text-slate-900",
  entry: "text-emerald-700",
  conflict: "text-red-600 bg-red-50",
  selected: "ring-2 ring-emerald-400",
  keypad: "bg-emerald-50 hover:bg-emerald-100",
};
function cx(...xs: (string | undefined | false)[]) { return xs.filter(Boolean).join(" "); }
function formatTime(s: number) {
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = Math.floor(s % 60);
  return [h,m,sec].map((v,i)=> (i===0 && v===0 ? null : String(v).padStart(2,"0"))).filter(Boolean).join(":") || "00:00";
}
function defaultStats() {
  return {
    easy: { games: 0, wins: 0, best: null as number | null, last: null as number | null },
    medium: { games: 0, wins: 0, best: null as number | null, last: null as number | null },
    hard: { games: 0, wins: 0, best: null as number | null, last: null as number | null },
  };
}

/* -----------------------------
   Tiny UI primitives
----------------------------- */
function Btn(props: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  className?: string;
}) {
  const { children, onClick, disabled, variant = "outline", className = "" } = props;
  const base =
    "h-10 px-3 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2";
  const styles = {
    primary: "bg-emerald-500 text-white hover:bg-emerald-600",
    secondary: "bg-amber-100 text-emerald-900 hover:bg-amber-200",
    outline: "border border-emerald-300 text-emerald-800 hover:bg-emerald-50",
    ghost: "text-emerald-800 hover:bg-emerald-50",
  } as const;
  return (
    <button onClick={onClick} disabled={disabled} className={cx(base, styles[variant], className)}>
      {children}
    </button>
  );
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("p-4 md:p-6", pastel.card, className)}>{children}</div>;
}
function Modal({
  open, onClose, title, description, actions, children, showIcon = true,
}: {
  open: boolean; onClose: () => void; title: string;
  description?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode;
  showIcon?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="modal-panel relative bg-white rounded-2xl shadow-xl w-[92vw] max-w-md p-5 border border-emerald-200">
<div className="flex items-start gap-3">
  {showIcon && <Chick className="shrink-0 w-10 h-10" />}
  <div className="min-w-0">
    <h3 className="text-lg font-semibold text-emerald-800">{title}</h3>
    {description && <div className="text-sm text-emerald-700 mt-1">{description}</div>}
    {children}
  </div>
</div>
        <div className="mt-4 flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}
function Dots({ total, index }: { total: number; index: number }) {
  return (
    <div className="flex justify-center gap-2 mt-3">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={cx("w-2 h-2 rounded-full", i === index ? "bg-emerald-500" : "bg-emerald-200")} />
      ))}
    </div>
  );
}
function Chick({ className = "", happy = false }: { className?: string; happy?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="18" fill="#FFE27A" stroke="#E6B800" />
      <circle cx="26" cy="30" r="2.5" fill="#1f2937" />
      <circle cx="38" cy="30" r="2.5" fill="#1f2937" />
      <path d="M30 37 h4 l-2 3 z" fill="#ff8a00" />
      <path d={happy ? "M18 25 l-8 -8" : "M18 25 l-6 -6"} stroke="#34d399" strokeWidth="3" />
      <path d={happy ? "M46 25 l8 -8" : "M46 25 l6 -6"} stroke="#34d399" strokeWidth="3" />
      <path d="M24 47 q8 5 16 0" stroke="#eab308" strokeWidth="3" fill="none" />
    </svg>
  );
}

/* ============================================================
   Main component
============================================================ */
export default function SudokuApp() {
  const [app, setApp] = usePersistentState({
    difficulty: "easy" as Diff,
    puzzle: null as Board | null,
    solution: null as Board | null,
    notes: serializeNotes(emptyNotes()),
    entries: Array.from({ length: 9 }, () => Array(9).fill(0)),
    selected: { r: 0, c: 0 },
    pencilMode: false,
    hintsLeft: 3,
    hintLocks: Array.from({ length: 9 }, () => Array(9).fill(false)),
    seed: null as number | null,
    history: [] as any[],
    future: [] as any[],
    timer: { startedAt: null as number | null, elapsed: 0, running: false },
    stats: defaultStats(),
    musicMuted: false,
  });

  const notes = useMemo(() => deserializeNotes(app.notes), [app.notes]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Prima generazione puzzle
  useEffect(() => {
    if (!app.puzzle || !app.solution) {
      const { puzzle, solution, seed } = generateSudoku(app.difficulty);
      setApp((s: any) => ({
        ...s,
        puzzle, solution, seed,
        notes: serializeNotes(emptyNotes()),
        entries: Array.from({ length: 9 }, () => Array(9).fill(0)),
        hintsLeft: 3,
        history: [], future: [],
        timer: { startedAt: null, elapsed: 0, running: false }, // parte alla prima mossa
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer
  useEffect(() => {
    if (!app.timer.running) return;
    const id = setInterval(() => {
      setApp((s: any) => {
        if (!s.timer.running) return s;
        const now = Date.now();
        const base = s.timer.startedAt ? Math.floor((now - s.timer.startedAt) / 1000) : 0;
        return { ...s, timer: { ...s.timer, elapsed: base } };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [app.timer.running, setApp]);

  // Musica
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = app.musicMuted;
    a.loop = true;
    if (!app.musicMuted) a.play().catch(() => {});
    else a.pause();
  }, [app.musicMuted]);

  const givenAt = (r: number, c: number) => app.puzzle && app.puzzle[r][c] !== 0;
  function getMergedBoard(entriesOverride?: Board) {
    const e = entriesOverride || app.entries;
    return Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => app.puzzle![r][c] || e[r][c] || 0));
  }
  function cellConflicts(r: number, c: number, entriesOverride?: Board) {
    const b = getMergedBoard(entriesOverride);
    const v = b[r][c];
    if (!v) return false;
    for (let i = 0; i < 9; i++) {
      if (i !== c && b[r][i] === v) return true;
      if (i !== r && b[i][c] === v) return true;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) if ((rr !== r || cc !== c) && b[rr][cc] === v) return true;
    return false;
  }
  function setSelected(r: number, c: number) { setApp((s: any) => ({ ...s, selected: { r, c } })); }

  // --- Undo/Redo (no hintsLeft nello snapshot!) ---
  function snapshot(s: any) {
    return {
      entries: s.entries.map((r: number[]) => r.slice()),
      notes: s.notes.map((r: number[][]) => r.map((a: number[]) => a.slice())),
      selected: { ...s.selected },
      pencilMode: s.pencilMode,
    };
  }
  function pushHistory(prev: any) { setApp((s: any) => ({ ...s, history: [...s.history, prev], future: [] })); }
  function doUndo() {
    setApp((s: any) => {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      const curr = snapshot(s);
return {
  ...s,
  entries: (() => {
    const base = prev.entries.map((row: number[]) => row.slice());
    // 🔒 re-applica i numeri messi dagli Aiuti
    for (let rr = 0; rr < 9; rr++) {
      for (let cc = 0; cc < 9; cc++) {
        if (s.hintLocks[rr][cc]) {
          base[rr][cc] = s.solution[rr][cc];
        }
      }
    }
    return base;
  })(),
  notes: prev.notes,
  selected: prev.selected,
  pencilMode: prev.pencilMode,
  history: s.history.slice(0, -1),
  future: [curr, ...s.future],
};
    });
  }
  function doRedo() {
    setApp((s: any) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      const curr = snapshot(s);
return {
  ...s,
  entries: (() => {
    const base = next.entries.map((row: number[]) => row.slice());
    // ⬇️ re-applica i lucchetti degli aiuti
    for (let rr = 0; rr < 9; rr++) {
      for (let cc = 0; cc < 9; cc++) {
        if (s.hintLocks[rr][cc]) {
          base[rr][cc] = s.solution[rr][cc];
        }
      }
    }
    return base;
  })(),
  notes: next.notes,
  selected: next.selected,
  pencilMode: next.pencilMode,
  future: s.future.slice(1),
  history: [...s.history, curr],
};
    });
  }

  function startTimerIfNeeded() {
    if (!app.timer.running && app.timer.startedAt == null) {
      setApp((s: any) => ({ ...s, timer: { startedAt: Date.now(), elapsed: 0, running: true } }));
    }
  }

  function setEntry(n: number) {
    const { r, c } = app.selected;
    if (!app.puzzle) return;
    if (givenAt(r, c)) return;
    startTimerIfNeeded();

    const prev = snapshot(app);
    if (app.pencilMode) {
      const next = deserializeNotes(app.notes);
      if (n === 0) next[r][c].clear();
      else (next[r][c].has(n) ? next[r][c].delete(n) : next[r][c].add(n));
      pushHistory(prev);
      setApp((s: any) => ({ ...s, notes: serializeNotes(next) }));
    } else {
      const next = app.entries.map((row: number[]) => row.slice());
      next[r][c] = n;
      const nextNotes = deserializeNotes(app.notes); nextNotes[r][c].clear();
      pushHistory(prev);
      setApp((s: any) => ({ ...s, entries: next, notes: serializeNotes(nextNotes) }));
      setTimeout(() => checkCompletion(next), 0);
    }
  }

  function checkCompletion(entries: Board) {
    const sol = app.solution; if (!sol) return;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const expected = sol[r][c];
      const val = app.puzzle![r][c] !== 0 ? app.puzzle![r][c] : entries[r][c];
      if (val !== expected) return;
    }
    setApp((s: any) => {
      const t = s.timer.elapsed; const diff = s.difficulty;
      const st = { ...s.stats } as any;
      st[diff] = { games: st[diff].games + 1, wins: st[diff].wins + 1, last: t, best: st[diff].best == null ? t : Math.min(st[diff].best, t) };
return {
  ...s,
  timer: { ...s.timer, running: false },
  stats: st,
};
});
    setWinOpen(true);
  }

  // dialogs
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmActionRef = useRef<null | (() => void)>(null);
  const [winOpen, setWinOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialPage, setTutorialPage] = useState(0);

  function askConfirm(action: () => void) { confirmActionRef.current = action; setConfirmOpen(true); }
  function doConfirm() { setConfirmOpen(false); confirmActionRef.current?.(); confirmActionRef.current = null; }

  function regenerate(difficulty: Diff = app.difficulty) {
    const { puzzle, solution, seed } = generateSudoku(difficulty);
    setApp((s: any) => {
      const st = { ...s.stats } as any; st[difficulty] = { ...st[difficulty], games: st[difficulty].games + 1 };
      return {
        ...s, difficulty, puzzle, solution, seed,
        notes: serializeNotes(emptyNotes()),
        entries: Array.from({ length: 9 }, () => Array(9).fill(0)),
        hintLocks: Array.from({ length: 9 }, () => Array(9).fill(false)),
        hintsLeft: 3, selected: { r: 0, c: 0 }, history: [], future: [],
        timer: { startedAt: null, elapsed: 0, running: false }, stats: st,
      };
    });
  }
  function handleRegenerate() { askConfirm(() => regenerate(app.difficulty)); }
  function handleChangeDifficulty(e: React.ChangeEvent<HTMLSelectElement>) { askConfirm(() => regenerate(e.target.value as Diff)); }
  function handleRestart() {
    askConfirm(() => setApp((s: any) => ({
      ...s,
      notes: serializeNotes(emptyNotes()),
      entries: Array.from({ length: 9 }, () => Array(9).fill(0)),
      hintLocks: Array.from({ length: 9 }, () => Array(9).fill(false)),
      hintsLeft: 3, history: [], future: [],
      timer: { startedAt: null, elapsed: 0, running: false }, selected: { r: 0, c: 0 },
    })));
  }

  function randomHint() {
    if (app.hintsLeft <= 0) return;
    const empties: [number, number][] = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (app.puzzle![r][c] !== 0) continue;
      if (app.entries[r][c] === app.solution![r][c]) continue;
      empties.push([r, c]);
    }
    if (empties.length === 0) return;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    const next = app.entries.map((row: number[]) => row.slice());
    next[r][c] = app.solution![r][c];
    const nextNotes = deserializeNotes(app.notes); nextNotes[r][c].clear();
    const nextLocks = app.hintLocks.map(row => row.slice());
nextLocks[r][c] = true;
    setApp((s: any) => ({
      ...s,
      entries: next,
      notes: serializeNotes(nextNotes),
      hintLocks: nextLocks,
      hintsLeft: s.hintsLeft - 1, // NON fa parte di undo/redo
      selected: { r, c },
    }));
    setTimeout(() => checkCompletion(next), 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const { r, c } = app.selected;
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
    if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); doRedo(); return; }

    if (e.key >= "1" && e.key <= "9") setEntry(parseInt(e.key, 10));
    else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") setEntry(0);
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(Math.max(0, r - 1), c); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSelected(Math.min(8, r + 1), c); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); setSelected(r, Math.max(0, c - 1)); }
    else if (e.key === "ArrowRight") { e.preventDefault(); setSelected(r, Math.min(8, c + 1)); }
    else if (e.key.toLowerCase() === "n") setApp((s: any) => ({ ...s, pencilMode: !s.pencilMode }));
  }

  if (!app.puzzle || !app.solution) {
    return (
      <div className={cx("min-h-screen flex items-center justify-center", pastel.bg)}>
        <div className="text-center text-emerald-700 animate-pulse">Sto generando un sudoku zen per te…</div>
      </div>
    );
  }

  const helpLabel = `Aiuto (${app.hintsLeft})`;

  return (
    <div className={cx("min-h-screen p-4 md:p-8 relative", pastel.bg)} onKeyDown={handleKeyDown} tabIndex={0}>
{/* titolo a sinistra – controlli responsive (polletto fermo) */}
<div className="mx-auto max-w-5xl mb-4 md:mb-6 flex items-center justify-between">
  {/* Titolo + polletto (il polletto NON si muove) */}
  <div className="flex items-center gap-4">
    <h1 className="text-5xl font-bold text-emerald-900">Zenny Sudoku</h1>

    {/* Contenitore relativo per ancorare le icone SOLO su mobile */}
    <div className="relative w-24 h-24">
      <img src="/chick.png" alt="Zenny" className="w-24 h-24" />

      {/* MOBILE: icone in colonna, accanto al polletto (non spostano il pulcino) */}
      <div className="absolute -left-12 top-1 flex flex-col gap-2 sm:hidden">
        <button
          className="p-2 rounded-xl border border-emerald-300 bg-white/70 hover:bg-emerald-50"
          title={app.musicMuted ? "Riattiva suono" : "Disattiva suono"}
          onClick={() => setApp((s: any) => ({ ...s, musicMuted: !s.musicMuted }))}
          aria-label={app.musicMuted ? "Riattiva suono" : "Disattiva suono"}
        >
          {app.musicMuted ? <VolumeX className="w-5 h-5 text-emerald-800" /> : <Volume2 className="w-5 h-5 text-emerald-800" />}
        </button>
        <button
          className="p-2 rounded-xl border border-emerald-300 bg-white/70 hover:bg-emerald-50"
          onClick={() => { setTutorialPage(0); setTutorialOpen(true); }}
          aria-label="Apri tutorial"
          title="Tutorial"
        >
          <BookOpen className="w-5 h-5 text-emerald-800" />
        </button>
      </div>
    </div>
  </div>

  {/* TABLET/DESKTOP: bottoni a destra, affiancati come prima */}
  <div className="hidden sm:flex items-center gap-2">
    <button
      className="p-2 rounded-xl border border-emerald-300 bg-white/70 hover:bg-emerald-50"
      title={app.musicMuted ? "Riattiva suono" : "Disattiva suono"}
      onClick={() => setApp((s: any) => ({ ...s, musicMuted: !s.musicMuted }))}
    >
      {app.musicMuted ? <VolumeX className="w-5 h-5 text-emerald-800" /> : <Volume2 className="w-5 h-5 text-emerald-800" />}
    </button>
    <Btn onClick={() => { setTutorialPage(0); setTutorialOpen(true); }}>
      <BookOpen className="w-4 h-4" /> Tutorial
    </Btn>
  </div>
</div>

      <div className="mx-auto max-w-5xl grid md:grid-cols-[1fr_380px] gap-6 items-start">
        {/* colonna sinistra: board */}
        <Card>
{/* Contenitore centrato della griglia e dei pulsanti */}
<div className="mx-auto w-full max-w-[min(92vw,560px)]">

  {/* --- Barra TOP: sopra la griglia (centrata) --- */}
  <div className="mb-3 flex flex-wrap justify-center gap-3">
    <select
      value={app.difficulty}
      onChange={handleChangeDifficulty}
      className="h-10 px-3 rounded-xl border border-emerald-300 bg-white text-emerald-800"
      title="Difficoltà"
    >
      <option value="easy">Semplice</option>
      <option value="medium">Medio</option>
      <option value="hard">Difficile</option>
    </select>

    <Btn onClick={handleRegenerate}>
      <RefreshCcw className="w-4 h-4" />
      Rigenera
    </Btn>

    <Btn onClick={randomHint} disabled={app.hintsLeft <= 0}>
      <HelpCircle className="w-4 h-4" />
      {helpLabel}
    </Btn>

    <Btn onClick={handleRestart}>
      <RotateCcw className="w-4 h-4" />
      Ricomincia
    </Btn>
  </div>

  {/* Timer e seed (stessa larghezza della griglia) */}
  <div className="mb-3 flex items-center justify-between text-emerald-900/90">
    <div className="flex items-center gap-2">
      <TimerReset className="w-4 h-4" />
      <span>{formatTime(app.timer.elapsed)}</span>
    </div>
    <div className="text-xs text-emerald-700/70">Seed: {app.seed}</div>
  </div>

  {/* --- Griglia --- */}
  <Board
    puzzle={app.puzzle}
    entries={app.entries}
    notes={notes}
    selected={app.selected}
    setSelected={setSelected}
    conflictFn={cellConflicts}
  />

  {/* --- Keypad sotto la griglia --- */}
  <div className="mt-6">
    <Keypad numberClick={setEntry} />
  </div>

  {/* --- Barra BOTTOM: sotto il keypad (centrata) --- */}
  <div className="mt-4 mb-1 flex flex-wrap justify-center gap-3">
    <Btn onClick={() => setApp((s: any) => ({ ...s, pencilMode: !s.pencilMode }))}>
      <Pencil className="w-4 h-4" />
      {app.pencilMode ? "Numerini ON" : "Numerini OFF"}
    </Btn>

    <Btn onClick={() => setEntry(0)}>
      <Eraser className="w-4 h-4" />
      Gomma
    </Btn>

    <Btn onClick={doUndo}>
      <Undo2 className="w-4 h-4" />
      Annulla
    </Btn>

    <Btn onClick={doRedo}>
      <Redo2 className="w-4 h-4" />
      Ripeti
    </Btn>
  </div>
</div>
        </Card>

        {/* colonna destra: statistiche */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-emerald-800 mb-2">Statistiche</h2>
            <StatsCard stats={app.stats} />
          </Card>
        </div>
      </div>

      {/* audio bg */}
      <audio ref={audioRef} src="/relax.mp3" />

{/* popup conferma */}
<Modal
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  title="Perdere i progressi?"
  description="Questa azione cancellerà lo stato attuale."
  showIcon={false}
  actions={
    <>
      <Btn onClick={() => setConfirmOpen(false)}>Annulla</Btn>
      <Btn variant="primary" onClick={doConfirm}>Sì, continua</Btn>
    </>
  }
/>

{/* popup vittoria */}
<Modal
  open={winOpen}
  onClose={() => setWinOpen(false)}
  title="Bravo! Sudoku completato! 🎉"
  description={<div className="flex items-center gap-2 text-emerald-800">Tempo: {formatTime(app.timer.elapsed)}</div>}
  showIcon={false}   // 🔹 niente iconcina in alto
  actions={
    <Btn variant="primary" onClick={() => { setWinOpen(false); regenerate(app.difficulty); }}>
      Nuovo sudoku
    </Btn>
  }
>
        <div className="mt-2 flex items-center gap-2">
<img src="/chick.png" alt="" className="w-12 h-12 animate-bounce mt-4" />
          <span className="text-emerald-800">Il polletto è felice! </span>
        </div>
      </Modal>

      {/* popup tutorial */}
      <Modal
  open={tutorialOpen}
  onClose={() => setTutorialOpen(false)}
  title={tutorialPage === 0 ? "Come si fa un Sudoku" : "Come funziona Zenny Sudoku"}
  showIcon={false}   // niente mini-cerchio in alto
  actions={
    <>
      {tutorialPage > 0 && <Btn onClick={() => setTutorialPage((p) => p - 1)}>Indietro</Btn>}
      {tutorialPage < 1 ? (
        <Btn variant="primary" onClick={() => setTutorialPage((p) => p + 1)}>Avanti</Btn>
      ) : (
        <Btn variant="primary" onClick={() => setTutorialOpen(false)}>Chiudi</Btn>
      )}
    </>
  }
>
  {/* contenitore relativo per ancorare il polletto in basso */}
  <div className="relative pb-10">
    {tutorialPage === 0 ? (
      <div className="mt-3 space-y-2 text-emerald-800">
        <p>Riempi la griglia 9×9 con i numeri da 1 a 9.</p>
        <p>In ogni riga, colonna e riquadro 3×3, ogni numero può comparire una sola volta.</p>
        <p>Attiva i <b>Numerini</b> per segnare le possibilità (come una matita).</p>
      </div>
    ) : (
      <div className="mt-3 space-y-2 text-emerald-800">
        <p>• Scegli la difficoltà e inizia.</p>
        <p>• Usa la <b>Gomma</b> per cancellare un numero che hai messo.</p>
        <p>• <b>Annulla</b> / <b>Ripeti</b> per correggere mosse.</p>
        <p>• <b>{helpLabel}</b>: riempie una casella corretta casuale (3 per partita).</p>
        <p>• <b>Ricomincia</b> azzera il puzzle attuale; <b>Rigenera</b> crea un nuovo Sudoku.</p>
      </div>
    )}

    {/* pallini pagina */}
    <div className="mt-3">
      <Dots total={2} index={tutorialPage} />
    </div>
  </div>
      <img
      src="/chick-tutorial.png"    // assicurati che il file sia in /public/chick-tutorial.png
      alt="Polletto tutorial"
      className="absolute left-4 bottom-1 w-26 h-26 pointer-events-none select-none"
    />
</Modal>
    </div>
  );
}

/* ============================================================
   Subcomponents
============================================================ */
function Board({
  puzzle, entries, notes, selected, setSelected, conflictFn,
}: {
  puzzle: Board; entries: Board; notes: Set<number>[][];
  selected: { r: number; c: number }; setSelected: (r: number, c: number) => void;
  conflictFn: (r: number, c: number) => boolean;
}) {
  // Linee della griglia disegnate con i gap (niente border per-cella)
  return (
    <div className="aspect-square p-[2px] bg-emerald-200">
      <div className="grid grid-cols-3 grid-rows-3 gap-[2px] w-full h-full">
        {Array.from({ length: 3 }).map((_, br) =>
          Array.from({ length: 3 }).map((_, bc) => (
            <div key={`${br}-${bc}`} className="grid grid-cols-3 grid-rows-3 gap-px bg-emerald-200">
              {Array.from({ length: 3 }).map((_, rr) =>
                Array.from({ length: 3 }).map((_, cc) => {
                  const r = br * 3 + rr;
                  const c = bc * 3 + cc;
                  const given = puzzle[r][c] !== 0;
                  const value = given ? puzzle[r][c] : entries[r][c];
                  const conflict = !given && value !== 0 && conflictFn(r, c);
                  return (
                    <Cell
                      key={`${r}-${c}`}
                      r={r}
                      c={c}
                      given={given}
                      value={value}
                      notes={notes[r][c]}
                      conflict={conflict}
                      selected={selected.r === r && selected.c === c}
                      onSelect={() => setSelected(r, c)}
                    />
                  );
                })
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Cell({
  r, c, given, value, notes, conflict, selected, onSelect,
}: {
  r: number; c: number; given: boolean; value: number; notes: Set<number>;
  conflict: boolean; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cx(
        // niente border: le linee della griglia sono i gap
        "relative flex items-center justify-center bg-white text-xl md:text-2xl font-semibold select-none transition-colors focus:outline-none",
        selected && pastel.selected,
        conflict && pastel.conflict,
      )}
      style={{ aspectRatio: "1 / 1" }}
      aria-label={`cella ${r + 1}, ${c + 1}`}
    >
      {value ? (
        <span className={cx(given ? pastel.given : (conflict ? "" : pastel.entry))}>
          {value}
        </span>
      ) : (
        <NotesGrid notes={notes} />
      )}
    </button>
  );
}

function NotesGrid({ notes }: { notes: Set<number> }) {
  return (
    <div className="grid grid-cols-3 gap-0.5 w-full h-full p-1">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="text-[10px] md:text-xs leading-none text-emerald-700/70 flex items-center justify-center">
          {notes.has(i + 1) ? i + 1 : ""}
        </div>
      ))}
    </div>
  );
}

function Keypad({ numberClick }: { numberClick: (n: number) => void }) {
  return (
    <div className="grid grid-cols-9 gap-2">
      {Array.from({ length: 9 }).map((_, i) => (
        <button
          key={i}
          className={cx("h-12 rounded-xl text-lg", pastel.keypad)}
          onClick={() => numberClick(i + 1)}
          aria-label={`inserisci ${i + 1}`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}

function StatsCard({ stats }: { stats: ReturnType<typeof defaultStats> }) {
  const rows = [
    { k: "easy" as const, label: "Semplice" },
    { k: "medium" as const, label: "Medio" },
    { k: "hard" as const, label: "Difficile" },
  ];
  return (
    <div className="space-y-3 text-emerald-900">
      <div className="grid grid-cols-3 text-sm font-medium text-emerald-700">
        <div></div><div className="text-center">Giocate/Vinte</div><div className="text-right">Migliore / Ultima</div>
      </div>
      {rows.map(({ k, label }) => (
        <div key={k} className="grid grid-cols-3 text-sm items-center">
          <div className="font-medium text-emerald-800">{label}</div>
          <div className="text-center">{stats[k].games} / {stats[k].wins}</div>
          <div className="text-right">
            {stats[k].best != null ? formatTime(stats[k].best) : "—"} / {stats[k].last != null ? formatTime(stats[k].last) : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
