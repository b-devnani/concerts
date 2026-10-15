const upcomingList = document.getElementById('upcoming-list');
const pastList = document.getElementById('past-list');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');
const sortDirection = document.getElementById('sort-direction');
let concerts = [];
let ascending = true;

function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
}

function displayDate(date) {
    if (!date) return '';
    const parsedDate = parseDate(date);
    return Number.isNaN(parsedDate.valueOf()) ? date : parsedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function parseDate(date) {
    if (date instanceof Date) {
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12);
    }
    const dateText = String(date);
    return new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateText) ? `${dateText}T12:00:00` : dateText);
}

function dateValue(date) {
    const parsedDate = parseDate(date || '');
    return Number.isNaN(parsedDate.valueOf()) ? 0 : parsedDate.valueOf();
}

function startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.valueOf();
}

function displayTime(time) {
    if (!time) return '';
    const parsedTime = new Date(`1970-01-01T${time}`);
    return Number.isNaN(parsedTime.valueOf()) ? time : parsedTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function compareValues(first, second, field) {
    if (field === 'date') return dateValue(first.date) - dateValue(second.date);
    if (field === 'rating') return Number(first.rating || 0) - Number(second.rating || 0);
    return String(first[field] || '').localeCompare(String(second[field] || ''), undefined, { sensitivity: 'base' });
}

function sortConcerts(concertsToSort, field, direction) {
    return concertsToSort.sort((first, second) => {
        const result = compareValues(first, second, field);
        return direction === 'ascending' ? result : -result;
    });
}

function render() {
    const query = searchInput.value.trim().toLowerCase();
    const field = sortSelect.value;
    const matchingConcerts = concerts.filter(concert => Object.values(concert).some(value => String(value || '').toLowerCase().includes(query)));
    const upcoming = matchingConcerts.filter(concert => dateValue(concert.date) >= startOfToday());
    const past = matchingConcerts.filter(concert => dateValue(concert.date) < startOfToday());
    const direction = ascending ? 'ascending' : 'descending';
    sortConcerts(upcoming, field, direction);
    sortConcerts(past, field, field === 'date' ? (ascending ? 'descending' : 'ascending') : direction);

    document.getElementById('upcoming-count').textContent = concerts.filter(concert => dateValue(concert.date) >= startOfToday()).length;
    document.getElementById('past-count').textContent = concerts.filter(concert => dateValue(concert.date) < startOfToday()).length;

    function renderSection(section, target, sectionName) {
        if (!section.length) {
            target.innerHTML = `<div class="concert-empty"><strong>${query ? `No ${sectionName.toLowerCase()} shows match that search.` : `No ${sectionName.toLowerCase()} concerts yet.`}</strong><br><span>Concert entries can be added to <code>contents/concerts.yml</code>.</span></div>`;
            return;
        }
        const isUpcoming = sectionName === 'Upcoming';
        target.innerHTML = section.map(concert => {
            const metadata = [
                concert.end_date ? `${displayDate(concert.date)} – ${displayDate(concert.end_date)}` : displayDate(concert.date),
                isUpcoming && displayTime(concert.time),
                concert.venue, concert.city,
                concert.price && `Ticket: ${concert.price}`,
                concert.companions && (/^(alone|solo)$/i.test(concert.companions) ? 'Went solo' : `With ${concert.companions}`)
            ].filter(Boolean);
            const rating = concert.rating ? `<span class="concert-rating" aria-label="${escapeHtml(concert.rating)} out of 10">${escapeHtml(concert.rating)}/10</span>` : '';
            const songList = (title, songs) => songs && songs.length ? `<p class="concert-songs"><span class="concert-label">${title}</span>${[].concat(songs).map(escapeHtml).join(', ')}</p>` : '';
            const paragraphs = text => String(text).split('\n').filter(line => line.trim()).map(line => `<p>${escapeHtml(line)}</p>`).join('');
            const review = concert.review ? `<details class="concert-review"><summary>Read review</summary><div class="concert-notes">${paragraphs(concert.review)}</div></details>` : '';
            const notes = concert.notes ? `<div class="concert-notes">${String(concert.notes).split('\n').filter(line => line.trim()).map(line => `<p>${escapeHtml(line)}</p>`).join('')}</div>` : '';
            const link = /^https?:\/\//i.test(concert.link || '') ? `<a href="${escapeHtml(concert.link)}" target="_blank" rel="noopener">${isUpcoming ? 'Tickets' : 'Event details'} <i class="bi-box-arrow-up-right"></i></a>` : '';
            return `<article class="concert-card"><div class="concert-card-top"><span class="concert-label">${escapeHtml(concert.genre || '')}</span>${rating}</div><h2>${escapeHtml(concert.artist)}</h2><div class="concert-card-meta">${metadata.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>${songList('Highlights', concert.highlights)}${songList('Wish they played', concert.wishlist)}${notes}${review}${link ? `<div class="mt-3">${link}</div>` : ''}</article>`;
        }).join('');
    }

    renderSection(upcoming, upcomingList, 'Upcoming');
    renderSection(past, pastList, 'Past');
}

fetch('contents/concerts.yml')
    .then(response => {
        if (!response.ok) throw new Error('Could not load concert archive');
        return response.text();
    })
    .then(text => {
        const data = jsyaml.load(text) || {};
        concerts = Array.isArray(data) ? data : (Array.isArray(data.concerts) ? data.concerts : []);
        render();
    })
    .catch(() => {
        const errorMessage = '<div class="concert-empty"><strong>The concert archive could not be loaded.</strong><br><span>Check that <code>contents/concerts.yml</code> is available.</span></div>';
        upcomingList.innerHTML = errorMessage;
        pastList.innerHTML = errorMessage;
    });

searchInput.addEventListener('input', render);
sortSelect.addEventListener('change', render);
sortDirection.addEventListener('click', () => {
    ascending = !ascending;
    sortDirection.setAttribute('aria-label', ascending ? 'Sort ascending' : 'Sort descending');
    sortDirection.setAttribute('title', ascending ? 'Sort ascending' : 'Sort descending');
    sortDirection.innerHTML = `<i class="bi-sort-${ascending ? 'down' : 'up'}"></i>`;
    render();
});
