// --- 配置 ---
const API_URL = "https://growth-memos-auth.2536319853.workers.dev"; 
const STORE_KEY = 'glass_memos_v2';
const THEME_KEY = 'glass_memos_theme';
const TOKEN_KEY = 'growth_memos_token';

let notes = [];
let currentFilter = null;
let searchQuery = '';

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    checkAuth().then(isAuthenticated => {
        if (isAuthenticated) {
            unlockApp();
        }
    });

    bindLoginEvents();
});

// --- 🔐 认证逻辑 ---
async function checkAuth() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;

    if (API_URL) {
        try {
            const res = await fetch(`${API_URL}/auth/verify`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!data.ok) {
                localStorage.removeItem(TOKEN_KEY);
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    } else {
        return true;
    }
}

function unlockApp() {
    document.getElementById('loginOverlay').classList.add('hidden');
    loadNotes();
    renderApp();
    bindAppEvents();
}

async function handleLogin() {
    const pwdInput = document.getElementById('loginPassword');
    const btn = document.getElementById('btnLogin');
    const msg = document.getElementById('loginMsg');
    const password = pwdInput.value;

    if (!password) return;

    btn.classList.add('loading');
    btn.textContent = '验证中...';
    msg.textContent = '';

    if (API_URL) {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (data.ok && data.token) {
                localStorage.setItem(TOKEN_KEY, data.token);
                unlockApp();
            } else {
                msg.textContent = '密码错误';
            }
        } catch (e) {
            msg.textContent = '网络错误';
        }
    } else {
        // [演示模式] 任意密码解锁
        setTimeout(() => {
            const fakeToken = "demo-token-" + Date.now();
            localStorage.setItem(TOKEN_KEY, fakeToken);
            unlockApp();
        }, 600);
    }
    
    btn.classList.remove('loading');
    btn.textContent = '解锁进入';
}

function handleLogout() {
    if (confirm('确定要锁定并退出吗？')) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.reload();
    }
}

function bindLoginEvents() {
    document.getElementById('btnLogin').onclick = handleLogin;
    document.getElementById('loginPassword').onkeydown = (e) => {
        if (e.key === 'Enter') handleLogin();
    };
}

// --- 🎨 主题逻辑 ---
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon(true);
    } else {
        document.documentElement.removeAttribute('data-theme');
        updateThemeIcon(false);
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'light');
        updateThemeIcon(false);
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem(THEME_KEY, 'dark');
        updateThemeIcon(true);
    }
}

function updateThemeIcon(isDark) {
    const moon = document.querySelector('.icon-moon');
    const sun = document.querySelector('.icon-sun');
    if (isDark) {
        moon.style.display = 'none';
        sun.style.display = 'block';
    } else {
        moon.style.display = 'block';
        sun.style.display = 'none';
    }
}

// --- 应用内事件 ---
function bindAppEvents() {
    document.getElementById('btnTheme').onclick = toggleTheme;
    document.getElementById('btnLogout').onclick = handleLogout;
    
    document.getElementById('btnNew').onclick = () => openEditModal();
    document.getElementById('btnExport').onclick = exportData;
    document.getElementById('btnImportTrigger').onclick = () => document.getElementById('importFile').click();
    document.getElementById('importFile').onchange = importData;
    document.getElementById('searchInput').oninput = (e) => {
        searchQuery = e.target.value.trim();
        renderList();
    };

    const editModal = document.getElementById('modalOverlay');
    editModal.onclick = (e) => { if (e.target === editModal) closeEditModal(); };
    document.querySelectorAll('.btn-close-modal').forEach(btn => btn.onclick = closeEditModal);
    document.getElementById('btnSave').onclick = saveNote;
    document.getElementById('btnDelete').onclick = deleteNote;

    const previewModal = document.getElementById('previewOverlay');
    previewModal.onclick = (e) => { if (e.target === previewModal) closePreviewModal(); };
    document.querySelectorAll('.btn-close-preview').forEach(btn => btn.onclick = closePreviewModal);

    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            if (editModal.classList.contains('open')) saveNote();
        }
    });
}

// --- 数据/CRUD 逻辑 ---
function loadNotes() {
    const raw = localStorage.getItem(STORE_KEY);
    notes = raw ? JSON.parse(raw) : [];
}

function saveStorage() {
    localStorage.setItem(STORE_KEY, JSON.stringify(notes));
    renderApp();
}

function renderApp() {
    renderTags();
    renderList();
}

function renderTags() {
    const tags = new Set();
    notes.forEach(n => n.tags.forEach(t => tags.add(t)));
    const container = document.getElementById('tagsBar');
    container.innerHTML = '';
    const allBtn = createTagBtn('全部', currentFilter === null);
    allBtn.onclick = () => { currentFilter = null; renderApp(); };
    container.appendChild(allBtn);
    tags.forEach(tag => {
        const btn = createTagBtn(`#${tag}`, currentFilter === tag);
        btn.onclick = () => { currentFilter = tag; renderApp(); };
        container.appendChild(btn);
    });
}
function createTagBtn(text, isActive) {
    const btn = document.createElement('button');
    btn.className = `tag-btn ${isActive ? 'active' : ''}`;
    btn.textContent = text;
    return btn;
}

function renderList() {
    const container = document.getElementById('memoList');
    const empty = document.getElementById('emptyState');
    
    let list = notes.filter(n => {
        const matchTag = currentFilter ? n.tags.includes(currentFilter) : true;
        const q = searchQuery.toLowerCase();
        const titleStr = n.summary || n.title || '';
        const contentStr = n.content || '';
        return matchTag && (!q || titleStr.toLowerCase().includes(q) || contentStr.toLowerCase().includes(q));
    });

    list.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id));

    if (list.length === 0) {
        container.innerHTML = ''; empty.style.display = 'block'; return;
    }
    empty.style.display = 'none';

    container.innerHTML = list.map(note => {
        const displayTitle = note.summary || note.title || '无标题';
        let previewText = '';
        if (note.experiment) previewText = `🎯 实验：${note.experiment}`;
        else if (note.fact) previewText = note.fact;
        else previewText = note.content;

        const tagsHtml = note.tags.map(t => `<span class="tag-badge">#${t}</span>`).join('');
        const weatherIcon = note.weather ? `<span style="margin-right:6px;">${note.weather.split(' ')[0]}</span>` : '';
        const moodIcon = note.mood ? `<span style="margin-right:6px;">${note.mood.split(' ')[0]}</span>` : '';

        return `
        <div class="glass memo-card" onclick="openPreview('${note.id}')">
            <div class="card-date">${weatherIcon}${moodIcon}${formatDate(note.date)}</div>
            <h3 class="card-title">${safeHtml(displayTitle)}</h3>
            <div class="card-preview">${safeHtml(previewText)}</div>
            <div class="card-tags">${tagsHtml}</div>
        </div>
        `;
    }).join('');
}

function openPreview(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const modal = document.getElementById('previewOverlay');
    
    document.getElementById('previewDate').innerText = formatDate(note.date);
    document.getElementById('previewWeather').innerText = note.weather || '';
    document.getElementById('previewMood').innerText = note.mood || '';
    document.getElementById('previewTitle').innerText = note.summary || note.title || '无标题';
    document.getElementById('previewId').value = note.id;

    const contentArea = document.getElementById('previewContentArea');
    if (note.experiment) {
        contentArea.innerHTML = `<div class="experiment-block"><span class="exp-label">✨ 下次尝试</span><div class="exp-text">${safeHtml(note.experiment)}</div></div>`;
    } else {
        contentArea.innerHTML = `<div class="fact-block"><div class="fact-text">${safeHtml(note.fact || note.content)}</div></div>`;
    }

    const detailsArea = document.getElementById('previewDetails');
    let detailsHtml = '';
    if (note.experiment && note.fact) detailsHtml += createDetailItem('发生了什么', note.fact);
    if (note.reaction) detailsHtml += createDetailItem('第一反应', note.reaction);
    if (note.pattern) detailsHtml += createDetailItem('潜在模式', note.pattern);
    detailsArea.innerHTML = detailsHtml;

    const tagsArea = document.getElementById('previewTags');
    tagsArea.innerHTML = note.tags.map(t => `<span class="tag-badge">#${t}</span>`).join('');

    document.getElementById('btnToEdit').onclick = () => {
        closePreviewModal();
        setTimeout(() => openEditModal(note.id), 50);
    };
    modal.classList.add('open');
}

function createDetailItem(label, content) {
    return `<div class="detail-item"><span class="detail-label">${label}</span><div class="detail-content">${safeHtml(content)}</div></div>`;
}

function closePreviewModal() {
    document.getElementById('previewOverlay').classList.remove('open');
}

function openEditModal(id = null) {
    const modal = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const delBtn = document.getElementById('btnDelete');
    
    document.getElementById('noteId').value = '';
    document.getElementById('noteDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('noteWeather').value = '☀️';
    document.getElementById('noteMood').value = '😐'; 
    document.getElementById('inpSummary').value = '';
    document.getElementById('inpFact').value = '';
    document.getElementById('inpReaction').value = '';
    document.getElementById('inpPattern').value = '';
    document.getElementById('inpExperiment').value = '';
    document.getElementById('noteTags').value = '';

    if (id) {
        const note = notes.find(n => n.id === id);
        if (note) {
            document.getElementById('noteId').value = note.id;
            document.getElementById('noteDate').value = note.date;
            setSelectValue('noteWeather', note.weather, '☀️');
            setSelectValue('noteMood', note.mood, '😐');
            document.getElementById('noteTags').value = note.tags.join(', ');
            document.getElementById('inpSummary').value = note.summary || note.title || '';
            document.getElementById('inpFact').value = note.fact || note.content || '';
            document.getElementById('inpReaction').value = note.reaction || '';
            document.getElementById('inpPattern').value = note.pattern || '';
            document.getElementById('inpExperiment').value = note.experiment || '';
            titleEl.innerText = '编辑观察';
            delBtn.style.display = 'block';
        }
    } else {
        titleEl.innerText = '新建观察';
        delBtn.style.display = 'none';
    }
    modal.classList.add('open');
}

function setSelectValue(elementId, savedValue, defaultValue) {
    const select = document.getElementById(elementId);
    if (!savedValue) { select.value = defaultValue; return; }
    select.value = savedValue;
    if (select.selectedIndex === -1) {
        for (let i = 0; i < select.options.length; i++) {
            if (savedValue.startsWith(select.options[i].value)) { select.selectedIndex = i; break; }
        }
    }
    if (select.selectedIndex === -1) select.value = defaultValue;
}

function closeEditModal() { document.getElementById('modalOverlay').classList.remove('open'); }

function saveNote() {
    const id = document.getElementById('noteId').value;
    const date = document.getElementById('noteDate').value;
    const weatherSelect = document.getElementById('noteWeather');
    const weather = weatherSelect.options[weatherSelect.selectedIndex].text;
    const moodSelect = document.getElementById('noteMood');
    const mood = moodSelect.options[moodSelect.selectedIndex].text;
    const tags = document.getElementById('noteTags').value.split(/[,，]/).map(t => t.trim()).filter(t => t);
    const summary = document.getElementById('inpSummary').value.trim();
    const fact = document.getElementById('inpFact').value.trim();
    const reaction = document.getElementById('inpReaction').value.trim();
    const pattern = document.getElementById('inpPattern').value.trim();
    const experiment = document.getElementById('inpExperiment').value.trim();

    if (!fact && !summary) return alert('请至少记录发生了什么，或者写一个总结。');
    const combinedContent = `[事实]: ${fact}\n[反应]: ${reaction}\n[模式]: ${pattern}\n[实验]: ${experiment}`.trim();
    const noteData = {
        id: id || Date.now().toString(),
        date, weather, mood, 
        tags: [...new Set(tags)], updatedAt: new Date().toISOString(),
        summary, fact, reaction, pattern, experiment,
        title: summary || '无标题', content: combinedContent
    };

    if (id) {
        const idx = notes.findIndex(n => n.id === id);
        if (idx > -1) notes[idx] = noteData;
    } else { notes.push(noteData); }
    saveStorage(); closeEditModal();
}

function deleteNote() {
    if (!confirm('确定删除这条记录吗？')) return;
    const id = document.getElementById('noteId').value;
    notes = notes.filter(n => n.id !== id);
    saveStorage(); closeEditModal();
}

function exportData() {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `growth_memos_${new Date().toISOString().slice(0,10)}.json`; a.click();
}
function importData(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = JSON.parse(evt.target.result);
            if (Array.isArray(data)) {
                if(confirm('导入将合并数据。继续吗？')) {
                    const map = new Map(notes.map(n => [n.id, n]));
                    data.forEach(n => map.set(n.id, n));
                    notes = Array.from(map.values());
                    saveStorage(); alert('导入成功');
                }
            }
        } catch(err) { alert('文件格式错误'); }
        e.target.value = '';
    };
    reader.readAsText(file);
}
function safeHtml(str) { return str ? str.replace(/</g, "&lt;").replace(/>/g, "&gt;") : ''; }
function formatDate(d) { return d === new Date().toISOString().split('T')[0] ? '今天' : d; }