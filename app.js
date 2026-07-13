// Karşılama mesajı
const hour = new Date().getHours();
const greeting = hour < 12 ? "Günaydın Nehir ✨" : hour < 18 ? "Tünaydın Nehir ✨" : "İyi akşamlar Nehir ✨";
document.getElementById('greeting').innerText = greeting;

// ---------------- Sohbet Oturumları (localStorage) ----------------
const SESSIONS_KEY = 'chatSessions';
const ACTIVE_KEY = 'activeSessionId';

const TR_STOPWORDS = new Set([
    "bir","bu","şu","ve","ile","de","da","mi","mı","mu","mü","ne","nasıl",
    "için","gibi","çok","ama","fakat","ki","o","ben","sen","biz","siz",
    "onlar","var","yok","acaba","lütfen","şey","diye","daha","en","çünkü",
    "the","a","an","and","or","is","are"
]);

function getSessions() {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
}
function saveSessions(sessions) {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}
function getActiveId() {
    return localStorage.getItem(ACTIVE_KEY);
}
function setActiveId(id) {
    localStorage.setItem(ACTIVE_KEY, id);
}
function createSessionObject() {
    return {
        id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        title: null,
        messages: [],
        updatedAt: Date.now()
    };
}

// Nehir'in ilk mesajından anahtar kelimeler seçerek başlık üretir
function generateTitle(text) {
    const cleaned = text.replace(/[?!.,;:"'()]/g, ' ').trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    const meaningful = words.filter(w => w.length > 2 && !TR_STOPWORDS.has(w.toLocaleLowerCase('tr')));
    const chosen = (meaningful.length ? meaningful : words).slice(0, 4).join(' ');
    let title = chosen.charAt(0).toLocaleUpperCase('tr') + chosen.slice(1);
    if (title.length > 34) title = title.slice(0, 34).trim() + '…';
    return title || 'Yeni Sohbet';
}

// Eski tek-oturumlu 'chatHistory' verisi varsa yeni sisteme taşı
function migrateOldHistory() {
    const old = localStorage.getItem('chatHistory');
    if (!old) return;
    try {
        const messages = JSON.parse(old);
        if (Array.isArray(messages) && messages.length) {
            const firstUserMsg = messages.find(m => m.role === 'user');
            const sessions = getSessions();
            const session = createSessionObject();
            session.messages = messages;
            session.title = firstUserMsg ? generateTitle(firstUserMsg.content) : 'Sohbet';
            session.updatedAt = Date.now();
            sessions.unshift(session);
            saveSessions(sessions);
            setActiveId(session.id);
        }
    } catch (e) { /* bozuk veri, yok say */ }
    localStorage.removeItem('chatHistory');
}

function initApp() {
    migrateOldHistory();
    let sessions = getSessions();
    let active = sessions.find(s => s.id === getActiveId());

    if (!active) {
        if (sessions.length) {
            active = sessions[0];
            setActiveId(active.id);
        } else {
            active = createSessionObject();
            sessions.unshift(active);
            saveSessions(sessions);
            setActiveId(active.id);
        }
    }
    renderSidebar();
    renderActiveChat();
}

function renderActiveChat() {
    const sessions = getSessions();
    const active = sessions.find(s => s.id === getActiveId());
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '';

    if (!active || active.messages.length === 0) {
        document.getElementById('welcome-msg').style.display = 'flex';
    } else {
        hideWelcomeScreen();
        active.messages.forEach(msg => {
            const content = msg.role === 'assistant' ? stripThinking(msg.content) : msg.content;
            addMessageToUI(msg.role === 'user' ? 'user' : 'ai', content, msg.attachment);
        });
    }
}

function renderSidebar() {
    const sessions = getSessions().slice().sort((a, b) => b.updatedAt - a.updatedAt);
    const list = document.getElementById('history-list');
    const activeId = getActiveId();

    if (!sessions.length) {
        list.innerHTML = '<div class="empty">Henüz sohbet yok.</div>';
        return;
    }

    list.innerHTML = '';
    sessions.forEach(s => {
        const item = document.createElement('div');
        item.className = 'history-item' + (s.id === activeId ? ' active' : '');
        item.textContent = s.title || 'Yeni Sohbet';
        item.onclick = () => switchSession(s.id);
        list.appendChild(item);
    });
}

function switchSession(id) {
    setActiveId(id);
    renderActiveChat();
    renderSidebar();
    toggleSidebar();
}

// ---------------- Ek Dosya / Görsel Önizleme ----------------
let pendingAttachment = null; // { kind: 'image'|'file', name, type, dataUrl }

function handleFileSelect(event, kind) {
    const file = event.target.files[0];
    event.target.value = ''; // aynı dosya tekrar seçilebilsin diye sıfırla
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        pendingAttachment = {
            kind: kind,
            name: file.name,
            type: file.type,
            dataUrl: reader.result
        };
        renderAttachmentPreview();
    };
    reader.onerror = () => alert('Dosya okunamadı, tekrar dener misin?');
    reader.readAsDataURL(file);
}

function renderAttachmentPreview() {
    const container = document.getElementById('attachment-preview');
    if (!pendingAttachment) {
        container.innerHTML = '';
        return;
    }
    if (pendingAttachment.kind === 'image') {
        container.innerHTML = `
            <div class="preview-chip">
                <img src="${pendingAttachment.dataUrl}" alt="önizleme">
                <div class="preview-remove" onclick="clearAttachment()">✕</div>
            </div>`;
    } else {
        container.innerHTML = `
            <div class="preview-chip file-chip">
                <span class="file-chip-icon">📄</span>
                <span class="file-chip-name">${escapeHtml(pendingAttachment.name)}</span>
                <div class="preview-remove" onclick="clearAttachment()">✕</div>
            </div>`;
    }
}

function clearAttachment() {
    pendingAttachment = null;
    renderAttachmentPreview();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Modelin gizli kalması gereken <think>...</think> düşünme bloğu sızarsa temizler
function stripThinking(text) {
    if (!text) return text;
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const openIdx = cleaned.search(/<think>/i);
    if (openIdx !== -1) cleaned = cleaned.slice(0, openIdx);
    return cleaned.trim();
}

// Basit ve güvenli Markdown -> HTML dönüştürücü (AI cevaplarındaki **kalın**, ### başlık vb. için)
function renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    html = html.replace(/```([\s\S]*?)```/g, (m, code) => `<pre class="md-code">${code.trim()}</pre>`);
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^#{1,3}\s+(.*)$/gm, '<strong class="md-h">$1</strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    html = html.replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)(?:\s*<br>\s*)?(?=<li>|$)/g, '$1');
    html = html.replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/\n/g, '<br>');
    return html;
}


async function pokeDeniz() {
    closeAttachMenu();
    await fetch('https://tfyphciyqshdvkpsrxxl.supabase.co/functions/v1/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: "Nehir seni özledi 🚨" })
    });
    alert("Deniz'e haber verildi!");
}

// Mesaj gönderme
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (!message && !pendingAttachment) return;

    hideWelcomeScreen();

    const attachment = pendingAttachment;
    addMessageToUI('user', message, attachment);
    input.value = '';
    clearAttachment();

    const sessions = getSessions();
    let active = sessions.find(s => s.id === getActiveId());
    if (!active) {
        active = createSessionObject();
        sessions.unshift(active);
        setActiveId(active.id);
    }

    const userMsg = { role: 'user', content: message };
    if (attachment) userMsg.attachment = attachment;
    active.messages.push(userMsg);
    if (!active.title) active.title = generateTitle(message || attachment.name);
    active.updatedAt = Date.now();
    saveSessions(sessions);
    renderSidebar();

    try {
        const res = await fetch('https://tfyphciyqshdvkpsrxxl.supabase.co/functions/v1/chat-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                history: active.messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
                attachment: attachment ? { kind: attachment.kind, name: attachment.name, type: attachment.type, data: attachment.dataUrl } : null
            })
        });
        const data = await res.json();
        const cleanContent = stripThinking(data.content);
        addMessageToUI('ai', cleanContent);

        const freshSessions = getSessions();
        const freshActive = freshSessions.find(s => s.id === active.id);
        if (freshActive) {
            freshActive.messages.push({ role: 'assistant', content: cleanContent });
            freshActive.updatedAt = Date.now();
            saveSessions(freshSessions);
            renderSidebar();
        }
    } catch (err) {
        addMessageToUI('ai', 'Bir şeyler ters gitti, tekrar dener misin?');
    }
}

// UI Fonksiyonları
function addMessageToUI(role, text, attachment) {
    const chatBox = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = `message ${role}`;

    if (attachment && attachment.kind === 'image') {
        const img = document.createElement('img');
        img.src = attachment.dataUrl;
        img.alt = attachment.name || 'görsel';
        img.className = 'message-image';
        div.appendChild(img);
    } else if (attachment && attachment.kind === 'file') {
        const chip = document.createElement('div');
        chip.className = 'message-file-chip';
        chip.innerHTML = `📄 <span>${escapeHtml(attachment.name)}</span>`;
        div.appendChild(chip);
    }

    if (text) {
        const textEl = document.createElement('div');
        if (role === 'ai') {
            textEl.innerHTML = renderMarkdown(text);
        } else {
            textEl.innerText = text;
        }
        div.appendChild(textEl);
    }

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function hideWelcomeScreen() {
    document.getElementById('welcome-msg').style.display = 'none';
}

function startNewChat() {
    const sessions = getSessions();
    const active = sessions.find(s => s.id === getActiveId());

    // Aktif sohbet zaten boşsa yeni bir tane daha oluşturma
    if (!active || active.messages.length > 0) {
        const newSession = createSessionObject();
        sessions.unshift(newSession);
        saveSessions(sessions);
        setActiveId(newSession.id);
    }
    renderActiveChat();
    renderSidebar();
    toggleSidebar();
}

// Menü ve Dinleyiciler
window.onload = initApp;
document.getElementById('user-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
document.getElementById('file-input').addEventListener('change', (e) => handleFileSelect(e, 'file'));
document.getElementById('image-input').addEventListener('change', (e) => handleFileSelect(e, 'image'));

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('show');
    document.getElementById('menu-btn').classList.toggle('open');
}

function toggleAttachMenu() {
    const sheet = document.getElementById('attach-sheet');
    const overlay = document.getElementById('attach-overlay');
    const btn = document.getElementById('attach-btn');
    if (sheet.classList.contains('show')) {
        closeAttachMenu();
    } else {
        sheet.classList.add('show');
        overlay.classList.add('show');
        btn.classList.add('open');
    }
}

function closeAttachMenu() {
    document.getElementById('attach-sheet').classList.remove('show');
    document.getElementById('attach-overlay').classList.remove('show');
    document.getElementById('attach-btn').classList.remove('open');
}

function triggerUpload(type) {
    closeAttachMenu();
    const inputId = type === 'image' ? 'image-input' : 'file-input';
    document.getElementById(inputId).click();
}
