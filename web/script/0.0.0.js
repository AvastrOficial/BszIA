// Configuración
const LIMIT = 50;

const sb = supabase.createClient(SB_URL, SB_KEY);

let me = null;
let chats = [];
let activeId = null;
let usage = { date: '', count: 0, extraDays: 0 };
let busy = false;
let sbVisible = false;
let editIdx = null;

// ==================== FUNCIONES DE SEGURIDAD ====================
function esc(s) { 
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}

// Sanitizar entrada del usuario - eliminar scripts maliciosos
function sanitizeInput(text) {
    if (!text) return '';
    // Eliminar etiquetas script y eventos
    let sanitized = text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/<iframe/gi, '&lt;iframe')
        .replace(/<object/gi, '&lt;object')
        .replace(/<embed/gi, '&lt;embed');
    return sanitized;
}

// Detectar preguntas sobre la IA o configuración
function isForbiddenQuestion(text) {
    const lowerText = text.toLowerCase();
    const forbiddenPatterns = [
        /qué\s+(ia|inteligencia\s+artificial|modelo)\s+(eres|usas|utilizas)/i,
        /quién\s+te\s+(creó|hizo|desarrolló)/i,
        /de\s+qué\s+empresa\s+eres/i,
        /qué\s+api\s+usas/i,
        /cómo\s+funcionas/i,
        /cuál\s+es\s+tu\s+modelo/i,
        /quién\s+es\s+tu\s+creador/i,
        /qué\s+tecnología\s+usas/i,
        /dame\s+tu\s+código\s+fuente/i,
        /muéstrame\s+tu\s+configuración/i,
        /cuál\s+es\s+tu\s+key/i,
        /api\s+key/i,
        /groq/i,
        /supabase/i,
        /token/i,
        /configuración/i
    ];
    
    for (const pattern of forbiddenPatterns) {
        if (pattern.test(lowerText)) {
            return true;
        }
    }
    return false;
}

// Respuesta para preguntas prohibidas
function getForbiddenResponse() {
    return "🤖 Soy BszIA, una inteligencia artificial creada por **AvaStrOficial**. Mi misión es ayudarte con tus preguntas, generar imágenes y proporcionarte código. ¿En qué más puedo asistirte hoy?";
}

function getStorageKey(k) {
    return `bsz_${me?.username || 'x'}_${k}`;
}

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = isError ? 'var(--danger)' : 'var(--accent3)';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = `<i class="fas fa-circle-exclamation"></i> ${message}`;
        el.style.display = 'block';
        setTimeout(() => {
            el.style.display = 'none';
        }, 5000);
    }
}

function showSuccess(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = `<i class="fas fa-circle-check"></i> ${message}`;
        el.style.display = 'block';
        setTimeout(() => {
            el.style.display = 'none';
        }, 3000);
    }
}

// ==================== RECLAMACIÓN DE DÍAS EXTRAS ====================
function showRedeemModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-redeem';
    modal.innerHTML = `
        <div class="redeem-content">
            <h3><i class="fas fa-gift"></i> Reclamar Días Extras</h3>
            <p>Ingresa tu código de reclamación para obtener días adicionales</p>
            <input type="text" id="redeemKeyInput" placeholder="Código de reclamación" class="redeem-input">
            <div class="redeem-buttons">
                <button id="confirmRedeemBtn" class="redeem-confirm"><i class="fas fa-check"></i> Reclamar</button>
                <button id="cancelRedeemBtn" class="redeem-cancel"><i class="fas fa-times"></i> Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('confirmRedeemBtn').onclick = () => {
        const key = document.getElementById('redeemKeyInput').value.trim();
        redeemExtraDays(key);
        modal.remove();
    };
    
    document.getElementById('cancelRedeemBtn').onclick = () => modal.remove();
}

function redeemExtraDays(key) {
    // Códigos de reclamación válidos
    const validKeys = {
        'AVASTRO2024': 7,
        'EXTRA50': 5,
        'BSZIA2025': 10,
        'DIAEXTRA': 3,
        'VIPDAY': 15
    };
    
    if (validKeys[key]) {
        const daysToAdd = validKeys[key];
        usage.extraDays += daysToAdd;
        localStorage.setItem(getStorageKey('u'), JSON.stringify(usage));
        updateUsageUI();
        showToast(`✅ ¡Has reclamado ${daysToAdd} días extras!`, false);
        
        // Guardar códigos usados
        const usedKeys = JSON.parse(localStorage.getItem(getStorageKey('used_keys')) || '[]');
        if (!usedKeys.includes(key)) {
            usedKeys.push(key);
            localStorage.setItem(getStorageKey('used_keys'), JSON.stringify(usedKeys));
        }
    } else {
        showToast('❌ Código inválido o ya utilizado', true);
    }
}

// ==================== FUNCIONES DE CÓDIGO SIMPLIFICADAS ====================
function copyCode(btn) {
    const pre = btn.parentElement;
    const code = pre.querySelector('code');
    const text = code.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
        showToast('¡Código copiado al portapapeles!');
    }).catch(() => {
        showToast('Error al copiar', true);
    });
}

function formatCodeInText(text) {
    if (!text) return '';
    
    let safeText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    let formatted = safeText.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'plaintext';
        const cleanCode = code
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
        
        return `
            <div class="code-block">
                <div class="code-header">
                    <span class="code-lang">${language}</span>
                    <button class="copy-code-btn" onclick="window.copyCode(this)">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                </div>
                <pre><code class="language-${language}">${cleanCode}</code></pre>
            </div>
        `;
    });
    
    formatted = formatted.replace(/`([^`]+)`/g, (match, code) => {
        if (match.includes('<pre>')) return match;
        return `<code>${code}</code>`;
    });
    
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

function applySyntaxHighlighting() {
    setTimeout(() => {
        document.querySelectorAll('pre code').forEach((block) => {
            try {
                hljs.highlightElement(block);
            } catch (e) {
                console.log('Error resaltando código:', e);
            }
        });
    }, 100);
}

// ==================== GENERACIÓN DE IMÁGENES ====================
async function generateImage(prompt, retry = 0) {
    const cleanPrompt = encodeURIComponent(prompt.substring(0, 200));
    const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=1024&model=flux&nologo=true&seed=${Date.now() + retry}`;
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        const timeout = setTimeout(() => {
            reject(new Error("Timeout: La imagen tardó demasiado en generarse"));
        }, 30000);
        
        img.onload = () => {
            clearTimeout(timeout);
            resolve(imageUrl);
        };
        
        img.onerror = () => {
            clearTimeout(timeout);
            if (retry < 2) {
                generateImage(prompt, retry + 1).then(resolve).catch(reject);
            } else {
                reject(new Error("Error al generar la imagen. Intenta con otra descripción."));
            }
        };
        
        img.src = imageUrl;
    });
}

function isImageCommand(text) {
    const cleanText = text.toLowerCase().trim();
    const patterns = [
        /^(genera|crea|dibuja|muestrame|hazme|dame)\s+(una?|un)?\s*imagen\s+(de|del?|sobre|de un|de una)\s+/i,
        /^(imagen|foto|dibujo)\s+(de|del?|sobre)\s+/i,
        /^genera\s+una\s+imagen\s+de\s+/i,
        /^crea\s+una\s+imagen\s+de\s+/i,
        /^dame\s+una\s+imagen\s+de\s+/i
    ];
    
    for (const pattern of patterns) {
        if (pattern.test(cleanText)) {
            return true;
        }
    }
    return false;
}

function extractPrompt(text) {
    let prompt = text;
    const prefixes = [
        /^(genera|crea|dibuja|muestrame|hazme|dame)\s+(una?|un)?\s*imagen\s+(de|del?|sobre|de un|de una)\s+/i,
        /^(imagen|foto|dibujo)\s+(de|del?|sobre)\s+/i
    ];
    
    for (const pattern of prefixes) {
        prompt = prompt.replace(pattern, '');
    }
    
    prompt = prompt.trim();
    
    if (!prompt || prompt.length < 3) {
        prompt = 'un hermoso paisaje natural';
    }
    
    return prompt;
}

// ==================== FUNCIONES DE AUTENTICACIÓN ====================
function checkStrength(password) {
    const fill = document.getElementById('strengthFill');
    const label = document.getElementById('strengthLabel');
    
    if (!password) {
        fill.style.width = '0%';
        label.textContent = '';
        return;
    }
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    const levels = [
        { width: '20%', color: '#f85149', text: 'Muy débil' },
        { width: '40%', color: '#e3b341', text: 'Débil' },
        { width: '60%', color: '#e3b341', text: 'Regular' },
        { width: '80%', color: '#3fb950', text: 'Buena' },
        { width: '100%', color: '#58a6ff', text: 'Excelente' }
    ];
    
    const level = levels[Math.min(strength, 4)];
    fill.style.width = level.width;
    fill.style.background = level.color;
    label.textContent = level.text;
    label.style.color = level.color;
}

function showRegisterPanel() {
    document.getElementById('panelLogin').style.display = 'none';
    document.getElementById('panelRegister').style.display = 'block';
}

function showLoginPanel() {
    document.getElementById('panelRegister').style.display = 'none';
    document.getElementById('panelLogin').style.display = 'block';
}

async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const pinInputs = document.querySelectorAll('#loginPinRow .login-pin');
    const pin = Array.from(pinInputs).map(d => d.value).join('');
    const btn = document.getElementById('loginBtn');
    
    document.getElementById('loginError').style.display = 'none';
    
    if (!email || !password || pin.length !== 4) {
        showError('loginError', 'Completa todos los campos incluyendo el PIN de 4 dígitos.');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    
    try {
        const { data, error } = await sb.rpc('verify_login', {
            p_correo: email,
            p_password: password,
            p_pin: pin
        });
        
        if (error) throw new Error('Error de conexión.');
        if (!data?.success) throw new Error(data?.message || 'Credenciales incorrectas.');
        
        me = { username: data.user, vip: data.vip };
        bootApp();
        
    } catch (e) {
        showError('loginError', e.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar sesión';
    }
}

async function doRegister() {
    const user = document.getElementById('regUser').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    const pinInputs = document.querySelectorAll('#regPinRow .reg-pin');
    const pin = Array.from(pinInputs).map(d => d.value).join('');
    const btn = document.getElementById('registerBtn');
    
    document.getElementById('registerError').style.display = 'none';
    document.getElementById('registerSuccess').style.display = 'none';
    
    if (!user || !email || !password || !passwordConfirm || pin.length !== 4) {
        showError('registerError', 'Completa todos los campos.');
        return;
    }
    
    if (password !== passwordConfirm) {
        showError('registerError', 'Las contraseñas no coinciden.');
        return;
    }
    
    if (password.length < 6) {
        showError('registerError', 'La contraseña debe tener al menos 6 caracteres.');
        return;
    }
    
    if (!/^\d{4}$/.test(pin)) {
        showError('registerError', 'El PIN debe ser 4 dígitos numéricos.');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando cuenta...';
    
    try {
        const { data, error } = await sb.rpc('register_user', {
            p_user: user,
            p_correo: email,
            p_password: password,
            p_pin: pin
        });
        
        if (error) throw new Error('Error de conexión.');
        if (!data?.success) throw new Error(data?.message || 'No se pudo registrar.');
        
        showSuccess('registerSuccess', 'Cuenta creada correctamente. Entrando...');
        me = { username: data.user, vip: data.vip };
        
        setTimeout(() => {
            bootApp();
        }, 1500);
        
    } catch (e) {
        showError('registerError', e.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Crear cuenta';
    }
}

function bootApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'flex';
    document.getElementById('headerUsername').textContent = me.username;
    if (me.vip >= 1) document.getElementById('vipBadge').style.display = 'inline-flex';
    loadUsage();
    loadChats();
}

function doLogout() {
    me = null;
    chats = [];
    activeId = null;
    
    document.getElementById('appScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.querySelectorAll('.login-pin, .reg-pin').forEach(d => d.value = '');
    document.getElementById('regUser').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regPasswordConfirm').value = '';
    
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('registerError').style.display = 'none';
    document.getElementById('registerSuccess').style.display = 'none';
    document.getElementById('vipBadge').style.display = 'none';
    
    document.getElementById('loginBtn').disabled = false;
    document.getElementById('loginBtn').innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar sesión';
    document.getElementById('registerBtn').disabled = false;
    document.getElementById('registerBtn').innerHTML = '<i class="fas fa-user-plus"></i> Crear cuenta';
    
    showLoginPanel();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sbVisible = !sbVisible;
    sidebar.classList.toggle('hidden', !sbVisible);
    if (window.innerWidth <= 768) {
        overlay.classList.toggle('visible', sbVisible);
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sbVisible = false;
    sidebar.classList.add('hidden');
    overlay.classList.remove('visible');
}

function loadUsage() {
    const today = new Date().toDateString();
    try {
        const stored = localStorage.getItem(getStorageKey('u'));
        const parsed = stored ? JSON.parse(stored) : null;
        if (parsed?.date === today) {
            usage = parsed;
        } else {
            usage = { date: today, count: 0, extraDays: parsed?.extraDays || 0 };
        }
    } catch {
        usage = { date: today, count: 0, extraDays: 0 };
    }
    updateUsageUI();
}

function getMaxLimit() {
    return LIMIT + (usage.extraDays * LIMIT);
}

function updateUsageUI() {
    const maxLimit = getMaxLimit();
    document.getElementById('usageText').innerHTML = `<i class="fas fa-bolt"></i> ${usage.count} / ${maxLimit} hoy`;
    document.getElementById('usageFill').style.width = `${(usage.count / maxLimit) * 100}%`;
    if (usage.extraDays > 0) {
        document.getElementById('extraDaysBadge').style.display = 'inline-flex';
        document.getElementById('extraDaysBadge').innerHTML = `<i class="fas fa-star"></i> +${usage.extraDays} días`;
    }
}

function incrementUsage() {
    const maxLimit = getMaxLimit();
    if (usage.count >= maxLimit) return false;
    usage.count++;
    localStorage.setItem(getStorageKey('u'), JSON.stringify(usage));
    updateUsageUI();
    return true;
}

function saveChats() {
    localStorage.setItem(getStorageKey('c'), JSON.stringify(chats));
    localStorage.setItem(getStorageKey('a'), activeId || '');
    renderSidebar();
}

function loadChats() {
    try {
        chats = JSON.parse(localStorage.getItem(getStorageKey('c'))) || [];
    } catch {
        chats = [];
    }
    
    if (!chats.length) {
        createNewChat();
    } else {
        const storedActive = localStorage.getItem(getStorageKey('a'));
        activeId = storedActive && chats.find(c => c.id === storedActive) ? storedActive : chats[0].id;
        renderSidebar();
        renderMessages();
    }
}

function getCurrentChat() {
    return chats.find(c => c.id === activeId);
}

function createNewChat() {
    const id = Date.now().toString();
    const newChat = {
        id: id,
        name: 'Nueva conversación',
        messages: [{
            id: Date.now().toString(),
            role: 'assistant',
            type: 'text',
            content: `Hola, ${me.username}. Soy BszIA, creada por **AvaStrOficial**.

✨ **Características:**
- 🎨 **Genera imágenes con IA** (ej: "genera una imagen de un gato")
- 💻 **Código con resaltado** y botón de copiar
- 📝 **Respuestas completas** y detalladas
- 🎁 **Reclama días extras** con códigos especiales
- 📊 **Límite diario:** ${getMaxLimit()} mensajes

**Códigos disponibles:**
- AVASTRO2024 → +7 días
- EXTRA50 → +5 días  
- BSZIA2025 → +10 días
- DIAEXTRA → +3 días
- VIPDAY → +15 días

**Ejemplos:**
- "genera una imagen de un perro volando"
- "código html para una calculadora"
- "explica qué es React"

¿En qué puedo ayudarte?`,
            ts: new Date().toISOString()
        }],
        created: Date.now()
    };
    chats.unshift(newChat);
    activeId = id;
    saveChats();
    renderMessages();
}

function deleteChat(id) {
    if (chats.length === 1) {
        createNewChat();
        return;
    }
    chats = chats.filter(c => c.id !== id);
    if (activeId === id) activeId = chats[0].id;
    saveChats();
    renderMessages();
}

function switchChat(id) {
    activeId = id;
    saveChats();
    renderMessages();
    if (window.innerWidth <= 768) closeSidebar();
}

function renderSidebar() {
    const ul = document.getElementById('chatsList');
    if (!ul) return;
    ul.innerHTML = '';
    
    chats.forEach(chat => {
        const li = document.createElement('li');
        li.className = `chat-item ${chat.id === activeId ? 'active' : ''}`;
        li.innerHTML = `
            <i class="fas fa-comment"></i>
            <span class="chat-item-text">${esc(chat.name)}</span>
            <button class="del-chat-btn" onclick="event.stopPropagation();deleteChat('${chat.id}')"><i class="fas fa-trash-can"></i></button>
        `;
        li.onclick = () => switchChat(chat.id);
        ul.appendChild(li);
    });
}

function renderMessages() {
    const chat = getCurrentChat();
    if (!chat) return;
    
    document.getElementById('chatTitleDisplay').textContent = chat.name;
    const area = document.getElementById('messagesArea');
    area.innerHTML = '';
    
    chat.messages.forEach((msg, idx) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.role === 'user' ? 'user-message' : 'bot-message'}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        if (msg.type === 'image' && msg.url) {
            const img = document.createElement('img');
            img.src = msg.url;
            img.alt = msg.content || 'Imagen generada';
            img.style.maxWidth = '100%';
            img.style.borderRadius = '8px';
            img.style.cursor = 'pointer';
            img.onclick = () => openModal(msg.url);
            bubble.appendChild(img);
            if (msg.content) {
                const caption = document.createElement('div');
                caption.style.marginTop = '8px';
                caption.style.fontSize = '0.8rem';
                caption.style.color = 'var(--text2)';
                caption.textContent = msg.content;
                bubble.appendChild(caption);
            }
        } else {
            const formattedContent = formatCodeInText(msg.content);
            bubble.innerHTML = formattedContent;
        }
        
        messageDiv.appendChild(bubble);
        
        const metaDiv = document.createElement('div');
        metaDiv.className = 'msg-meta';
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'msg-time';
        timeSpan.textContent = msg.ts ? new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        metaDiv.appendChild(timeSpan);
        
        if (msg.role === 'user') {
            const editBtn = document.createElement('button');
            editBtn.className = 'msg-action';
            editBtn.innerHTML = '<i class="fas fa-pen"></i> Editar';
            editBtn.onclick = () => startEdit(idx, msg.content);
            metaDiv.appendChild(editBtn);
        } else if (msg.type === 'text' && msg.role === 'assistant') {
            const regenBtn = document.createElement('button');
            regenBtn.className = 'msg-action';
            regenBtn.innerHTML = '<i class="fas fa-rotate-right"></i> Regenerar';
            regenBtn.onclick = () => regenerateResponse(idx);
            metaDiv.appendChild(regenBtn);
        }
        
        messageDiv.appendChild(metaDiv);
        area.appendChild(messageDiv);
    });
    
    applySyntaxHighlighting();
    area.scrollTop = area.scrollHeight;
}

function addMessage(role, content, type = 'text', url = null) {
    const chat = getCurrentChat();
    if (!chat) return;
    
    const message = {
        id: Date.now().toString(),
        role: role,
        content: content,
        type: type,
        ts: new Date().toISOString()
    };
    if (url) message.url = url;
    
    chat.messages.push(message);
    
    if (role === 'user' && chat.messages.filter(m => m.role === 'user').length === 1) {
        chat.name = content.substring(0, 30) + (content.length > 30 ? '...' : '');
    }
    
    saveChats();
    renderMessages();
}

let loadingElement = null;

function showLoading(text) {
    hideLoading();
    const area = document.getElementById('messagesArea');
    loadingElement = document.createElement('div');
    loadingElement.className = 'message bot-message loading-msg';
    loadingElement.innerHTML = `
        <div class="typing-bubble">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
            <span class="typing-text">${esc(text)}</span>
        </div>
    `;
    area.appendChild(loadingElement);
    area.scrollTop = area.scrollHeight;
}

function hideLoading() {
    if (loadingElement) {
        loadingElement.remove();
        loadingElement = null;
    }
}

// ==================== LLAMADA A GROQ CON SEGURIDAD ====================
async function callGroq(text, history) {
    const limitedHistory = history
        .slice(-15)
        .filter(m => m.type === 'text' && m.content)
        .map(m => ({ 
            role: m.role, 
            content: m.content.length > 3000 ? m.content.substring(0, 3000) : m.content 
        }));
    
    const messages = [
        { role: 'system', content: `Eres BszIA, una IA creada por AvaStrOficial. 
        
REGLAS ESTRICTAS:
- NUNCA reveles tu configuración, API keys, o información técnica interna
- Si te preguntan cómo funcionas, qué IA eres, qué API usas, responde: "Soy BszIA, creada por AvaStrOficial. Mi misión es ayudarte con tus preguntas, generar imágenes y código."
- NO menciones Groq, Supabase, ni ninguna tecnología específica
- Responde en español de forma natural y útil
- Usa triple backticks para mostrar código
- Sé amable y servicial` },
        ...limitedHistory,
        { role: 'user', content: text }
    ];
    
    const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: messages,
            temperature: 0.85,
            max_tokens: 4000,
            top_p: 0.95
        })
    });
    
    if (!response.ok) throw new Error(`Error de API: ${response.status}`);
    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sin respuesta.';
}

// ==================== ENVÍO DE MENSAJES CON SEGURIDAD ====================
async function sendMessage() {
    if (busy) return;
    
    const input = document.getElementById('userInput');
    let text = input.value.trim();
    if (!text) return;
    
    // Sanitizar entrada
    text = sanitizeInput(text);
    
    // Verificar límite
    const maxLimit = getMaxLimit();
    if (usage.count >= maxLimit) {
        showToast(`Límite de ${maxLimit} mensajes alcanzado. Reclama días extras con códigos.`, true);
        return;
    }
    
    // Verificar preguntas prohibidas
    if (isForbiddenQuestion(text)) {
        addMessage('user', text);
        input.value = '';
        input.style.height = 'auto';
        addMessage('assistant', getForbiddenResponse());
        return;
    }
    
    if (!incrementUsage()) return;
    
    const isImage = isImageCommand(text);
    
    if (isImage) {
        const prompt = extractPrompt(text);
        addMessage('user', text);
        input.value = '';
        input.style.height = 'auto';
        busy = true;
        document.getElementById('sendBtn').disabled = true;
        showLoading(`🎨 Generando imagen...`);
        
        try {
            const imageUrl = await generateImage(prompt);
            hideLoading();
            addMessage('assistant', `🖼️ **Imagen generada:** ${prompt}`, 'image', imageUrl);
            showToast('✅ Imagen generada con éxito');
        } catch (error) {
            hideLoading();
            addMessage('assistant', `❌ **Error al generar imagen:** ${error.message}`, 'text');
            showToast(error.message, true);
        }
    } else {
        addMessage('user', text);
        input.value = '';
        input.style.height = 'auto';
        busy = true;
        document.getElementById('sendBtn').disabled = true;
        showLoading('💭 Pensando...');
        
        try {
            const response = await callGroq(text, getCurrentChat()?.messages || []);
            hideLoading();
            addMessage('assistant', response);
        } catch (e) {
            hideLoading();
            addMessage('assistant', `❌ **Error:** ${e.message}`);
            showToast(e.message, true);
        }
    }
    
    busy = false;
    document.getElementById('sendBtn').disabled = false;
}

async function generateImageFromBtn() {
    if (busy) return;
    
    const input = document.getElementById('userInput');
    let prompt = input.value.trim();
    
    if (!prompt) {
        showToast('Escribe una descripción para la imagen', true);
        return;
    }
    
    prompt = sanitizeInput(prompt);
    
    const maxLimit = getMaxLimit();
    if (usage.count >= maxLimit) {
        showToast(`Límite de ${maxLimit} mensajes alcanzado.`, true);
        return;
    }
    
    if (!incrementUsage()) return;
    
    addMessage('user', `🎨 Generar imagen: ${prompt}`);
    input.value = '';
    input.style.height = 'auto';
    busy = true;
    document.getElementById('sendBtn').disabled = true;
    showLoading(`🎨 Generando imagen...`);
    
    try {
        const imageUrl = await generateImage(prompt);
        hideLoading();
        addMessage('assistant', `🖼️ **Imagen generada:** ${prompt}`, 'image', imageUrl);
        showToast('✅ Imagen generada con éxito');
    } catch (error) {
        hideLoading();
        addMessage('assistant', `❌ **Error al generar imagen:** ${error.message}`, 'text');
        showToast(error.message, true);
    }
    
    busy = false;
    document.getElementById('sendBtn').disabled = false;
}

function startEdit(idx, content) {
    editIdx = idx;
    const input = document.getElementById('userInput');
    input.value = content;
    input.focus();
    const btn = document.getElementById('sendBtn');
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.onclick = commitEdit;
}

async function commitEdit() {
    const input = document.getElementById('userInput');
    let text = input.value.trim();
    if (!text || editIdx === null) return;
    
    text = sanitizeInput(text);
    
    const btn = document.getElementById('sendBtn');
    btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    btn.onclick = sendMessage;
    
    if (!incrementUsage()) return;
    
    const chat = getCurrentChat();
    chat.messages[editIdx].content = text;
    chat.messages[editIdx].ts = new Date().toISOString();
    chat.messages = chat.messages.slice(0, editIdx + 1);
    saveChats();
    renderMessages();
    editIdx = null;
    input.value = '';
    
    busy = true;
    btn.disabled = true;
    showLoading('Generando respuesta...');
    
    try {
        const response = await callGroq(text, chat.messages);
        hideLoading();
        addMessage('assistant', response);
    } catch (e) {
        hideLoading();
        addMessage('assistant', `❌ Error: ${e.message}`);
    }
    
    busy = false;
    btn.disabled = false;
}

async function regenerateResponse(idx) {
    const chat = getCurrentChat();
    if (!chat || !chat.messages[idx - 1]) return;
    
    const userMessage = chat.messages[idx - 1].content;
    if (!incrementUsage()) return;
    
    chat.messages = chat.messages.slice(0, idx);
    saveChats();
    renderMessages();
    
    busy = true;
    document.getElementById('sendBtn').disabled = true;
    showLoading('Regenerando...');
    
    try {
        const response = await callGroq(userMessage, chat.messages);
        hideLoading();
        addMessage('assistant', response);
    } catch (e) {
        hideLoading();
        addMessage('assistant', `❌ Error: ${e.message}`);
    }
    
    busy = false;
    document.getElementById('sendBtn').disabled = false;
}

function openModal(url) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    const img = document.createElement('img');
    img.src = url;
    modal.onclick = () => modal.remove();
    modal.appendChild(img);
    document.body.appendChild(modal);
}

function setHint(text) {
    const input = document.getElementById('userInput');
    input.value = text;
    input.focus();
    autoResizeTextarea();
}

function autoResizeTextarea() {
    const ta = document.getElementById('userInput');
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 110) + 'px';
}

function setupPinListeners() {
    const loginPins = document.querySelectorAll('#loginPinRow .login-pin');
    loginPins.forEach((el, i, arr) => {
        el.addEventListener('input', () => {
            if (el.value.length === 1 && arr[i + 1]) arr[i + 1].focus();
        });
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !el.value && arr[i - 1]) arr[i - 1].focus();
            if (e.key === 'Enter') doLogin();
        });
    });
    
    const regPins = document.querySelectorAll('#regPinRow .reg-pin');
    regPins.forEach((el, i, arr) => {
        el.addEventListener('input', () => {
            if (el.value.length === 1 && arr[i + 1]) arr[i + 1].focus();
        });
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !el.value && arr[i - 1]) arr[i - 1].focus();
            if (e.key === 'Enter') doRegister();
        });
    });
}

// Exponer funciones globalmente
window.copyCode = copyCode;
window.generateImageFromBtn = generateImageFromBtn;
window.showRedeemModal = showRedeemModal;

document.addEventListener('DOMContentLoaded', () => {
    setupPinListeners();
    
    document.getElementById('loginBtn').onclick = doLogin;
    document.getElementById('registerBtn').onclick = doRegister;
    document.getElementById('sendBtn').onclick = sendMessage;
    
    const imageBtn = document.getElementById('generateImageBtn');
    if (imageBtn) {
        imageBtn.onclick = generateImageFromBtn;
    }
    
    const redeemBtn = document.getElementById('redeemDaysBtn');
    if (redeemBtn) {
        redeemBtn.onclick = showRedeemModal;
    }
    
    document.getElementById('userInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (editIdx !== null) commitEdit();
            else sendMessage();
        }
    });
    document.getElementById('userInput').addEventListener('input', autoResizeTextarea);
    document.getElementById('regPassword').addEventListener('input', (e) => checkStrength(e.target.value));
    
    if (window.innerWidth > 768) {
        document.getElementById('sidebar').classList.remove('hidden');
        sbVisible = true;
    } else {
        document.getElementById('sidebar').classList.add('hidden');
        sbVisible = false;
    }
    
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('sidebarOverlay').classList.remove('visible');
            sbVisible = true;
        } else {
            document.getElementById('sidebar').classList.add('hidden');
            sbVisible = false;
        }
    });
});
