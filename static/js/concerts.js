(function () {
    // In a preview (an artifact), data is inlined and Spotify can't be embedded, so play buttons link out instead.
    const PREVIEW = window.CONCERTS_PREVIEW === true;
    const DAY = 864e5;
    const upcomingList = document.getElementById('upcoming');
    const reviewList = document.getElementById('reviews');

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[character]));
    }

    function parseDate(value) {
        if (value instanceof Date) return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 12);
        const [year, month, day] = String(value).split('-').map(Number);
        return new Date(year, month - 1, day, 12);
    }

    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    const daysUntil = value => Math.round((parseDate(value) - noon) / DAY);
    const isUpcoming = concert => daysUntil(concert.end_date || concert.date) >= 0;
    const format = (date, options) => date.toLocaleDateString('en-US', options);
    const countdown = days => days === 0 ? 'Tonight!' : days === 1 ? 'Tomorrow!' : `${days} days to go`;
    const asText = value => Array.isArray(value) ? value.join(', ') : String(value);
    const paragraphs = text => String(text).split('\n').filter(line => line.trim()).map(line => `<p>${escapeHtml(line)}</p>`).join('');

    function displayTime(time) {
        if (!time) return '';
        const [hours, minutes] = String(time).split(':').map(Number);
        return `${hours % 12 || 12}${minutes ? ':' + String(minutes).padStart(2, '0') : ''} ${hours < 12 ? 'AM' : 'PM'}`;
    }

    function trackUri(url) {
        const match = String(url || '').match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]+)/);
        return match ? `spotify:track:${match[1]}` : '';
    }

    function clock(seconds) {
        const total = Math.max(0, Math.floor(seconds || 0));
        return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    }

    function parseLength(value) {
        if (!value) return 0;
        const [minutes, seconds] = String(value).split(':').map(Number);
        return minutes * 60 + (seconds || 0);
    }

    // "he" or "she" from the YAML; shows without one (bands, festivals) get wording that needs no pronoun.
    const pronounFor = concert => ({ he: 'he', she: 'she' })[String(concert.pronoun || '').trim().toLowerCase()] || '';

    const ICONS = '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6L19 12z"/></svg><svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 5h4v14h-4zM13.5 5h4v14h-4z"/></svg>';

    // A song card with its own play/pause button, seek bar and times. On the live site it drives a hidden Spotify embed.
    function songPlayer(concert) {
        const uri = trackUri(concert.spotify);
        if (!concert.song && !uri) {
            return PREVIEW ? '<div class="player tbd"><span class="pp" aria-hidden="true">' + ICONS + '</span><div class="pl-main"><div class="pl-title">Song TBD</div></div></div>' : '';
        }
        const song = escapeHtml(concert.song || 'Play on Spotify');
        const href = escapeHtml(concert.spotify || `https://open.spotify.com/search/${encodeURIComponent(`${concert.artist} ${concert.song}`)}`);
        const length = parseLength(concert.length);
        const live = uri && !PREVIEW;
        const button = live
            ? `<button class="pp" type="button" aria-label="Play ${song}">${ICONS}</button>`
            : `<a class="pp" href="${href}" target="_blank" rel="noopener" aria-label="Play ${song} on Spotify">${ICONS}</a>`;
        return `<div class="player"${live ? ` data-uri="${uri}" data-length="${length}"` : ''}>
            ${button}
            <div class="pl-main">
                <span class="pl-label">My favorite song</span>
                <div class="pl-top"><span class="pl-title">${song}</span><a class="pl-src" href="${href}" target="_blank" rel="noopener">Spotify ↗</a></div>
                <div class="pl-bar"><span class="pl-cur">0:00</span><input class="pl-seek" type="range" min="0" max="${length || 100}" step="1" value="0" aria-label="Seek in ${song}"${live ? '' : ' disabled'}><span class="pl-dur">${length ? clock(length) : '--:--'}</span></div>
                <div class="pl-note" hidden></div>
            </div>
            ${live ? '<div class="pl-embed"><div></div></div>' : ''}
        </div>`;
    }

    function upcomingRow(concert) {
        const date = parseDate(concert.date);
        const where = [concert.venue, concert.city, displayTime(concert.time)].filter(Boolean).map(escapeHtml).join(' · ');
        const company = !concert.companions ? '' : /^tbd$/i.test(concert.companions) ? "Who's coming with me: TBD" : `Going with ${escapeHtml(concert.companions)}`;
        const extra = [company, concert.notes && escapeHtml(concert.notes)].filter(Boolean).join(' · ');
        const maybe = /^maybe$/i.test(String(concert.status || '').trim()) ? '<span class="maybe">Maybe</span>' : '';
        const tickets = /^https?:\/\//i.test(concert.link || '') ? `<a href="${escapeHtml(concert.link)}" target="_blank" rel="noopener">Tickets ↗</a>` : '';
        return `<li class="show">
            <div class="when"><div class="mon">${format(date, { month: 'short' })}</div><div class="day">${date.getDate()}</div><div class="dow">${format(date, { weekday: 'short' })}</div></div>
            <div class="show-main">
                <h3 class="show-artist">${escapeHtml(concert.artist)}</h3>
                <div class="show-meta">${where}</div>
                ${extra ? `<div class="show-meta">${extra}</div>` : ''}
                <div class="show-actions"><span class="countdown">${countdown(daysUntil(concert.date))}</span>${maybe}${tickets}</div>
                ${songPlayer(concert)}
            </div>
        </li>`;
    }

    // The first sentence of a review, word for word, used as the pull quote.
    function openingLine(text) {
        const line = String(text).split('\n').find(part => part.trim()) || '';
        const match = line.match(/^.*?[.!?](?=\s|$)/);
        return (match ? match[0] : line).trim();
    }

    // "I went with Deep, Pelumi & Nem and paid ~$60."
    function story(concert) {
        const company = concert.companions;
        const price = concert.price && String(concert.price).trim();
        const who = !company ? '' : /^(alone|solo)$/i.test(company) ? 'I went solo' : `I went with <b>${escapeHtml(company)}</b>`;
        const paid = !price ? '' : /^free\b/i.test(price) ? 'got in free' : `paid <b>${escapeHtml(price)}</b>`;
        if (who && paid) return `${who} and ${paid}.`;
        if (who) return `${who}.`;
        return paid ? `I ${paid}.` : '';
    }

    function reviewCard(concert) {
        const date = parseDate(concert.date);
        const when = concert.end_date
            ? `${format(date, { month: 'short', day: 'numeric' })} – ${format(parseDate(concert.end_date), { month: 'short', day: 'numeric', year: 'numeric' })}`
            : format(date, { month: 'short', day: 'numeric', year: 'numeric' });
        const rating = Number(concert.rating);
        const best = rating === 10;
        const sets = [];
        if (concert.highlights) sets.push(`<div class="set"><dt>The highlights</dt><dd>${escapeHtml(asText(concert.highlights))}</dd></div>`);
        const pronoun = pronounFor(concert);
        if (concert.wishlist) sets.push(`<div class="set miss"><dt>${pronoun ? `I wish ${pronoun}'d played` : "I wish I'd heard"}</dt><dd>${escapeHtml(asText(concert.wishlist))}</dd></div>`);
        const opening = concert.review ? openingLine(concert.review) : '';
        const fullReview = concert.review && String(concert.review).trim() !== opening;
        const review = fullReview ? `<details class="review-body"><summary>Read my review</summary><div class="review-text">${paragraphs(concert.review)}</div></details>` : '';
        const notes = concert.notes ? `<div class="review-text">${paragraphs(concert.notes)}</div>` : '';
        const sentence = story(concert);
        return `<article class="review${best ? ' best' : ''}">
            <div class="review-head">
                <div class="score" aria-label="${rating ? `${rating} out of 10` : 'Not rated yet'}"><b>${rating || '–'}</b><small>/ 10</small></div>
                <div>
                    <div class="review-kicker label"><span>${escapeHtml(concert.genre || '')}</span>${best ? '<span class="badge">A perfect 10</span>' : ''}</div>
                    <h3 class="review-title">${escapeHtml(concert.artist)}</h3>
                    <div class="review-sub">${escapeHtml(concert.venue)}, ${escapeHtml(concert.city)} · ${escapeHtml(when)}</div>
                </div>
            </div>
            ${opening ? `<blockquote class="pull">“${escapeHtml(opening)}”</blockquote>` : ''}
            ${sentence ? `<p class="story">${sentence}</p>` : ''}
            ${sets.length ? `<dl class="sets">${sets.join('')}</dl>` : ''}
            ${notes}${review}
        </article>`;
    }

    function render(concerts) {
        const upcoming = concerts.filter(isUpcoming).sort((a, b) => parseDate(a.date) - parseDate(b.date));
        const past = concerts.filter(concert => !isUpcoming(concert)).sort((a, b) => parseDate(b.date) - parseDate(a.date));
        const rated = past.filter(concert => Number(concert.rating));
        const average = rated.length ? rated.reduce((total, concert) => total + Number(concert.rating), 0) / rated.length : 0;

        document.getElementById('stats').innerHTML = [
            `<span><strong>${upcoming.length}</strong>shows coming up</span>`,
            `<span><strong>${past.length}</strong>shows reviewed</span>`,
            rated.length ? `<span><strong>${average.toFixed(1)}</strong>my average score</span>` : ''
        ].join('');

        upcomingList.innerHTML = upcoming.length ? upcoming.map(upcomingRow).join('') : '<li class="empty">Nothing booked yet. Soon.</li>';
        reviewList.innerHTML = past.length ? past.map(reviewCard).join('') : '<div class="empty">No reviews yet.</div>';
    }

    // Spotify's embed API: https://developer.spotify.com/documentation/embeds/references/iframe-api
    let spotifyApi = null;
    function loadSpotifyApi() {
        if (!spotifyApi) {
            spotifyApi = new Promise((resolve, reject) => {
                window.onSpotifyIframeApiReady = resolve;
                const script = document.createElement('script');
                script.src = 'https://open.spotify.com/embed/iframe-api/v1';
                script.async = true;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        return spotifyApi;
    }

    function controllerFor(player) {
        if (!player.controllerPromise) {
            player.controllerPromise = loadSpotifyApi().then(api => new Promise(resolve => {
                api.createController(player.querySelector('.pl-embed > div'), { uri: player.dataset.uri, width: '100%', height: 80 }, controller => {
                    controller.addListener('playback_update', event => showProgress(player, event.data));
                    controller.addListener('ready', () => resolve(controller));
                    setTimeout(() => resolve(controller), 4000);
                });
            }));
        }
        return player.controllerPromise;
    }

    function setBar(player, position, duration) {
        const seek = player.querySelector('.pl-seek');
        if (duration) {
            seek.max = duration;
            player.querySelector('.pl-dur').textContent = clock(duration);
        }
        seek.value = position;
        seek.style.setProperty('--pct', `${(position / (Number(seek.max) || 1)) * 100}%`);
        player.querySelector('.pl-cur').textContent = clock(position);
    }

    function showProgress(player, data) {
        const duration = data.duration / 1000;
        const position = Math.min(data.position / 1000, duration || Infinity);
        const ended = duration > 0 && position >= duration - 0.3;
        const playing = !data.isPaused && !ended;
        player.started = player.started || playing;
        player.ended = ended;
        player.classList.toggle('playing', playing);
        player.classList.toggle('loading', Boolean(data.isBuffering));
        player.querySelector('.pp').setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${player.querySelector('.pl-title').textContent}`);
        if (playing) clearTimeout(player.watchdog);
        if (!player.dragging) setBar(player, ended ? 0 : position, duration);
        const full = Number(player.dataset.length);
        const note = player.querySelector('.pl-note');
        if (full && duration && duration < full - 5) {
            note.textContent = 'Preview. Sign in to Spotify in this browser to hear the full song.';
            note.hidden = false;
        }
    }

    function pauseOthers(current) {
        document.querySelectorAll('.player.playing').forEach(player => {
            if (player !== current && player.controllerPromise) player.controllerPromise.then(controller => controller.pause());
        });
    }

    // If Spotify won't start from our button (some phones block it), show Spotify's own player instead.
    function armWatchdog(player) {
        clearTimeout(player.watchdog);
        player.watchdog = setTimeout(() => {
            if (player.classList.contains('playing')) return;
            player.classList.remove('loading');
            player.classList.add('show-embed');
        }, 6000);
    }

    async function togglePlayer(player) {
        pauseOthers(player);
        if (!player.controllerPromise) player.classList.add('loading');
        const controller = await controllerFor(player);
        if (player.classList.contains('playing')) {
            controller.pause();
        } else if (!player.started || player.ended) {
            armWatchdog(player);
            controller.play();
        } else {
            controller.resume();
        }
    }

    upcomingList.addEventListener('click', event => {
        const button = event.target.closest('.player[data-uri] .pp');
        if (button) togglePlayer(button.closest('.player'));
    });

    upcomingList.addEventListener('input', event => {
        if (!event.target.matches('.pl-seek')) return;
        const player = event.target.closest('.player');
        player.dragging = true;
        setBar(player, Number(event.target.value), 0);
    });

    upcomingList.addEventListener('change', async event => {
        if (!event.target.matches('.pl-seek')) return;
        const player = event.target.closest('.player');
        if (!player.dataset.uri) return;
        const target = Number(event.target.value);
        player.dragging = false;
        pauseOthers(player);
        const controller = await controllerFor(player);
        if (!player.started) {
            armWatchdog(player);
            controller.play();
            setTimeout(() => controller.seek(target), 800);
        } else {
            controller.seek(target);
        }
    });

    if (Array.isArray(window.CONCERTS_DATA)) {
        render(window.CONCERTS_DATA);
        return;
    }

    fetch('contents/concerts.yml')
        .then(response => {
            if (!response.ok) throw new Error('Could not load concerts');
            return response.text();
        })
        .then(text => {
            const data = jsyaml.load(text) || {};
            render(Array.isArray(data) ? data : (Array.isArray(data.concerts) ? data.concerts : []));
        })
        .catch(() => {
            const message = '<div class="empty">The concert list could not be loaded. Check that <code>contents/concerts.yml</code> is available.</div>';
            upcomingList.innerHTML = message;
            reviewList.innerHTML = '';
        });
})();
