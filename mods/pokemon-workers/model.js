// What the window shows, as plain data: spaces, their agents, each agent's sub-agents and mood,
// and which starter line every agent was given.
import { agents, spaces, terminals, shared, setShared } from "herdr";
import { LINES, LINE, groupOf } from "./lines.js";

export const KEY = "pokemon-workers";          // shared state: { lines: { <pane or address>: <line key> }, scene }
export const SLEEP_AFTER = 90 * 1000;          // idle this long: falls asleep
const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };

const state = () => { const s = shared(KEY); return s && typeof s === "object" ? s : {}; };
export const savedLines = () => (state().lines && typeof state().lines === "object" ? state().lines : {});
export const SHINY_ODDS = 64;               // 1 in 64 for every big animal and every small one, each rolled on its own
const savedShiny = () => (state().shiny && typeof state().shiny === "object" ? state().shiny : {});
export const savedScene = () => state().scene || "zen";
export function saveScene(scene) { setShared(KEY, { ...state(), scene }); }

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

// A new agent is dealt a random line, which it keeps for good (remembered per agent, by pane). Lines are drawn in two steps so a
// family counts once: first a group (every line is its own group, except the Eevee evolutions, which share one), then a line
// inside it. With 10 lines of which 4 are one family, each of the 7 groups has chance 1/7 and each family member 1/28.
// A group (and a line inside it) that nobody on screen has yet is preferred while there is one.
const GROUPS = [...new Set(LINES.map(groupOf))];
const leastUsed = (items, count) => {
  const min = Math.min(...items.map(count)), pool = items.filter((i) => count(i) === min);
  return pool[Math.floor(Math.random() * pool.length)];
};
export function ensureLines(keys, kidKeys = []) {
  const saved = savedLines(), shinies = savedShiny(), used = {}, groupUsed = {}, fresh = {}, freshShiny = {};
  const note = (key) => { used[key] = (used[key] || 0) + 1; groupUsed[groupOf(LINE[key])] = (groupUsed[groupOf(LINE[key])] || 0) + 1; };
  for (const k of keys) if (saved[k] && LINE[saved[k]]) note(saved[k]);
  for (const k of keys) {
    if ((saved[k] && LINE[saved[k]]) || fresh[k]) continue;
    const group = leastUsed(GROUPS, (g) => groupUsed[g] || 0);
    const pick = leastUsed(LINES.filter((l) => groupOf(l) === group), (l) => used[l.key] || 0).key;
    fresh[k] = pick; note(pick);
  }
  // shiny: rolled once when an animal first appears and remembered either way (1 = shiny, 0 = not)
  for (const k of [...keys, ...kidKeys]) if (shinies[k] === undefined && freshShiny[k] === undefined) freshShiny[k] = Math.random() * SHINY_ODDS < 1 ? 1 : 0;
  if (Object.keys(fresh).length || Object.keys(freshShiny).length) {
    const trim = (m) => { const ks = Object.keys(m); for (let i = 0; i < ks.length - 300; i++) delete m[ks[i]]; return m; };    // forget the oldest
    setShared(KEY, { ...state(), lines: trim({ ...saved, ...fresh }), shiny: trim({ ...shinies, ...freshShiny }) });
  }
}
const shinyOf = (key) => savedShiny()[key] === 1;
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
        mood: moodOf(a.status, tabs[a.tab]?.changed_at, now), line: lineOf(key), shiny: shinyOf(key),
        kids: kidsOf(a.address).map((k) => ({ key: "k:" + k.address, addr: k.address, shiny: shinyOf("k:" + k.address), mood: kidMood(kidStatus(listed.get(k.address) ?? k.status)) })),
      };
    }).sort((a, b) => (b.focused ? 1 : 0) - (a.focused ? 1 : 0) || (RANK[b.status] ?? 0) - (RANK[a.status] ?? 0));
    return { id: s.id, name: s.name, status: s.status, active: !!s.active, peers };
  }).sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0) || (RANK[b.status] ?? 1) - (RANK[a.status] ?? 1));   // the space you are working in first, then blocked, done, working, idle last
}

// Made-up data for screenshots and trying it out: props { demo: true }
export function demoModel() {
  const P = (line, status, mood, kids = [], shiny = false) => ({ key: line, addr: line, pane: "", label: "agent", status, focused: false, mood, line, shiny, kids: kids.map((m) => ({ key: "", addr: "", mood: [].concat(m)[0], shiny: [].concat(m)[1] === "shiny" })) });   // a kid is a mood, or [mood, "shiny"]
  return [
    { id: "d1", name: "api", status: "working", active: true, peers: [P("g1fire", "working", "working", ["working", "sleep"], true), P("g3water", "idle", "sleep")] },
    { id: "d2", name: "web", status: "idle", peers: [P("pikachu", "idle", "sleep", [["sleep", "shiny"]])] },
    { id: "d3", name: "infra", status: "done", peers: [P("g2fire", "done", "done", ["sleep"]), P("g8grass", "working", "working"), P("g4grass", "idle", "idle")] },
    { id: "d4", name: "docs", status: "idle", peers: [P("eevee_umbreon", "idle", "idle", ["working"])] },
    { id: "d5", name: "scratch", status: "blocked", peers: [P("g6water", "blocked", "blocked", ["working", "sleep"]), P("g7fire", "working", "working")] },
    { id: "d6", name: "notes", status: "idle", peers: [] },
  ];
}

export function focusPeer(run, p) {
  if (p.pane) run("pane.focus", { pane: p.pane }); else if (p.addr) run("agent.focus", { terminal: p.addr });
}
