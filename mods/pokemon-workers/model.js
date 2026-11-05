// What the window shows, as plain data: spaces, their agents, each agent's sub-agents and mood,
// and which starter line every agent was given.
import { agents, spaces, terminals, shared, setShared } from "herdr";
import { LINES } from "./lines.js";

export const KEY = "pokemon-workers";          // shared state: { lines: { <pane or address>: <line key> }, scene }
export const SLEEP_AFTER = 90 * 1000;          // idle this long: falls asleep
const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };

const state = () => { const s = shared(KEY); return s && typeof s === "object" ? s : {}; };
export const savedLines = () => (state().lines && typeof state().lines === "object" ? state().lines : {});
export const savedScene = () => state().scene || "zen";
export function saveScene(scene) { setShared(KEY, { ...state(), scene }); }

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

// A new agent gets a random starter line, one nobody on screen has yet if there is one.
// Remembered per agent (by pane), so an agent keeps its animal for good.
export function ensureLines(keys) {
  const saved = savedLines(), used = {}, fresh = {};
  for (const k of keys) if (saved[k]) used[saved[k]] = (used[saved[k]] || 0) + 1;
  for (const k of keys) {
    if (saved[k] || fresh[k]) continue;
    const min = Math.min(...LINES.map((l) => used[l.key] || 0));
    const pool = LINES.filter((l) => (used[l.key] || 0) === min);
    const pick = pool[Math.floor(Math.random() * pool.length)].key;
    fresh[k] = pick; used[pick] = (used[pick] || 0) + 1;
  }
  if (Object.keys(fresh).length) {
    const next = { ...saved, ...fresh }, ks = Object.keys(next);
    for (let i = 0; i < ks.length - 300; i++) delete next[ks[i]];     // forget the oldest
    setShared(KEY, { ...state(), lines: next });
  }
}
const lineOf = (key) => savedLines()[key] || LINES[hash(key) % LINES.length].key;

const kidMood = (s) => (s === "working" ? "working" : s === "blocked" ? "blocked" : "sleep");
const kidStatus = (raw) => (raw === "error" ? "blocked" : raw === "done" ? "idle" : raw === "working" || raw === "blocked" ? raw : "idle");

export function moodOf(status, changedAt, now) {
  if (status === "blocked" || status === "done" || status === "working") return status;
  return changedAt == null || now - changedAt > SLEEP_AFTER ? "sleep" : "idle";
}

// [{ id, name, status, peers: [{ key, addr, pane, label, status, mood, line, kids: [{ addr, mood }] }] }]
export function buildModel(now) {
  const sp = spaces(), ag = agents(), tm = terminals();
  const tabs = {}; for (const s of sp) for (const t of s.tabs) tabs[t.id] = t;
  const listed = new Map(ag.map((a) => [a.address, a.status]));
  const child = new Map();
  for (const k of tm) if (k.parent && k.state === "live") (child.get(k.parent) ?? child.set(k.parent, []).get(k.parent)).push(k);
  const isKid = new Set(tm.filter((k) => k.parent && ag.some((a) => a.address === k.address)).map((k) => k.address));
  const kidsOf = (addr, seen = new Set()) => (child.get(addr) ?? []).flatMap((k) => seen.has(k.address) ? [] : (seen.add(k.address), [k, ...kidsOf(k.address, seen)]));
  return sp.map((s) => {
    const peers = ag.filter((a) => a.space === s.id && !isKid.has(a.address)).map((a) => {
      const key = a.pane || a.address;
      return {
        key, addr: a.address, pane: a.pane, label: a.program?.name || a.app || "agent", status: a.status, focused: !!a.focused,
        mood: moodOf(a.status, tabs[a.tab]?.changed_at, now), line: lineOf(key),
        kids: kidsOf(a.address).map((k) => ({ addr: k.address, mood: kidMood(kidStatus(listed.get(k.address) ?? k.status)) })),
      };
    }).sort((a, b) => (b.focused ? 1 : 0) - (a.focused ? 1 : 0) || (RANK[b.status] ?? 0) - (RANK[a.status] ?? 0));
    return { id: s.id, name: s.name, status: s.status, active: !!s.active, peers };
  }).sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));   // the space you are working in comes first
}

// Made-up data for screenshots and trying it out: props { demo: true }
export function demoModel() {
  const P = (line, status, mood, kids = []) => ({ key: line, addr: line, pane: "", label: "agent", status, focused: false, mood, line, kids: kids.map((m) => ({ addr: "", mood: m })) });
  return [
    { id: "d1", name: "api", status: "working", active: true, peers: [P("g1fire", "working", "working", ["working", "sleep"]), P("g3water", "idle", "sleep")] },
    { id: "d2", name: "web", status: "idle", peers: [P("g5water", "idle", "sleep")] },
    { id: "d3", name: "infra", status: "done", peers: [P("g2fire", "done", "done", ["sleep"]), P("g8grass", "working", "working"), P("g4grass", "idle", "idle")] },
    { id: "d4", name: "docs", status: "idle", peers: [P("g9grass", "idle", "idle")] },
    { id: "d5", name: "scratch", status: "blocked", peers: [P("g6water", "blocked", "blocked", ["working", "sleep"]), P("g7fire", "working", "working")] },
  ];
}

export function focusPeer(run, p) {
  if (p.pane) run("pane.focus", { pane: p.pane }); else if (p.addr) run("agent.focus", { terminal: p.addr });
}
