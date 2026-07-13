// Karşılama mesajı (Saate göre)
const hour = new Date().getHours();
const greeting = hour < 12 ? "Günaydın Nehir ✨" : hour < 18 ? "Tünaydın Nehir ✨" : "İyi akşamlar Nehir ✨";
document.getElementById('greeting').innerText = greeting;

// "Denizi Dürt" Fonksiyonu
async function pokeDeniz() {
    closeAttachMenu();
    const response = await fetch('https://tfyphciyqshdvkpsrxxl.supabase.co/functions/v1/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: "Nehir sana kızdı 🚨" })
    });
    if (response.ok) alert("Deniz'e gönderildi!");
}

// Mesaj gönderme
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (!message) return;

    hideWelcomeScreen();

    // Arayüze ekle (geçici)
    addMessageToUI('user', message);
    input.value = '';

    // Supabase Edge Function'a gönder
    const res = await fetch('https://tfyphciyqshdvkpsrxxl.supabase.co/functions/v1/chat-ai', {
        method: 'POST',
        body: JSON.stringify({ message: message, history: [] })
    });
    const data = await res.json();
    addMessageToUI('ai', data.content);
}

function addMessageToUI(role, text) {
    const chatBox = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function hideWelcomeScreen() {
    const welcome = document.getElementById('welcome-msg');
    if (welcome) welcome.style.display = 'none';
}

function startNewChat() {
    document.getElementById('chat-box').innerHTML = '';
    document.getElementById('welcome-msg').style.display = 'flex';
    toggleSidebar();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const menuBtn = document.getElementById('menu-btn');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
    menuBtn.classList.toggle('open');
}

// Ekleme Menüsü (Dosya / Görsel / Denizi Dürt)
function toggleAttachMenu() {
    const sheet = document.getElementById('attach-sheet');
    const overlay = document.getElementById('attach-overlay');
    const btn = document.getElementById('attach-btn');
    const isOpen = sheet.classList.contains('show');
    if (isOpen) {
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

// Enter tuşu ile gönderme
document.getElementById('user-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});
