(() => {
    'use strict';

    const defaultServer = 'https://play.versusville.com';
    const boards = [
        { id: 'wasteball', title: 'Wasteball', mode: 'wasteball', track: 3, metric: 'score', limit: 5 },
        { id: 'cemetery', title: 'Grave Rave', mode: 'cemetery', track: 4, metric: 'score', limit: 5 },
        { id: 'residence', title: 'Residence Evil', mode: 'residence', track: 2, metric: 'time' },
        ...['Supermarket Speedway', 'Market Madness', 'Wild in the Aisles'].map((title, index) => ({
            id: `kart-${index + 1}`, title: `Kart Dart - ${title}`, mode: 'kart', track: index + 1, metric: 'time', laps: 3
        }))
    ];
    const container = document.getElementById('scoreboards');
    const status = document.getElementById('scores-status');
    const refresh = document.getElementById('scores-refresh');
    const dialog = document.getElementById('custom-server');
    const serverInput = document.getElementById('custom-server-url');
    const serverError = document.getElementById('custom-server-error');
    let server = defaultServer;
    let rankings = [];
    let request;
    let loading = false;
    let failed = false;
    let selected = null;
    let search = '';
    let offset = 0;

    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }

    function entriesFor(board) {
        if (loading || failed) return [];
        const category = rankings.find(category => category.mode === board.mode && category.track === board.track
            && category.metric === board.metric && (board.mode === 'kart' ? category.laps === board.laps
                : board.mode === 'residence' || category.condition === 'TIME' && category.limit === board.limit));
        return category ? category.entries : [];
    }

    function filters(board) {
        const wrapper = element('div', undefined, 'score-filters');
        function segment(options, current, apply) {
            const group = element('div', undefined, 'score-segments');
            group.setAttribute('role', 'group');
            for (const [value, label] of options) {
                const button = element('button', label);
                button.type = 'button';
                button.setAttribute('aria-pressed', String(value === current));
                button.addEventListener('click', () => {
                    apply(value); offset = 0; render();
                    const replacement = [...container.querySelectorAll(`[data-board="${board.id}"] button`)].find(control => control.textContent === label);
                    replacement?.focus();
                });
                group.append(button);
            }
            wrapper.append(group);
        }
        if (board.mode === 'kart' || board.mode === 'residence') {
            segment([['time', 'Times'], ['score', 'Scores']], board.metric, value => { board.metric = value; });
            if (board.mode === 'kart') segment([1, 2, 3, 4, 5].map(laps => [laps, `${laps} lap${laps === 1 ? '' : 's'}`]), board.laps, value => { board.laps = value; });
        } else segment([5, 10, 15, 20, 25].map(minutes => [minutes, `${minutes}min`]), board.limit, value => { board.limit = value; });
        return wrapper;
    }

    function table(board) {
        const wrapper = element('div', undefined, 'score-table');
        const grid = element('table');
        grid.setAttribute('aria-label', `${board.title} ${board.metric === 'time' ? 'times' : 'scores'}`);
        const head = grid.createTHead().insertRow();
        for (const label of ['Rank', 'Name', board.metric === 'time' ? 'Time' : 'Score']) {
            const cell = element('th', label); cell.scope = 'col'; head.append(cell);
        }
        let rank = 0;
        const entries = entriesFor(board);
        const ranked = entries.map((entry, index) => {
            if (!index || entry.value !== entries[index - 1].value) rank = index + 1;
            return { ...entry, rank };
        }).filter(entry => !selected || entry.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
        offset = Math.min(offset, Math.max(0, Math.ceil(ranked.length / 12) - 1) * 12);
        const shown = ranked.slice(selected ? offset : 0, selected ? offset + 12 : 5);
        const body = grid.createTBody();
        for (const entry of shown) {
            const row = body.insertRow();
            for (const value of [`#${entry.rank}`, entry.name, board.metric === 'time' ? `${(entry.value / 1000).toFixed(3)}s` : String(entry.value)]) {
                row.insertCell().textContent = value;
            }
            const date = new Date(entry.date);
            row.title = `${Number.isNaN(date.getTime()) ? '' : date.toLocaleString()}${entry.source === 'singleplayer' ? ' - Single-player (client reported)' : ''}`;
        }
        if (!shown.length) {
            const cell = body.insertRow().insertCell(); cell.colSpan = 3; cell.className = 'score-empty';
            cell.textContent = loading ? 'Loading...' : failed ? 'Unavailable' : search && selected ? 'No matching players' : 'No records yet';
        }
        wrapper.append(grid);
        if (selected) {
            const paging = element('div', undefined, 'score-paging');
            for (const direction of [-1, 1]) {
                const button = element('button', direction < 0 ? '\u2190' : '\u2192');
                button.type = 'button'; button.title = direction < 0 ? 'Previous page' : 'Next page';
                button.setAttribute('aria-label', button.title);
                button.disabled = direction < 0 ? offset === 0 : offset + 12 >= ranked.length;
                button.addEventListener('click', () => { offset += direction * 12; wrapper.replaceWith(table(board)); });
                paging.append(button);
            }
            paging.insertBefore(element('span', `${ranked.length ? offset + 1 : 0}-${Math.min(offset + 12, ranked.length)} / ${ranked.length}`), paging.lastChild);
            wrapper.append(paging);
        }
        return wrapper;
    }

    function render() {
        container.replaceChildren();
        container.classList.toggle('scores-detail', selected !== null);
        container.setAttribute('aria-busy', String(loading));
        for (const board of selected ? [selected] : boards) {
            const section = element('section', undefined, 'score-board'); section.dataset.board = board.id;
            section.append(element('h2', board.title.toUpperCase()), filters(board));
            if (selected) {
                const input = element('input', undefined, 'score-search'); input.type = 'search'; input.placeholder = 'Player name';
                input.setAttribute('aria-label', 'Find player'); input.value = search;
                input.addEventListener('input', () => { search = input.value; offset = 0; section.querySelector('.score-table').replaceWith(table(board)); });
                section.append(input);
            }
            section.append(table(board));
            const link = element('a', selected ? 'Back to all scoreboards' : `View full ${board.title.replace('Kart Dart - ', '')} scoreboard`, 'smalltext score-full');
            link.href = '#scoreboards';
            link.addEventListener('click', event => {
                event.preventDefault(); selected = selected ? null : board; search = ''; offset = 0; render();
                container.scrollIntoView({ block: 'start' });
                container.querySelector('input, button')?.focus();
            });
            section.append(link); container.append(section);
        }
    }

    function validRankings(data) {
        return Array.isArray(data) && data.every(category => category && typeof category === 'object'
            && ['kart', 'wasteball', 'cemetery', 'residence'].includes(category.mode)
            && Number.isInteger(category.track) && ['time', 'score'].includes(category.metric)
            && Array.isArray(category.entries) && category.entries.every(entry => entry && typeof entry.name === 'string'
                && Number.isFinite(entry.value) && typeof entry.date === 'string'));
    }

    async function loadScores() {
        request?.abort();
        const controller = new AbortController(); request = controller;
        const timeout = setTimeout(() => controller.abort(), 10000);
        rankings = []; loading = true; failed = false; refresh.disabled = true;
        document.getElementById('scores-source').textContent = new URL(server).host;
        status.hidden = false; status.textContent = 'Loading scores...'; render();
        try {
            const response = await fetch(`${server}/api/leaderboards`, { signal: controller.signal, credentials: 'omit' });
            if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);
            const data = await response.json();
            if (!validRankings(data)) throw new Error('Server returned an unsupported scoreboard format');
            if (request !== controller) return;
            rankings = data; status.textContent = ''; status.hidden = true;
        } catch (error) {
            if (request !== controller) return;
            failed = true;
            status.textContent = error.name === 'AbortError' ? 'The scoreboard server timed out. Please retry.'
                : `Unable to load scores from ${new URL(server).host}. The server must be reachable and allow cross-origin leaderboard requests.`;
        } finally {
            clearTimeout(timeout);
            if (request === controller) { loading = false; refresh.disabled = false; render(); }
        }
    }

    document.getElementById('custom-server-link').addEventListener('click', event => {
        event.preventDefault(); serverInput.value = server; serverError.hidden = true;
        dialog.showModal(); serverInput.focus(); serverInput.select();
    });
    document.getElementById('custom-server-cancel').addEventListener('click', () => dialog.close());
    document.getElementById('custom-server-form').addEventListener('submit', event => {
        event.preventDefault();
        try {
            const value = serverInput.value.trim();
            const url = new URL(value.includes('://') ? value : `https://${value}`);
            if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
                throw new Error('Enter a server address such as https://example.com:8787, without a path or login details.');
            }
            if (location.protocol === 'https:' && url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
                throw new Error('This HTTPS page requires an HTTPS server address.');
            }
            server = url.origin; dialog.close(); offset = 0; void loadScores();
        } catch (error) {
            serverError.textContent = error instanceof TypeError ? 'Enter a valid server address or IP, including the port if needed.' : error.message;
            serverError.hidden = false;
        }
    });
    refresh.addEventListener('click', () => { void loadScores(); });
    void loadScores();
})();