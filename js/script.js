// Configuration loaded from config.js
const WORKER_BASE_URL = (typeof WORKER_URL !== 'undefined' ? WORKER_URL : 'https://worldcupfarsi.amirfeqhi.workers.dev');

// Persian numbers utility
function toPersianNumber(num) {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, (match) => persianNumbers[parseInt(match)]);
}

// Convert UTC to Iran Standard Time (Asia/Tehran timezone)
function convertToIranTime(utcDateString) {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tehran',
        hour12: false
    };
    
    return new Date(utcDateString).toLocaleDateString('fa-IR', options);
}

// Get time only (Asia/Tehran timezone)
function getTimeOnly(utcDateString) {
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tehran',
        hour12: false
    };
    return new Date(utcDateString).toLocaleTimeString('fa-IR', options);
}

// Check if team is Iran
function isIranTeam(teamName) {
    return teamName.toLowerCase().includes('iran') || teamName === 'ایران';
}

// Generic fetch with error handling
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${WORKER_BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Show notification
function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    
    notificationText.textContent = message;
    notification.classList.toggle('error', isError);
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Tab switching
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active states
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Load data for the tab
            if (tabId === 'schedule' && !window.scheduleLoaded) {
                loadSchedule();
            } else if (tabId === 'standings' && !window.standingsLoaded) {
                loadStandings();
            } else if (tabId === 'live' && !window.liveLoaded) {
                loadLiveScores();
            } else if (tabId === 'countdown' && !window.countdownLoaded) {
                loadNextMatch();
            }
        });
    });
}

// Load Schedule
async function loadSchedule() {
    try {
        document.getElementById('schedule-loading').style.display = 'flex';
        document.getElementById('schedule-content').innerHTML = '';
        document.getElementById('schedule-error').style.display = 'none';

        const data = await fetchData('/api/fixtures');
        
        if (!data.matches || data.matches.length === 0) {
            document.getElementById('schedule-content').innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">بازیایی یافت نشد</p>';
            return;
        }

        renderSchedule(data.matches);
        window.scheduleLoaded = true;
    } catch (error) {
        console.error('Error loading schedule:', error);
        document.getElementById('schedule-error').style.display = 'block';
    } finally {
        document.getElementById('schedule-loading').style.display = 'none';
    }
}

// Render Schedule
function renderSchedule(matches) {
    const container = document.getElementById('schedule-content');
    const groupedByDate = {};

    // Group matches by date
    matches.forEach(match => {
        const date = new Date(match.utcDate).toISOString().split('T')[0];
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(match);
    });

    // Sort dates
    const sortedDates = Object.keys(groupedByDate).sort();

    let html = '';
    sortedDates.forEach(date => {
        const matches = groupedByDate[date];
        const persianDate = convertToIranTime(matches[0].utcDate);
        
        html += `<div class="match-date-header">${persianDate}</div>`;
        
        matches.forEach(match => {
            const homeTeam = match.homeTeam;
            const awayTeam = match.awayTeam;
            const matchTime = getTimeOnly(match.utcDate);
            
            let statusClass = 'upcoming';
            let statusText = 'آینده';
            
            if (match.status === 'IN_PLAY' || match.status === 'LIVE') {
                statusClass = 'live';
                statusText = 'زنده';
            } else if (match.status === 'FINISHED') {
                statusClass = 'finished';
                statusText = 'پایان‌یافته';
            }

            html += `
                <div class="match-card">
                    <div class="match-teams">
                        <div class="team">
<img src="${homeTeam.crest || homeTeam.logo || ''}" alt="${homeTeam.name}" class="team-logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#127463;&#127479;</text></svg>'">
                            <span class="team-name">${homeTeam.name}</span>
                        </div>
                        <div class="match-score">
                            <span class="score-number">${match.score?.fullTime?.home ?? '-'}</span>
                            <span>:</span>
                            <span class="score-number">${match.score?.fullTime?.away ?? '-'}</span>
                        </div>
                        <div class="team">
<img src="${awayTeam.crest || awayTeam.logo || ''}" alt="${awayTeam.name}" class="team-logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#127463;&#127479;</text></svg>'">
                            <span class="team-name">${awayTeam.name}</span>
                        </div>
                    </div>
                    <div class="match-info">
                        <span>${matchTime}</span>
                        <span class="match-status ${statusClass}">
                            ${statusClass === 'live' ? '<span class="live-indicator"></span>' : ''}
                            ${statusText}
                        </span>
                    </div>
                </div>
            `;
        });
    });

    container.innerHTML = html;
}

// Load Standings
async function loadStandings() {
    try {
        document.getElementById('standings-loading').style.display = 'flex';
        document.getElementById('standings-content').innerHTML = '';
        document.getElementById('standings-error').style.display = 'none';

        const data = await fetchData('/api/standings');
        
        if (!data.standings) {
            document.getElementById('standings-content').innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">جدول رده‌بندی یافت نشد</p>';
            return;
        }

        renderStandings(data.standings);
        window.standingsLoaded = true;
    } catch (error) {
        console.error('Error loading standings:', error);
        document.getElementById('standings-error').style.display = 'block';
    } finally {
        document.getElementById('standings-loading').style.display = 'none';
    }
}

// Render Standings
function renderStandings(standings) {
    const container = document.getElementById('standings-content');
    let html = '';

    standings.forEach(group => {
        html += `<div class="group-header">${group.group}</div>`;
        html += `<table class="standings-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>تیم</th>
                    <th>بازی</th>
                    <th>برد</th>
                    <th>مساوی</th>
                    <th>باخت</th>
                    <th>گل</th>
                    <th>امتیاز</th>
                </tr>
            </thead>
            <tbody>`;

        group.table.forEach((team, index) => {
            const isIran = isIranTeam(team.team.name);
            const positionClass = index < 2 ? 'top' : index < 3 ? 'qualified' : '';
            
            html += `<tr class="${isIran ? 'iran-row' : ''}">
                <td><span class="position-number ${positionClass}">${toPersianNumber(index + 1)}</span></td>
                <td class="team-cell">
                    <img src="${team.team.crest || team.team.logo || ''}" alt="${team.teamCard}" onerror="this.style.display='none'">
                    ${team.team.name}
                </td>
                <td>${toPersianNumber(team.playedGames)}</td>
                <td>${toPersianNumber(team.won)}</td>
                <td>${toPersianNumber(team.draw)}</td>
                <td>${toPersianNumber(team.lost)}</td>
                <td>${toPersianNumber(team.goalsFor)}-${toPersianNumber(team.goalsAgainst)}</td>
                <td><strong>${toPersianNumber(team.points)}</strong></td>
            </tr>`;
        });

        html += '</tbody></table>';
    });

    container.innerHTML = html;
}

// Load Live Scores
async function loadLiveScores() {
    try {
        document.getElementById('live-loading').style.display = 'flex';
        document.getElementById('live-content').innerHTML = '';
        document.getElementById('live-error').style.display = 'none';
        document.getElementById('live-next-matches').style.display = 'none';

        const data = await fetchData('/api/live');
        
        if (!data.matches || data.matches.length === 0) {
            // Show today's upcoming matches
            document.getElementById('live-content').innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">در حال حاضر بازی زنده‌ای در جریان نیست</p>';
            document.getElementById('live-next-matches').style.display = 'block';
            loadTodaysMatches();
            return;
        }

        renderLiveMatches(data.matches);
        window.liveLoaded = true;
    } catch (error) {
        console.error('Error loading live scores:', error);
        document.getElementById('live-error').style.display = 'block';
    } finally {
        document.getElementById('live-loading').style.display = 'none';
    }
}

// Render Live Matches
function renderLiveMatches(matches) {
    const container = document.getElementById('live-content');
    let html = '';

    matches.forEach(match => {
        const homeTeam = match.homeTeam;
        const awayTeam = match.awayTeam;
        
        html += `<div class="match-card">
            <div class="match-teams">
                <div class="team">
                    <img src="${homeTeam.crest || homeTeam.logo || ''}" alt="${homeTeam.name}" class="team-logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#127463;&#127479;</text></svg>'">
                    <span class="team-name">${homeTeam.name}</span>
                </div>
                <div class="match-score">
                    <span class="score-number">${match.score?.fullTime?.home ?? '0'}</span>
                    <span>:</span>
                    <span class="score-number">${match.score?.fullTime?.away ?? '0'}</span>
                </div>
                <div class="team">
                    <img src="${awayTeam.crest || awayTeam.logo || ''}" alt="${awayTeam.name}" class="team-logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#127463;&#127479;</text></svg>'">
                    <span class="team-name">${awayTeam.name}</span>
                </div>
            </div>
            <div class="match-info">
                <span class="match-status live">
                    <span class="live-indicator"></span>
                    زنده - دقیقه ${toPersianNumber(match.minute || 0)}
                </span>
            </div>`;

        // Add goal scorers if available
        if (match.goals && match.goals.length > 0) {
            html += '<div class="goal-scorers">';
            match.goals.forEach(goal => {
                html += `<div class="scorer">
                    <span>${goal.scorer.name || 'بازیکن'}</span>
                    <span class="minute">(${toPersianNumber(goal.minute)}')</span>
                </div>`;
            });
            html += '</div>';
        }

        html += '</div>';
    });

    container.innerHTML = html;
}

// Load Today's Matches
async function loadTodaysMatches() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const data = await fetchData(`/api/fixtures?dateFrom=${today}&dateTo=${today}`);
        
        if (!data.matches || data.matches.length === 0) {
            document.getElementById('live-next-content').innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-secondary);">بازی امروزی یافت نشد</p>';
            return;
        }

        renderTodaysMatches(data.matches);
    } catch (error) {
        console.error('Error loading today\'s matches:', error);
    }
}

// Render Today's Matches
function renderTodaysMatches(matches) {
    const container = document.getElementById('live-next-content');
    let html = '';

    matches.forEach(match => {
        const homeTeam = match.homeTeam;
        const awayTeam = match.awayTeam;
        const matchTime = getTimeOnly(match.utcDate);

        html += `<div class="match-card">
            <div class="match-teams">
                <div class="team">
                    <img src="${homeTeam.crest || homeTeam.logo || ''}" alt="${homeTeam.name}" class="team-logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#127463;&#127479;</text></svg>'">
                    <span class="team-name">${homeTeam.name}</span>
                </div>
                <div class="match-score">
                    <span style="font-size: 1.2rem; color: var(--text-secondary);">${matchTime}</span>
                </div>
                <div class="team">
                    <img src="${awayTeam.crest || awayTeam.logo || ''}" alt="${awayTeam.name}" class="team-logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#127463;&#127479;</text></svg>'">
                    <span class="team-name">${awayTeam.name}</span>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

// Load Next Match (Countdown)
async function loadNextMatch() {
    try {
        document.getElementById('countdown-loading').style.display = 'flex';
        document.getElementById('countdown-content').innerHTML = '';
        document.getElementById('countdown-error').style.display = 'none';

        // Try to get Iran's next match first
        let data = await fetchData('/api/fixtures');
        
        if (!data.matches || data.matches.length === 0) {
            document.getElementById('countdown-content').innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">بازی بعدی یافت نشد</p>';
            return;
        }

        // Find Iran's next match or next match overall
        const now = new Date();
        const upcomingMatches = data.matches.filter(match => new Date(match.utcDate) > now);
        
        let nextMatch = upcomingMatches.find(match => 
            isIranTeam(match.homeTeam.name) || isIranTeam(match.awayTeam.name)
        );

        // If no Iran match, take the next match overall
        if (!nextMatch && upcomingMatches.length > 0) {
            nextMatch = upcomingMatches[0];
        }

        if (!nextMatch) {
            document.getElementById('countdown-content').innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">بازی بعدی یافت نشد</p>';
            return;
        }

        renderCountdown(nextMatch);
        window.countdownLoaded = true;
    } catch (error) {
        console.error('Error loading next match:', error);
        document.getElementById('countdown-error').style.display = 'block';
    } finally {
        document.getElementById('countdown-loading').style.display = 'none';
    }
}

// Render Countdown
function renderCountdown(match) {
    const container = document.getElementById('countdown-content');
    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    const matchDate = new Date(match.utcDate);

    container.innerHTML = `
        <div class="countdown-container">
            <div class="countdown-match">
                <div class="countdown-teams">
                    <div class="countdown-team">
                        <img src="${homeTeam.crest || homeTeam.logo || ''}" alt="${homeTeam.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#127463;&#127479;</text></svg>'">
                        <div class="name">${homeTeam.name}</div>
                    </div>
                    <div class="countdown-vs">VS</div>
                    <div class="countdown-team">
                        <img src="${awayTeam.logo || ''}" alt="${awayTeam.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#127463;&#127479;</text></svg>'">
                        <div class="name">${awayTeam.name}</div>
                    </div>
                </div>
                <div class="countdown-timer" id="countdown-timer">
                    <div class="countdown-item">
                        <span class="number" id="countdown-days">۰</span>
                        <span class="label">روز</span>
                    </div>
                    <div class="countdown-item">
                        <span class="number" id="countdown-hours">۰</span>
                        <span class="label">ساعت</span>
                    </div>
                    <div class="countdown-item">
                        <span class="number" id="countdown-minutes">۰</span>
                        <span class="label">دقیقه</span>
                    </div>
                    <div class="countdown-item">
                        <span class="number" id="countdown-seconds">۰</span>
                        <span class="label">ثانیه</span>
                    </div>
                </div>
                <div style="margin-top: 20px; color: var(--text-secondary);">
                    ${convertToIranTime(match.utcDate)}
                </div>
            </div>
        </div>
    `;

    // Start countdown
    updateCountdown(matchDate);
    setInterval(() => updateCountdown(matchDate), 1000);
}

// Update countdown timer
function updateCountdown(targetDate) {
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
        // Match has started
        document.getElementById('countdown-days').textContent = toPersianNumber(0);
        document.getElementById('countdown-hours').textContent = toPersianNumber(0);
        document.getElementById('countdown-minutes').textContent = toPersianNumber(0);
        document.getElementById('countdown-seconds').textContent = toPersianNumber(0);
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('countdown-days').textContent = toPersianNumber(days);
    document.getElementById('countdown-hours').textContent = toPersianNumber(hours);
    document.getElementById('countdown-minutes').textContent = toPersianNumber(minutes);
    document.getElementById('countdown-seconds').textContent = toPersianNumber(seconds);
}

// Auto-refresh live scores
setInterval(() => {
    if (window.liveLoaded && document.getElementById('live-tab').classList.contains('active')) {
        loadLiveScores();
    }
}, REFRESH_INTERVAL);

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadSchedule(); // Load initial tab
});