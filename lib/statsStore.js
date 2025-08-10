// lib/statsStore.js
const fs = require('fs');
const path = require('path');

const STATS_FILE = process.env.STATS_FILE || path.join(__dirname, '../data/stats.json');

function ensureFile() {
  const dir = path.dirname(STATS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STATS_FILE)) {
    const init = {
      startedAt: new Date().toISOString(),
      lastUpdated: null,
      total: 0,
      totalDurationMs: 0,
      errors: 0,
      perCommand: {},   // { cmd: count }
      perUser: {},      // { jid: count }
      perGroup: {},     // { gid: count }
    };
    fs.writeFileSync(STATS_FILE, JSON.stringify(init, null, 2));
  }
}

function load() {
  ensureFile();
  return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
}

function save(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2));
}

// record satu eksekusi command
function record({ command, userJid, groupJid, success, durationMs }) {
  const db = load();
  db.total += 1;
  db.totalDurationMs += Math.max(0, durationMs || 0);

  db.perCommand[command] = (db.perCommand[command] || 0) + 1;
  db.perUser[userJid] = (db.perUser[userJid] || 0) + 1;
  if (groupJid) db.perGroup[groupJid] = (db.perGroup[groupJid] || 0) + 1;

  if (!success) db.errors += 1;

  save(db);
  return db;
}

function getSummary() {
  const db = load();
  const avgMs = db.total ? Math.round(db.totalDurationMs / db.total) : 0;
  return {
    startedAt: db.startedAt,
    lastUpdated: db.lastUpdated,
    total: db.total,
    errors: db.errors,
    avgMs,
    topCommands: topOf(db.perCommand, 5),
    topUsers: topOf(db.perUser, 5),
    topGroups: topOf(db.perGroup, 5),
  };
}

function topOf(obj, n = 5) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({ key: k, count: v }));
}

module.exports = { record, getSummary, load };

