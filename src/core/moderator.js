// src/core/moderator.js
// Rule-based "AI moderator" commentary for the Party Mode scoreboard —
// each round the picker looks at who just earned what, who leads overall,
// and who shut out, then drops one sarcastic Russian one-liner into the
// transient scoreboard. Keeps the Jackbox-loop beat alive between rounds
// without calling out to an LLM. Upgrade path: same signature, swap the
// template bank for a GPT call once demand is proven.
//
// pickModeratorLine({ players, scores, earned, lastMinigame, lastLineKey?, rand? })
//   → { text: string, key: string, category: string } | null
//
// Pure function. Takes an injectable rand for deterministic unit tests
// and an optional lastLineKey to avoid repeating the same template back-
// to-back across scoreboards.

(function(BB) {
  // Template bank. Each entry: { key, text } grouped by category.
  // Placeholders — filled by simple {name} substitution:
  //   {game}    — friendly name of the mini-game just finished
  //   {winner}  — label of the round winner (earned max coins)
  //   {winner1} — first tied winner label (tie category)
  //   {winner2} — second tied winner label (tie category)
  //   {loser}   — label of a random zero-earner (zero-roast category)
  //   {leader}  — label of the overall standings leader (leader-taunt)
  const TEMPLATES = {
    // All players earned 0 this round — picker prefers this when nobody
    // scored because the vibe is unique (and silent standings feel wrong).
    shutout: [
      { key: 'shut-1', text: 'У всех по нулю. Это уже не игра, это медитация.' },
      { key: 'shut-2', text: 'Ни один не дрогнул. Красиво, но подозрительно.' },
      { key: 'shut-3', text: 'Все как один — в нуле. Играли? Или обсуждали что?' },
      { key: 'shut-4', text: 'Ноль на ноль — и шансы на следующую игру растут.' },
    ],

    // Two or more players tied for max earned — celebrate the split.
    tie: [
      { key: 'tie-1',  text: '{winner1} и {winner2} — одинаково. Интеллигентно, как в шахматном кружке.' },
      { key: 'tie-2',  text: 'Ничья наверху. Мир, дружба, жвачка.' },
      { key: 'tie-3',  text: 'Ровно. Подозрительно ровно.' },
      { key: 'tie-4',  text: '{winner1} и {winner2} разделили победу. Настоящий спорт!' },
    ],

    // Clean single winner with ≥2× next best — roast the gap.
    blowout: [
      { key: 'blow-1', text: '{winner} уехал. Остальные ещё шнурки завязывают.' },
      { key: 'blow-2', text: 'Разрыв как от Москвы до Воркуты. Поздравляем, {winner}.' },
      { key: 'blow-3', text: '{winner} играет всерьёз. Остальные — для настроения.' },
      { key: 'blow-4', text: 'Это не раунд, это мастер-класс от {winner}.' },
    ],

    // Clean single winner, normal margin — simple round-winner callout.
    'solo-winner': [
      { key: 'solo-1', text: '{winner}, красиво. Раунд в кармане.' },
      { key: 'solo-2', text: 'Раунд за {winner}. Кто-то завидует тихо.' },
      { key: 'solo-3', text: '{winner} забрал. Без шуток — умеет.' },
      { key: 'solo-4', text: '{winner} — держи. И не загордись раньше времени.' },
      { key: 'solo-5', text: 'Аплодисменты {winner}. Сдержанные, но искренние.' },
    ],

    // At least one player earned 0 while others scored — roast the idler.
    'zero-roast': [
      { key: 'zero-1', text: '{loser} — ноль. Зато душа на месте.' },
      { key: 'zero-2', text: '{loser}, ты здесь чисто тусоваться, да?' },
      { key: 'zero-3', text: '{loser} сегодня без очков. Но вайб-то — о-о!' },
      { key: 'zero-4', text: 'Если бы за стильный проигрыш начисляли, {loser} был бы в топе.' },
    ],

    // Overall standings taunt — picks whoever is leading after this round.
    'leader-taunt': [
      { key: 'lead-1', text: '{leader} впереди. До конца ещё далеко — не расслабляйся.' },
      { key: 'lead-2', text: '{leader} лидирует. Но это ещё не приговор.' },
      { key: 'lead-3', text: 'На первом — {leader}. Кто первым съедет?' },
      { key: 'lead-4', text: '{leader} на троне. Очень шаткая мебель.' },
    ],
  };

  // Resolve a display name for a player slot. Mirrors playerLabel() but
  // without leaning on a window global so this module stays unit-testable
  // under the node:test shim.
  function nameOf(p) {
    if (!p) return '';
    if (p.displayName) return String(p.displayName).toUpperCase();
    if (p.char && p.char.name) return String(p.char.name).toUpperCase();
    return '';
  }

  function pickModeratorLine({
    players,
    scores,
    earned,
    lastMinigame = '',
    lastLineKey = null,
    rand = Math.random,
  } = {}) {
    if (!players || players.length === 0) return null;
    const n = players.length;
    const e = Array.isArray(earned)  ? earned.slice(0, n)  : Array(n).fill(0);
    const s = Array.isArray(scores)  ? scores.slice(0, n)  : Array(n).fill(0);
    while (e.length < n) e.push(0);
    while (s.length < n) s.push(0);

    const maxE = Math.max(0, ...e);
    const roundWinners = [];
    e.forEach((v, i) => { if (v > 0 && v === maxE) roundWinners.push(i); });

    const totals = s.map((v, i) => (v || 0) + (e[i] || 0));
    const maxT = Math.max(0, ...totals);
    const leader = totals.findIndex(v => v === maxT);

    const hasShutout = maxE === 0;
    const hasTie     = roundWinners.length >= 2;
    const soloWinner = roundWinners.length === 1 ? roundWinners[0] : -1;

    // Blowout guard — winner must have earned ≥3 AND at least 2× the
    // runner-up, so a squeaker 2-1 round doesn't get announced with
    // "разрыв как от Москвы до Воркуты". Falls through to solo-winner
    // when the gap is modest.
    const sortedE = [...e].sort((a, b) => b - a);
    const hasBlowout = soloWinner >= 0
      && sortedE[0] >= 3
      && sortedE[0] >= 2 * (sortedE[1] || 0);

    const zeroLosers = [];
    if (!hasShutout) e.forEach((v, i) => { if ((v || 0) === 0) zeroLosers.push(i); });

    // Category priority: shutout > tie > blowout > weighted random among
    // the three "normal" options so the same Scoreboard feel doesn't hit
    // solo-winner six rounds in a row.
    let category;
    if (hasShutout) {
      category = 'shutout';
    } else if (hasTie) {
      category = 'tie';
    } else if (hasBlowout) {
      category = 'blowout';
    } else {
      const opts = [];
      if (soloWinner >= 0)        opts.push('solo-winner');
      if (zeroLosers.length > 0)  opts.push('zero-roast');
      opts.push('leader-taunt');
      category = opts[Math.floor(rand() * opts.length)] || 'leader-taunt';
    }

    const bank = TEMPLATES[category] || [];
    if (bank.length === 0) return null;

    // Dedup vs. previous line — drop the repeat only if we still have
    // alternatives in the same category.
    const available = bank.filter(t => t.key !== lastLineKey);
    const pool = available.length > 0 ? available : bank;
    const pick = pool[Math.floor(rand() * pool.length)] || pool[0];

    const subs = {
      game:   String(lastMinigame || '').toUpperCase(),
      winner: soloWinner >= 0 ? nameOf(players[soloWinner]) : nameOf(players[roundWinners[0]]),
      winner1: roundWinners[0] !== undefined ? nameOf(players[roundWinners[0]]) : '',
      winner2: roundWinners[1] !== undefined ? nameOf(players[roundWinners[1]]) : '',
      loser:  zeroLosers.length > 0
        ? nameOf(players[zeroLosers[Math.floor(rand() * zeroLosers.length)]])
        : '',
      leader: leader >= 0 ? nameOf(players[leader]) : '',
    };
    const text = pick.text.replace(/\{(\w+)\}/g, (_, key) => subs[key] != null ? subs[key] : '');

    return { text, key: pick.key, category };
  }

  BB.core = Object.assign(BB.core || {}, { pickModeratorLine });
})(window.BB = window.BB || {});
