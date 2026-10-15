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
    const countdown = days => days === 0 ? 'Tonight' : days === 1 ? 'Tomorrow' : `In ${days} days`;
    const asText = value => Array.isArray(value) ? value.join(', ') : String(value);
    const paragraphs = text => String(text).split('\n').filter(line => line.trim()).map(line => `<p>${escapeHtml(line)}</p>`).join('');

    function displayTime(time) {
        if (!time) return '';
        const [hours, minutes] = String(time).split(':').map(Number);
        return `${hours % 12 || 12}${minutes ? ':' + String(minutes).padStart(2, '0') : ''} ${hours < 12 ? 'AM' : 'PM'}`;
    }

    function spotifyEmbed(url) {
        const match = String(url || '').match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/);
        return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : '';
    }

    function playButton(concert, index) {
        if (!concert.song && !concert.spotify) {
            return PREVIEW ? '<span class="play tbd"><span class="disc" aria-hidden="true">▶</span><span>Song TBD</span></span>' : '';
        }
        const label = escapeHtml(concert.song || 'Play on Spotify');
        const embed = spotifyEmbed(concert.spotify);
        if (embed && !PREVIEW) {
            return `<button class="play" type="button" data-embed="${escapeHtml(embed)}" data-player="player-${index}" aria-expanded="false"><span class="disc" aria-hidden="true">▶</span><span class="song">${label}</span></button>`;
        }
        const href = concert.spotify || `https://open.spotify.com/search/${encodeURIComponent(`${concert.artist} ${concert.song}`)}`;
        return `<a class="play" href="${escapeHtml(href)}" target="_blank" rel="noopener"><span class="disc" aria-hidden="true">▶</span><span class="song">${label}</span></a>`;
    }

    function upcomingRow(concert, index) {
        const date = parseDate(concert.date);
        const where = [concert.venue, concert.city, displayTime(concert.time)].filter(Boolean).map(escapeHtml).join(' · ');
        const extra = [concert.companions && `With ${escapeHtml(concert.companions)}`, concert.notes && escapeHtml(concert.notes)].filter(Boolean).join(' · ');
        const tickets = /^https?:\/\//i.test(concert.link || '') ? `<a href="${escapeHtml(concert.link)}" target="_blank" rel="noopener">Tickets ↗</a>` : '';
        return `<li class="show">
            <div class="when"><div class="mon">${format(date, { month: 'short' })}</div><div class="day">${date.getDate()}</div><div class="dow">${format(date, { weekday: 'short' })}</div></div>
            <div class="show-main">
                <h3 class="show-artist">${escapeHtml(concert.artist)}</h3>
                <div class="show-meta">${where}</div>
                ${extra ? `<div class="show-meta">${extra}</div>` : ''}
                <div class="show-actions"><span class="countdown">${countdown(daysUntil(concert.date))}</span>${playButton(concert, index)}${tickets}</div>
                <div class="player" id="player-${index}" hidden></div>
            </div>
        </li>`;
    }

    function reviewCard(concert) {
        const date = parseDate(concert.date);
        const when = concert.end_date
            ? `${format(date, { month: 'short', day: 'numeric' })} – ${format(parseDate(concert.end_date), { month: 'short', day: 'numeric', year: 'numeric' })}`
            : format(date, { month: 'short', day: 'numeric', year: 'numeric' });
        const rating = Number(concert.rating);
        const best = rating === 10;
        const who = !concert.companions ? '' : /^(alone|solo)$/i.test(concert.companions) ? 'Went solo' : `With <b>${escapeHtml(concert.companions)}</b>`;
        const byline = [`By <b>Bhagya</b>`, escapeHtml(when), concert.price && `Ticket <b>${escapeHtml(concert.price)}</b>`, who].filter(Boolean);
        const sets = [];
        if (concert.highlights) sets.push(`<div class="set"><dt>Standouts</dt><dd>${escapeHtml(asText(concert.highlights))}</dd></div>`);
        if (concert.wishlist) sets.push(`<div class="set miss"><dt>Didn't play</dt><dd>${escapeHtml(asText(concert.wishlist))}</dd></div>`);
        const review = concert.review ? `<details class="review-body"><summary>Read review</summary><div class="review-text">${paragraphs(concert.review)}</div></details>` : '';
        const notes = concert.notes ? `<div class="review-text">${paragraphs(concert.notes)}</div>` : '';
        return `<article class="review${best ? ' best' : ''}">
            <div class="review-head">
                <div class="score" aria-label="${rating ? `${rating} out of 10` : 'Not rated yet'}"><b>${rating || '–'}</b><small>/ 10</small></div>
                <div>
                    <div class="review-kicker label"><span>${escapeHtml(concert.genre || '')}</span>${best ? '<span class="badge">Best live show</span>' : ''}</div>
                    <h3 class="review-title">${escapeHtml(concert.artist)}</h3>
                    <div class="review-sub">${escapeHtml(concert.venue)}, ${escapeHtml(concert.city)}</div>
                </div>
            </div>
            <div class="byline">${byline.map(item => `<span>${item}</span>`).join('')}</div>
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
            `<span><strong>${upcoming.length}</strong>coming up</span>`,
            `<span><strong>${past.length}</strong>reviewed</span>`,
            rated.length ? `<span><strong>${average.toFixed(1)}</strong>average score</span>` : ''
        ].join('');

        upcomingList.innerHTML = upcoming.length ? upcoming.map(upcomingRow).join('') : '<li class="empty">Nothing booked yet.</li>';
        reviewList.innerHTML = past.length ? past.map(reviewCard).join('') : '<div class="empty">No reviews yet.</div>';
    }

    upcomingList.addEventListener('click', event => {
        const button = event.target.closest('button.play');
        if (!button) return;
        const player = document.getElementById(button.dataset.player);
        if (!player.firstChild) {
            player.innerHTML = `<iframe src="${escapeHtml(button.dataset.embed)}" title="Spotify player" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
        }
        const opening = player.hidden;
        player.hidden = !opening;
        button.setAttribute('aria-expanded', String(opening));
        button.querySelector('.disc').textContent = opening ? '■' : '▶';
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
