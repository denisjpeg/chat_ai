// Karşılama mesajı
const hour = new Date().getHours();
const greeting = hour < 12 ? "Günaydın Nehir ✨" : hour < 18 ? "Tünaydın Nehir ✨" : "İyi akşamlar Nehir ✨";
document.getElementById('greeting').innerText = greeting;

// "Deniz'i Dürt"
async function pokeDeniz() {
    closeAttachMenu();
    await fetch('https://tfyphciyqshdvkpsrxxl.supabase.co/functions/v1/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: "Nehir seni özledi 🚨" })
    });
    alert("Deniz'e haber verildi!");
}

// Mesaj gönderme ve Geçmiş Yönetimi
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (!message) return;

    hideWelcomeScreen();
    addMessageToUI('user', message);
    input.value = '';

    let chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    chatHistory.push({ role: "user", content: message });

    const res = await fetch('https://tfyphciyqshdvkpsrxxl.supabase.co/functions/v1/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, history: chatHistory.slice(-10) })
    });
    
    const data = await res.json();
    addMessageToUI('ai', data.content);

    chatHistory.push({ role: "assistant", content: data.content });
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

// UI Fonksiyonları
function addMessageToUI(role, text) {
    const chatBox = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function loadChatHistory() {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    if (chatHistory.length > 0) {
        hideWelcomeScreen();
        chatHistory.forEach(msg => {
            if (msg.role !== 'system') addMessageToUI(msg.role === 'user' ? 'user' : 'ai', msg.content);
        });
    }
}

function hideWelcomeScreen() { document.getElementById('welcome-msg').style.display = 'none'; }
function startNewChat() {
    document.getElementById('chat-box').innerHTML = '';
    localStorage.removeItem('chatHistory');
    document.getElementById('welcome-msg').style.display = 'flex';
    toggleSidebar();
}

// Menü ve Dinleyiciler
window.onload = loadChatHistory;
document.getElementById('user-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); }
function closeAttachMenu() { document.getElementById('attach-sheet').classList.remove('show'); document.getElementById('attach-overlay').classList.remove('show'); }
