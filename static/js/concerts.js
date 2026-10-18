(function () {
  const root = document.getElementById('app');
  const $ = (s, el = root) => el.querySelector(s);
  const $$ = (s, el = root) => [...el.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.8v14.4L19 12z"/></svg>';
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 5h4v14h-4zM13.5 5h4v14h-4z"/></svg>';
  const NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5.5v13l9.5-6.5zM16.5 5.5h2.2v13h-2.2z"/></svg>';
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 14.6 9l6.2.6-4.7 4.1 1.4 6.1L12 16.6l-5.5 3.2 1.4-6.1-4.7-4.1L9.4 9z"/></svg>';
  const NOTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4.5v10.2a3.3 3.3 0 1 0 2 3V8.4l7-1.6v6.1a3.3 3.3 0 1 0 2 3V3.6z"/></svg>';

  /* ---------- dates ---------- */
  // js-yaml reads 2026-10-30 as a Date at UTC midnight; everything here works on "YYYY-MM-DD" strings
  const iso = v => v instanceof Date ? v.toISOString().slice(0, 10) : (v == null ? '' : String(v));
  const now = new Date();
  const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const parts = s => String(s).split('-').map(Number);
  const utc = s => { const [y, m, d] = parts(s); return Date.UTC(y, m - 1, d); };
  const daysFrom = s => Math.round((utc(s) - utc(TODAY)) / 864e5);
  const dowOf = s => DOW[new Date(utc(s)).getUTCDay()];
  const mon = s => MON[parts(s)[1] - 1];
  const day = s => parts(s)[2];
  const when = c => {
    const [y] = parts(c.date);
    if (c.endDate) return `${mon(c.date)} ${day(c.date)} – ${mon(c.endDate) === mon(c.date) ? '' : mon(c.endDate) + ' '}${day(c.endDate)}, ${y}`;
    return `${mon(c.date)} ${day(c.date)}, ${y}`;
  };
  const clock = t => { if (!t) return ''; const [h, m] = String(t).split(':').map(Number); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`; };

  /* ---------- names, photos and made-up covers ---------- */
  // an artist's photo lives at static/img/artists/<slug>.jpg, e.g. "Aminé" → amine.jpg, "D’Banj" → dbanj.jpg
  const slug = name => String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const artistPhoto = name => name ? `static/img/artists/${slug(name)}.jpg` : null;
  const trackId = url => (String(url || '').match(/track\/([A-Za-z0-9]+)/) || [])[1] || null;
  const track = id => 'https://open.spotify.com/track/' + encodeURIComponent(id);
  const hash = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) >>> 0; return h; };
  const inkOf = c => { const n = parseInt(c.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#0f0f10' : '#ffffff'; };
  const initials = name => String(name).split('(')[0].trim().split(/\s+/).slice(0, 2).map(w => [...w][0] || '').join('').toUpperCase();
  const asText = v => Array.isArray(v) ? v.join(', ') : String(v);
  const COLORS = ['#2d5bff', '#ff3d8b', '#ff8a1f', '#8b5cff', '#d4f02a', '#14b8a6', '#ff4d3d', '#00a8ff', '#f72585', '#ffd60a', '#4c3bff', '#ff6bd6'];
  const PATS = ['pat-rings', 'pat-diag', 'pat-circles'];
  const look = seed => { const h = hash(seed), c = COLORS[h % COLORS.length]; return { c, k: inkOf(c), pat: PATS[(h >>> 3) % PATS.length] }; };
  const paint = el => {
    const L = look(el.dataset.seed);
    el.style.setProperty('--c', L.c); el.style.setProperty('--k', L.k);
    if (el.dataset.solid == null) { el.classList.remove(...PATS); el.classList.add(L.pat); }
  };
  const recolor = (el = root) => $$('[data-seed]', el).forEach(paint);
  const photo = (src, alt) => src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">` : '';
  const art = (cls, seed, label, src, alt, solid) =>
    `<span class="${cls} pl-cv ph${src ? ' has-photo' : ''}" data-seed="${esc(seed)}"${solid ? ' data-solid' : ''}><b>${esc(label)}</b>${photo(src, alt)}</span>`;
  root.addEventListener('error', e => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && root.contains(t)) { const box = t.closest('.ph, .pl-face'); if (box) box.classList.remove('has-photo'); t.remove(); }
  }, true);

  /* ---------- the data, from the YAML files in contents/ ---------- */
  function build(showsDoc, lists, introDoc, playlistDoc) {
    const shows = (Array.isArray(showsDoc) ? showsDoc : showsDoc.concerts || []).map(c => ({ ...c, date: iso(c.date), end_date: iso(c.end_date) }));
    const isUp = c => (c.end_date || c.date) >= TODAY;
    const up = shows.filter(isUp).sort((a, b) => utc(a.date) - utc(b.date)).map(c => ({
      artist: c.artist, date: c.date, time: c.time, venue: c.venue, city: c.city,
      maybe: String(c.status || '').toLowerCase() === 'maybe', friends: c.companions, tickets: c.link,
      song: c.song, songId: trackId(c.spotify), preview: c.preview || null, length: c.length, photo: artistPhoto(c.artist)
    }));
    const past = shows.filter(c => !isUp(c)).sort((a, b) => utc(b.date) - utc(a.date)).map(c => ({
      artist: c.artist, date: c.date, endDate: c.end_date || null, venue: c.venue, city: c.city, genre: c.genre,
      score: c.rating, price: c.price, friends: c.companions, pronoun: String(c.pronoun || '').trim().toLowerCase(),
      highlights: c.highlights, wishlist: c.wishlist, review: c.review, hook: c.hook,
      photo: c.photo || null, artistPhoto: c.seen_as ? artistPhoto(c.seen_as) : null
    }));

    // every artist I've seen: "(x3)" is how many times; a past show adds its performance to the artist in its seen_as
    const known = {};
    const add = (name, row) => (known[name] = known[name] || []).push(row);
    shows.filter(c => !isUp(c) && c.seen_as).forEach(c => add(String(c.seen_as), { year: c.date.slice(0, 4), score: c.rating ?? null, place: c.place || null }));
    Object.entries(lists.punch_details || {}).forEach(([name, rows]) => (rows || []).forEach(r =>
      add(name, { year: r.year != null ? String(r.year) : null, score: r.score ?? null, place: r.place || null, note: r.note || null })));
    // oldest first; a performance with no year is an older memory, so it goes first
    Object.values(known).forEach(rows => rows.sort((a, b) => (a.year || '0000').localeCompare(b.year || '0000')));
    const seen = (lists.seen || []).map(raw => {
      const m = String(raw).match(/^(.*?)\s*\(x(\d+)\)\s*$/);
      let name = m ? m[1] : String(raw), note = null;
      const count = m ? Number(m[2]) : 1;
      const n = name.match(/^(.*?)\s*\((.*)\)\s*$/);
      if (n) { name = n[1]; note = n[2]; }
      const punches = [...(known[name] || []), ...Array(count).fill(null)].slice(0, count);
      if (count === 1 && !note) note = (punches.find(p => p && p.note) || {}).note || null;
      return { name, note, count, punches, photo: artistPhoto(name) };
    });
    const checklist = block => ({
      title: (block || {}).title || '',
      artists: ((block || {}).artists || []).map(raw => {
        const typed = String(raw), name = typed.replace(/\s*✅️?/g, '').trim();
        const n = name.match(/^(.*?)\s*\((.*)\)\s*$/);
        return { typed, name: n ? n[1] : name, seen: typed.includes('✅'), photo: artistPhoto(n ? n[1] : name) };
      })
    });
    // favourites name artists in their own styling; "Aminé" finds "Amine" in seen by its slug
    const bySlug = Object.fromEntries(seen.map(a => [slug(a.name), a]));
    const favConcerts = (lists.fav_concerts || []).map(fc => {
      const a = bySlug[slug(fc.artist)] || { punches: [] };
      const p = a.punches.find(p => p && String(p.year) === String(fc.year) && p.place === fc.place) || {};
      return { name: fc.artist, photo: artistPhoto(fc.artist), year: fc.year, place: fc.venue || fc.place, score: p.score ?? null, rank: fc.rank, review: fc.review };
    });
    const songOf = s => s && { title: s.title, artists: s.artists, id: trackId(s.spotify), preview: s.preview || null, length: s.length };
    const intro = introDoc || {};
    return {
      intro: intro.intro || '', me: intro.photo || null, hollup: songOf(intro.hollup), credits: intro.credits || '',
      shoutout: intro.shoutout ? { text: String(intro.shoutout), name: intro.shoutout_name || '', link: intro.shoutout_link || '' } : null,
      songs: ((playlistDoc || {}).songs || []).map(songOf).filter(s => s.id),
      up, past, seen,
      dieList: checklist(lists.need_to_see), tagAlong: checklist(lists.tag_along),
      favArtists: (lists.fav_artists || []).map(name => ({ name, photo: artistPhoto(name) })),
      favArtistsAlso: (lists.fav_artists_also || []).map(name => ({ name, photo: artistPhoto(name) })),
      favConcerts,
      totals: { artists: seen.length, performances: seen.reduce((n, a) => n + a.count, 0) }
    };
  }

  /* ---------- side A ---------- */
  let D = null;
  const thisYear = () => parts(TODAY)[0];
  const seenThisYear = () => D.past.filter(s => parts(s.date)[0] === thisYear()).length;
  function tiles() {
    const most = D.seen.slice().sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0];
    const years = D.seen.flatMap(a => a.punches).filter(p => p && p.year).map(p => Number(p.year));
    const backs = [['artists', D.totals.artists], ['performances', D.totals.performances], most ? [most.name, '×' + most.count] : ['', ''], ['live since', years.length ? Math.min(...years) : thisYear()]];
    const upTile = s => s && { seed: s.artist, small: s.artist, big: `${mon(s.date)} ${day(s.date)}`, photo: s.photo };
    const pastTile = s => s && { seed: s.artist, small: s.artist, big: `${s.score}/10`, photo: s.artistPhoto || s.photo };
    // the next two shows and the two latest past shows, preferring past shows that have an artist photo
    const shown = [...new Set([...D.past.filter(s => s.artistPhoto), ...D.past])];
    const fronts = [upTile(D.up[0]), pastTile(shown[0]), pastTile(shown[1]), upTile(D.up[1])];
    const spare = [...D.up.slice(2).map(upTile), ...shown.slice(2).map(pastTile)];
    return fronts.map((t, i) => ({ ...(t || spare.shift() || { seed: 'tile' + i, small: '', big: '' }), backSmall: backs[i][0], backBig: String(backs[i][1]) }));
  }
  const mosaic = () => tiles().map(t => `<span class="pl-tile"><span class="pl-face pl-cv${t.photo ? ' has-photo' : ''}" data-seed="${esc(t.seed)}">${t.photo ? `<img src="${esc(t.photo)}" alt="" decoding="async">` : ''}<small>${esc(t.small)}</small><b>${esc(t.big)}</b></span><span class="pl-face back"><small>${esc(t.backSmall)}</small><b>${esc(t.backBig)}</b></span></span>`).join('');

  function introHtml() {
    let songDone = false;
    const word = D.hollup && D.hollup.id ? new RegExp(`\\b${D.hollup.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`) : null;
    return String(D.intro).split('\n\n').map(par => {
      let h = esc(par);
      h = h.replace('click here', 'click <button class="pl-song-link" type="button" data-flip="b" aria-label="See every show and the lists">here</button>');
      if (word && !songDone && word.test(h)) {
        songDone = true;
        h = h.replace(word, `<button class="pl-song-link" type="button" data-song="hollup" aria-label="Play ${esc(D.hollup.title)}">${esc(D.hollup.title)}</button>`);
      }
      return `<p>${h.replace(/\n/g, '<br>')}</p>`;
    }).join('');
  }

  function upRow(s, i) {
    const n = daysFrom(s.date);
    const cd = n === 0 ? 'tonight' : n === 1 ? 'tomorrow' : n < 0 ? 'on now' : `${n} days`;
    const tix = /^https?:\/\//.test(s.tickets || '') ? `<a class="mx-tix" href="${esc(s.tickets)}" target="_blank" rel="noopener">Tickets</a>` : '';
    return `<li class="mx-up${s.maybe ? ' is-maybe' : ''}">
      <div class="mx-cal" aria-hidden="true"><span>${mon(s.date)}</span><b>${day(s.date)}</b><span>${dowOf(s.date)}</span></div>
      <div>
        <div class="mx-top">${art('mx-thumb', s.artist, initials(s.artist), s.photo, s.artist, true)}<h3>${esc(s.artist)}</h3>${s.maybe ? '<span class="mx-chip is-maybe">Maybe</span>' : ''}</div>
        <span class="mx-meta">${mon(s.date)} ${day(s.date)} · ${esc(s.venue)} · ${esc(s.city)}${s.time ? ' · ' + esc(clock(s.time)) : ''}</span>
        <div class="mx-line"><span class="mx-chip">${esc(cd)}</span><span>friends: ${esc(s.friends || 'TBD')}</span>${tix}</div>
        ${s.songId ? `<button class="mx-fav" type="button" data-song="up-${i}" aria-label="Play ${esc(s.song)}"><i>${PLAY}</i><span>${esc(s.song)}</span>${s.length ? `<em>${esc(s.length)}</em>` : ''}</button>` : ''}
      </div></li>`;
  }

  function pastRow(s, i) {
    const sc = Number(s.score);
    return `<li><button type="button" class="mx-past" data-i="${i}" aria-haspopup="dialog">
      ${art('mx-cov', s.artist, initials(s.artist), s.photo, s.artist)}
      <span class="mx-main"><b>${esc(s.artist)}</b><span class="mx-meta">${esc(when(s))} · ${esc(s.venue)}</span>${s.hook ? `<span class="mx-hl mx-hook">${esc(s.hook)}</span>` : s.highlights ? `<span class="mx-hl">${esc(asText(s.highlights))}</span>` : ''}</span>
      <span class="mx-score" aria-label="${sc} out of 10"><b>${sc || '–'}</b><small>/10</small></span>
    </button></li>`;
  }

  function sideA() {
    return `<header class="pl-head">
        <button class="pl-mosaic" type="button" aria-label="Turn the cover over">${mosaic()}</button>
        <h1 class="pl-title">concerts</h1>
        <p class="pl-meta"><b>${D.up.length}</b> upcoming · <b>${seenThisYear()}</b> seen this year</p>
      </header>
      <section class="mx-blk" aria-label="Upcoming">
        <h2 class="mx-h"><span class="pl-lt">upcoming</span> <small>${D.up.length} ${D.up.length === 1 ? 'show' : 'shows'}</small></h2>
        <ol class="mx-list">${D.up.length ? D.up.map(upRow).join('') : '<li class="empty">Nothing booked yet.</li>'}</ol>
      </section>
      <section class="mx-blk" aria-label="Been there">
        <h2 class="mx-h"><span class="pl-lt">been there</span> <small>${thisYear()}</small></h2>
        <ol class="mx-list">${D.past.map(pastRow).join('')}</ol>
      </section>
      ${shout()}`;
  }
  // the thank-you line at the very bottom of each side
  function shout() {
    const s = D.shoutout; if (!s) return '';
    let h = esc(s.text);
    if (s.name && /^https?:\/\//.test(s.link)) h = h.replace(esc(s.name), `<a href="${esc(s.link)}" target="_blank" rel="noopener">${esc(s.name)}</a>`);
    return `<p class="pl-shout">${h}</p>`;
  }

  /* ---------- a past show's sheet ---------- */
  let sheetFrom = null;
  function story(c) {
    const f = c.friends, p = c.price && String(c.price).trim();
    const who = !f ? '' : /^(alone|solo)$/i.test(f) ? 'I went solo' : `I went with <b>${esc(f)}</b>`;
    const paid = !p ? '' : /^free\b/i.test(p) ? 'got in free' : `paid <b>${esc(p)}</b>`;
    if (who && paid) return `${who} and ${paid}.`;
    if (who) return `${who}.`;
    return paid ? `I ${paid}.` : '';
  }
  function openSheet(i, from) {
    const s = D.past[i]; if (!s) return;
    const sc = Number(s.score);
    const wish = s.pronoun === 'he' ? 'Wish He Performed' : s.pronoun === 'she' ? 'Wish She Performed' : "Wish I'd Heard";
    const sets = [];
    if (s.highlights) sets.push(`<div><dt>The highlights</dt><dd>${esc(asText(s.highlights))}</dd></div>`);
    if (s.wishlist) sets.push(`<div><dt>${wish}</dt><dd>${esc(asText(s.wishlist))}</dd></div>`);
    const review = s.review ? `<details class="mx-rev"><summary>Read my review</summary>${String(s.review).split('\n').filter(l => l.trim()).map(l => `<p>${esc(l)}</p>`).join('')}</details>` : '';
    const sh = $('.mx-sheet');
    sh.innerHTML = `<div class="mx-grab" aria-hidden="true"></div>
      <button type="button" class="mx-x" aria-label="Close">✕</button>
      ${art('mx-shcov', s.artist, initials(s.artist), s.photo, s.artist)}
      ${s.genre ? `<p class="mx-kick">${esc(s.genre)}</p>` : ''}
      <h3 class="mx-shtitle">${esc(s.artist)}</h3>
      <span class="mx-meta">${esc(s.venue)}, ${esc(s.city)} · ${esc(when(s))}</span>
      <div class="mx-shscore"><b>${sc || '–'}</b><span>/10</span></div>
      ${story(s) ? `<p class="mx-said">${story(s)}</p>` : ''}
      ${sets.length ? `<dl class="mx-sets">${sets.join('')}</dl>` : ''}
      ${review}`;
    recolor(sh);
    sheetFrom = from || null;
    sh.hidden = false; sh.scrollTop = 0;
    $('.mx-x', sh).focus({ preventScroll: true });
  }
  function closeSheet(restore = true) {
    const sh = $('.mx-sheet');
    if (sh.hidden) return;
    sh.hidden = true;
    if (restore && sheetFrom && root.contains(sheetFrom)) sheetFrom.focus({ preventScroll: true });
    sheetFrom = null;
  }

  /* ---------- side B ---------- */
  let sortBy = 'az';
  function pinned(list, key) {
    const seenN = list.artists.filter(a => a.seen).length;
    return `<div class="pl-pin mx-${key}" data-pin="${key}">
      <button class="pl-pin-main" type="button" aria-expanded="false" aria-controls="pin-${key}">
        <span class="pl-pin-art pl-cv" data-seed="pinned-${key}">${key === 'die' ? STAR : NOTE}</span>
        <span><span class="pl-t">${esc(list.title)}</span>
          <span class="pl-pin-sub">${list.artists.length} artists${key === 'die' ? ` · <i>${seenN} seen</i>` : ''}</span></span>
        <span class="pl-caret" aria-hidden="true">›</span>
      </button>
      <ul class="pl-pin-list" id="pin-${key}" hidden>${list.artists.map(a => `<li class="${a.seen ? 'is-seen' : ''}">${art('mx-av', a.name, initials(a.name), a.photo, a.name, true)}${key === 'die' ? `<span class="mx-nm">${esc(a.typed.replace(/\s*✅️?/g, ''))}</span>${a.seen ? '<span class="vh"> (seen)</span>' : ''}` : `<span>${esc(a.typed)}</span>`}</li>`).join('')}</ul>
    </div>`;
  }
  const holeCls = n => Number(n) === 10 ? ' is-10' : Number(n) === 9 ? ' is-9' : '';
  function punch(p) {
    if (!p) return '<span class="pl-hole" role="img" aria-label="a performance"></span>';
    const label = ['a performance', p.year, p.score != null ? p.score + ' out of 10' : '', p.place].filter(Boolean).join(', ');
    return `<span class="pl-punch" role="img" aria-label="${esc(label)}"><i class="pl-yr" aria-hidden="true">${esc(p.year || '')}</i><span class="pl-hole${holeCls(p.score)}" aria-hidden="true">${p.score == null ? '' : esc(p.score)}</span><i class="pl-pl" aria-hidden="true">${esc(p.place || '')}</i></span>`;
  }
  // scores out of 10 on an artist's performances; artists with none sort last
  const scoresOf = a => a.punches.filter(p => p && p.score != null).map(p => Number(p.score));
  const topScore = a => scoresOf(a).length ? Math.max(...scoresOf(a)) : -1;
  const avgScore = a => scoresOf(a).length ? scoresOf(a).reduce((x, y) => x + y, 0) / scoresOf(a).length : -1;
  const fmtAvg = n => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');
  function artistRows() {
    const byName = (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    const sorts = {
      az: byName,
      most: (a, b) => b.count - a.count || byName(a, b),
      top: (a, b) => topScore(b) - topScore(a) || avgScore(b) - avgScore(a) || b.count - a.count || byName(a, b),
      avg: (a, b) => avgScore(b) - avgScore(a) || topScore(b) - topScore(a) || b.count - a.count || byName(a, b)
    };
    return D.seen.slice().sort(sorts[sortBy] || byName).map(a => `<li class="pl-artist${a.punches.some(p => p && p.year) ? ' has-yr' : ''}${a.punches.some(p => p && p.place) ? ' has-pl' : ''}">
      ${art('pl-ava', a.name, [...a.name][0] || '', a.photo, a.name, true)}
      <span class="pl-an">${esc(a.name)}${a.note ? ` <small>${esc(a.note)}</small>` : ''}</span>
      <span class="pl-ac">${sortBy === 'avg' && scoresOf(a).length ? `${fmtAvg(avgScore(a))} avg` : `×${a.count}`}</span>
      <span class="pl-holes" aria-label="${a.count} ${a.count === 1 ? 'performance' : 'performances'}">${a.punches.map(punch).join('')}</span>
    </li>`).join('');
  }
  function sideB() {
    return `<div class="pl-b-head"><h2><span class="pl-lt">all-time</span></h2><p>${D.totals.artists} artists · ${D.totals.performances} performances</p></div>
      <div class="mx-chips" role="group" aria-label="Show">
        <button class="mx-fchip" type="button" data-filter="all" aria-pressed="true">all</button>
        <button class="mx-fchip" type="button" data-filter="die" aria-pressed="false">need to see</button>
        <button class="mx-fchip" type="button" data-filter="tag" aria-pressed="false">tag along</button>
        <button class="mx-fchip" type="button" data-filter="seen" aria-pressed="false">seen</button>
      </div>
      ${pinned(D.dieList, 'die')}
      ${pinned(D.tagAlong, 'tag')}
      <div class="mx-seenwrap">
        <div class="pl-sort"><h3><span class="pl-lt">artists i've seen</span></h3>
          <button class="pl-sortbtn" type="button" data-sort="az" aria-pressed="true">A–Z</button>
          <button class="pl-sortbtn" type="button" data-sort="most" aria-pressed="false">Most seen</button>
          <button class="pl-sortbtn" type="button" data-sort="top" aria-pressed="false" aria-label="Highest rating">Highest</button>
          <button class="pl-sortbtn" type="button" data-sort="avg" aria-pressed="false" aria-label="Highest average rating">Highest avg</button>
        </div>
        <ul class="pl-artists">${artistRows()}</ul>
      </div>
      ${D.credits ? `<p class="pl-credits">${esc(D.credits)}</p>` : ''}
      ${shout()}`;
  }
  function setPin(key, open) {
    const pin = $(`.mx-${key}`);
    $('.pl-pin-main', pin).setAttribute('aria-expanded', String(open));
    $(`#pin-${key}`).hidden = !open;
    pin.classList.toggle('is-open', open);
  }
  function applyFilter(f) {
    $$('.mx-fchip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
    $('.mx-die').hidden = !(f === 'all' || f === 'die');
    $('.mx-tag').hidden = !(f === 'all' || f === 'tag');
    $('.mx-seenwrap').hidden = !(f === 'all' || f === 'seen');
    if (f === 'die') setPin('die', true);
    if (f === 'tag') setPin('tag', true);
  }

  /* ---------- about: the intro, fav artists and fav concerts ---------- */
  const favArtistRows = () => D.favArtists.map((a, i) => `<li class="pl-fav">
      <span class="pl-fav-n">${i + 1}</span>
      ${art('pl-fav-ava', a.name, [...a.name][0] || '', a.photo, a.name, true)}
      <span class="pl-fav-main"><b>${esc(a.name)}</b></span>
    </li>`).join('');
  const favAlso = () => D.favArtistsAlso.length ? `<ul class="pl-favs-also" aria-label="more fav artists">${D.favArtistsAlso.map(a => `<li>
      ${art('pl-fav-ava', a.name, [...a.name][0] || '', a.photo, a.name, true)}
      <small>${esc(a.name)}</small>
    </li>`).join('')}</ul>` : '';
  // a fav concert opens to its short review, word for word; one open at a time keeps the view on one screen
  const favConcertRows = () => D.favConcerts.map((c, i) => `<li>
      <button class="pl-fav pl-fav-btn" type="button" aria-expanded="false" aria-controls="fc-${i}"${c.review ? '' : ' disabled'}>
        <span class="pl-fav-n">${esc(c.rank != null ? c.rank : i + 1)}</span>
        ${art('pl-fav-ava', c.name, [...c.name][0] || '', c.photo, c.name, true)}
        <span class="pl-fav-main"><b>${esc(c.name)}</b><small>${esc(c.place)} · ${esc(c.year)}</small></span>
        ${c.score != null ? `<span class="pl-hole${holeCls(c.score)}" role="img" aria-label="${esc(c.score)} out of 10">${esc(c.score)}</span>` : '<span></span>'}
        ${c.review ? '<span class="pl-caret" aria-hidden="true">›</span>' : ''}
      </button>
      ${c.review ? `<div class="pl-fav-rev" id="fc-${i}" hidden>${String(c.review).split('\n').map(l => `<p>${esc(l)}</p>`).join('')}</div>` : ''}
    </li>`).join('');
  function aboutHtml() {
    return `<button class="pl-about-close" type="button" aria-label="Close about"><b aria-hidden="true">×</b> close</button>
      <div class="pl-about-head">
        ${D.me ? `<span class="pl-me ph has-photo">${photo(D.me, '')}</span>` : ''}
        <div><h2 tabindex="-1">about</h2>
        <p class="pl-about-sub">${D.up.length} upcoming · ${seenThisYear()} seen this year · ${D.totals.artists} artists all-time</p></div>
      </div>
      <div class="pl-ab-tabs" role="tablist" aria-label="About">
        <button class="pl-ab-tab" type="button" role="tab" aria-selected="true" aria-controls="ab-intro" data-panel="intro">about</button>
        ${D.favArtists.length ? '<button class="pl-ab-tab" type="button" role="tab" aria-selected="false" aria-controls="ab-artists" data-panel="artists">fav artists</button>' : ''}
        ${D.favConcerts.length ? '<button class="pl-ab-tab" type="button" role="tab" aria-selected="false" aria-controls="ab-concerts" data-panel="concerts">fav concerts</button>' : ''}
      </div>
      <div class="pl-desc" id="ab-intro" role="tabpanel" data-panel="intro">${introHtml()}</div>
      <div id="ab-artists" role="tabpanel" aria-label="fav artists" data-panel="artists" hidden><ol class="pl-favs">${favArtistRows()}</ol>${favAlso()}</div>
      <ol class="pl-favs" id="ab-concerts" role="tabpanel" aria-label="fav concerts" data-panel="concerts" hidden>${favConcertRows()}</ol>`;
  }
  function toggleFavReview(btn) {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    $$('#ab-concerts .pl-fav-btn').forEach(b => {
      const on = b === btn && open, rev = document.getElementById(b.getAttribute('aria-controls'));
      b.setAttribute('aria-expanded', String(on)); if (rev) rev.hidden = !on;
    });
  }
  function showAboutPanel(name) {
    $$('.pl-ab-tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.panel === name)));
    $$('.pl-about [role="tabpanel"]').forEach(el => { el.hidden = el.dataset.panel !== name; });
    fitAbout();
  }
  // the intro should fit one screen: if it runs past the bottom, the text steps down a size (twice at most).
  // The screen is measured with the browser's bars showing (100svh), and the size is picked again only when the width
  // changes: picking it on every height change made it flip back and forth in Instagram's browser, whose top bar slides
  // in and out as the page changes height, which changed the size again.
  function screenHeight() {
    const probe = document.createElement('div');
    probe.style.cssText = 'height: 100svh; left: 0; pointer-events: none; position: fixed; top: 0; visibility: hidden;';
    document.body.append(probe);
    const h = probe.offsetHeight || window.innerHeight;
    probe.remove();
    return h;
  }
  let fitWidth = 0;
  function fitAbout() {
    root.classList.remove('is-tight', 'is-tighter');
    const intro = $('#ab-intro'), foot = intro && intro.lastElementChild;
    if (!intro || intro.hidden || !foot) return;
    fitWidth = window.innerWidth;
    const about = $('.pl-about'), before = foot.previousElementSibling, h = screenHeight();
    // about is a screen tall at least and pushes the footnote to its bottom; the text fits if it would without that push
    const push = () => Math.max(0, foot.offsetTop - (before ? before.offsetTop + before.offsetHeight + (parseFloat(getComputedStyle(intro).rowGap) || 0) : intro.offsetTop));
    const over = () => about.offsetHeight - push() > h + 1;
    if (over()) root.classList.add('is-tight');
    if (over()) root.classList.add('is-tighter');
  }
  let aboutOpener = null, aboutScroll = 0;
  const aboutOpen = () => !$('.pl-about').hidden;
  function openAbout(opener) {
    closeSheet(false);
    aboutOpener = opener || null;
    aboutScroll = window.scrollY;
    $('.pl-a').hidden = true; $('.pl-b').hidden = true; $('.pl-about').hidden = false;
    root.classList.add('is-about'); $('.pl-who').setAttribute('aria-expanded', 'true');
    window.scrollTo(0, 0); fitAbout();
    $('.pl-about-close').focus({ preventScroll: true });
  }
  function closeAbout(restore = true) {
    if (!aboutOpen()) return;
    $('.pl-about').hidden = true;
    $('.pl-a').hidden = root.dataset.side !== 'a'; $('.pl-b').hidden = root.dataset.side !== 'b';
    root.classList.remove('is-about'); $('.pl-who').setAttribute('aria-expanded', 'false');
    if (restore) { window.scrollTo(0, aboutScroll); if (aboutOpener) aboutOpener.focus({ preventScroll: true }); }
    aboutOpener = null;
  }

  function flip(to) {
    closeAbout(false); closeSheet(false);
    const side = to || (root.dataset.side === 'a' ? 'b' : 'a');
    root.dataset.side = side;
    $('.pl-a').hidden = side !== 'a';
    $('.pl-b').hidden = side !== 'b';
    const rec = $('.pl-rec');
    rec.classList.remove('is-turning'); void rec.offsetWidth; rec.classList.add('is-turning');
    setTimeout(() => { rec.querySelector('span').textContent = side.toUpperCase(); }, 200);
    setTimeout(() => rec.classList.remove('is-turning'), 520);
    rec.setAttribute('aria-label', side === 'a' ? 'Flip to side B' : 'Flip to side A');
    window.scrollTo(0, 0);
  }

  /* ---------- the player: the bar at the bottom is the only one ---------- */
  // It plays Spotify's own 30-second clip of each song (the song's `preview` link) in the page, so nothing else ever
  // shows up to play it (docs/adr/0002). A song without a clip opens on Spotify instead.
  let queue = [], cur = null;
  const history = [];
  const audio = new Audio();
  audio.preload = 'none';
  let loaded = null; // the id of the song in the audio element
  function randomSong() { let s = cur; while (queue.length > 1 && s === cur) s = queue[Math.floor(Math.random() * queue.length)]; return s || queue[0]; }
  function mini() {
    return `<div class="pl-mini-swipe" aria-roledescription="swipe to change song" tabindex="0"><span class="pl-mini-cover"></span><div style="min-width:0"><div class="pl-mini-t"></div><div class="pl-mini-a"></div></div></div>
      <button class="pl-icon pl-mini-next" type="button" aria-label="Next song">${NEXT}</button>
      <button class="pl-mini-play" type="button">${PLAY}</button>
      <span class="pl-mini-bar" aria-hidden="true"><i></i></span>`;
  }
  const songFor = key => {
    if (key === 'hollup') return D.hollup;
    const s = /^up-\d+$/.test(key || '') ? D.up[Number(key.slice(3))] : null;
    return s && s.songId ? { title: s.song, artists: s.artist, id: s.songId, preview: s.preview, length: s.length } : null;
  };
  function showState() {
    if (!cur) return;
    const on = !audio.paused && loaded === cur.id;
    const btn = $('.pl-mini-play');
    btn.innerHTML = on ? PAUSE : PLAY;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-label', `${on ? 'Pause' : 'Play'} ${cur.title} by ${cur.artists}`);
    $$('.mx-fav').forEach(b => {
      const s = songFor(b.dataset.song), mine = on && s && s.id === cur.id;
      b.querySelector('i').innerHTML = mine ? PAUSE : PLAY;
      b.classList.toggle('is-on', Boolean(mine));
    });
  }
  // a song's album art lives at static/img/songs/<Spotify track id>.jpg
  const songArt = id => `static/img/songs/${encodeURIComponent(id)}.jpg`;
  function paintSong() {
    if (!cur) return;
    const id = cur.id;
    $('.pl-mini-cover').innerHTML = art('pl-cover', id, [...cur.title][0] || '', songArt(id), '', true);
    paint($('.pl-mini-cover [data-seed]'));
    $('.pl-mini-t').textContent = cur.title;
    $('.pl-mini-a').textContent = cur.artists;
    $('.pl-mini-bar i').style.setProperty('--pct', '0%');
    // the song's colour tints the header, the about page and the player: a made-up one first, then the album art's own
    root.style.setProperty('--hc', look(id).c);
    const img = $('.pl-mini-cover img');
    if (img) {
      const tint = () => { const c = artColour(img); if (c && cur && cur.id === id) root.style.setProperty('--hc', c); };
      if (img.complete && img.naturalWidth) tint(); else img.addEventListener('load', tint, { once: true });
    }
    showState();
  }
  // keeps the colour's hue but lifts dull or very dark ones, so the header reads like Spotify's (greys stay grey)
  function lively(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l0 = (max + min) / 2, d = max - min;
    let h = 0, s0 = d ? d / (1 - Math.abs(2 * l0 - 1)) : 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const s = s0 < 0.08 ? s0 : Math.max(s0, 0.45), l = Math.min(Math.max(l0, 0.34), 0.58);
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h % 2 + 2) % 2 - 1)), m = l - c / 2;
    const [R, G, B] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
    const hex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${hex(R)}${hex(G)}${hex(B)}`;
  }
  // the album art's main colour: an average that leans on its most colourful, mid-bright pixels
  function artColour(img) {
    try {
      const cv = document.createElement('canvas'); cv.width = cv.height = 24;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0, 24, 24);
      const px = cx.getImageData(0, 0, 24, 24).data;
      let r = 0, g = 0, b = 0, w = 0;
      for (let i = 0; i < px.length; i += 4) {
        const R = px[i], G = px[i + 1], B = px[i + 2], max = Math.max(R, G, B), min = Math.min(R, G, B);
        const sat = max ? (max - min) / max : 0, lum = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
        const k = 0.02 + sat * sat * (lum > 0.12 && lum < 0.9 ? 1 : 0.15);
        r += R * k; g += G * k; b += B * k; w += k;
      }
      return lively(r / w, g / w, b / w);
    } catch (err) {
      return null;
    }
  }
  function setSong(s, record = true) {
    if (!s || (cur && s.id === cur.id)) return;
    if (record && cur) history.push(cur);
    const keepPlaying = !audio.paused;
    cur = s; paintSong();
    if (keepPlaying) play(); else audio.pause();
  }
  const nextSong = () => setSong(randomSong());
  const prevSong = () => { if (history.length) setSong(history.pop(), false); };

  // play() runs inside the tap itself, which is what lets phones start the sound
  function play() {
    if (!cur) return;
    if (!cur.preview) { audio.pause(); window.open(track(cur.id), '_blank', 'noopener'); return; }
    if (loaded !== cur.id) { audio.src = cur.preview; loaded = cur.id; }
    $('.pl-mini-play').classList.add('is-loading');
    audio.play().catch(() => $('.pl-mini-play').classList.remove('is-loading'));
  }
  function togglePlay() {
    if (cur && loaded === cur.id && !audio.paused) audio.pause(); else play();
  }
  function playSong(s) {
    if (!s || !s.id) return;
    if (cur && s.id === cur.id) return togglePlay();
    if (cur) history.push(cur);
    cur = s; paintSong();
    play();
  }
  const bar = () => { const d = audio.duration; $('.pl-mini-bar i').style.setProperty('--pct', `${d ? audio.currentTime / d * 100 : 0}%`); };
  audio.addEventListener('timeupdate', bar);
  audio.addEventListener('playing', () => { $('.pl-mini-play').classList.remove('is-loading'); showState(); });
  audio.addEventListener('waiting', () => $('.pl-mini-play').classList.add('is-loading'));
  audio.addEventListener('pause', showState);
  audio.addEventListener('ended', () => { audio.currentTime = 0; bar(); showState(); });
  audio.addEventListener('error', () => { $('.pl-mini-play').classList.remove('is-loading'); showState(); });

  function wireSwipe() {
    const sw = $('.pl-mini-swipe');
    let x0 = null, dx = 0;
    sw.addEventListener('pointerdown', e => { x0 = e.clientX; dx = 0; sw.classList.add('is-drag'); sw.setPointerCapture(e.pointerId); });
    sw.addEventListener('pointermove', e => { if (x0 === null) return; dx = e.clientX - x0; sw.style.transform = `translateX(${dx}px)`; sw.style.opacity = String(1 - Math.min(Math.abs(dx) / 220, .6)); });
    const end = () => {
      if (x0 === null) return;
      x0 = null; sw.classList.remove('is-drag');
      if (dx < -48) nextSong(); else if (dx > 48) prevSong();
      sw.style.transition = 'transform .25s ease, opacity .25s ease';
      sw.style.transform = ''; sw.style.opacity = '';
      setTimeout(() => { sw.style.transition = ''; }, 260);
    };
    sw.addEventListener('pointerup', end);
    sw.addEventListener('pointercancel', end);
    sw.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') nextSong(); if (e.key === 'ArrowRight') prevSong(); });
  }

  /* ---------- events ---------- */
  root.addEventListener('click', e => {
    const t = e.target;
    if (!D) return;
    if (t.closest('.pl-rec')) return flip();
    if (t.closest('[data-flip="b"]')) return flip('b');
    if (t.closest('[data-song]')) return playSong(songFor(t.closest('[data-song]').dataset.song));
    if (t.closest('.pl-who')) return openAbout(t.closest('.pl-who'));
    if (t.closest('.pl-about-close')) return closeAbout();
    const favBtn = t.closest('.pl-fav-btn');
    if (favBtn) return toggleFavReview(favBtn);
    const abTab = t.closest('.pl-ab-tab');
    if (abTab) return showAboutPanel(abTab.dataset.panel);
    const mosaicBtn = t.closest('.pl-mosaic');
    if (mosaicBtn) {
      // restart the swing, and swap sides (the CSS does the swap halfway through each tile's swing)
      mosaicBtn.classList.remove('is-flipping'); void mosaicBtn.offsetWidth; mosaicBtn.classList.add('is-flipping');
      return mosaicBtn.classList.toggle('is-turned');
    }
    if (t.closest('.mx-x')) return closeSheet();
    const row = t.closest('.mx-past');
    if (row) return openSheet(Number(row.dataset.i), row);
    if (t.closest('.pl-mini-next')) return nextSong();
    if (t.closest('.pl-mini-play')) return togglePlay();
    const chip = t.closest('.mx-fchip');
    if (chip) return applyFilter(chip.dataset.filter);
    const pin = t.closest('.pl-pin-main');
    if (pin) return setPin(pin.parentElement.dataset.pin, pin.getAttribute('aria-expanded') !== 'true');
    const sb = t.closest('.pl-sortbtn');
    if (sb) {
      sortBy = sb.dataset.sort;
      $$('.pl-sortbtn').forEach(b => b.setAttribute('aria-pressed', String(b === sb)));
      $('.pl-artists').innerHTML = artistRows();
      recolor($('.pl-artists'));
    }
  });
  root.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('.mx-sheet').hidden) { e.preventDefault(); closeSheet(); }
    else if (aboutOpen()) { e.preventDefault(); closeAbout(); }
  });
  window.addEventListener('resize', () => { if (D && aboutOpen() && window.innerWidth !== fitWidth) fitAbout(); });

  /* ---------- load ---------- */
  // a preview can hand the files over in window.CONCERTS_FILES instead of the page fetching them
  const load = path => (window.CONCERTS_FILES && path in window.CONCERTS_FILES ? Promise.resolve(window.CONCERTS_FILES[path])
    : fetch(path).then(r => { if (!r.ok) throw new Error(path); return r.text(); })).then(t => jsyaml.load(t) || {});
  Promise.all([load('contents/concerts.yml'), load('contents/artists.yml'), load('contents/intro.yml'), load('contents/playlist.yml').catch(() => ({}))])
    .then(([shows, lists, intro, playlist]) => {
      D = build(shows, lists, intro, playlist);
      if (D.me) $('.pl-who-face').innerHTML = `<img src="${esc(D.me)}" alt="">`;
      $('.pl-a').innerHTML = sideA();
      $('.pl-b').innerHTML = sideB();
      $('.pl-about').innerHTML = aboutHtml();
      $('.pl-mini-in').innerHTML = mini();
      queue = D.songs.length ? D.songs : [D.hollup, ...D.up.map((s, i) => songFor('up-' + i))].filter(s => s && s.id);
      cur = queue[Math.floor(Math.random() * queue.length)] || null;
      if (!cur) $('.pl-mini-in').hidden = true;
      recolor(); paintSong(); wireSwipe();
    })
    .catch(() => {
      $('.pl-a').innerHTML = '<p class="empty" style="padding: 80px 16px">The concert list could not be loaded. Check that the files in <code>contents/</code> are there.</p>';
    });
})();
