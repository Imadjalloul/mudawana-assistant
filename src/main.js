/* ═══════════════════════════════════════════════════
   مساعد مدونة الأسرة — Chat Interface Logic
   ═══════════════════════════════════════════════════ */

let mudawanaData = null;
let currentMode = 'brief';
let conversations = []; // { id, title, messages: [{role, content}] }
let activeConvId = null;

/* ── Init ── */
async function init() {
    try {
        const res = await fetch('./data/mudawana.json');
        if (!res.ok) throw new Error('تعذّر تحميل بيانات مدونة الأسرة');
        mudawanaData = await res.json();
    } catch (error) {
        showLoadError(error.message);
        return;
    }

    loadConversations();
    setupSettings();
    setupInput();
    setupModeChips();
    setupMobileSidebar();
    setupExamples();
    renderHistory();
    checkApiKey();
}

/* ── Conversations (localStorage) ── */
function loadConversations() {
    try {
        conversations = JSON.parse(localStorage.getItem('mudawana_convs') || '[]');
    } catch { conversations = []; }
}

function saveConversations() {
    localStorage.setItem('mudawana_convs', JSON.stringify(conversations));
}

function getActiveConv() {
    return conversations.find(c => c.id === activeConvId);
}

function createConversation(firstQuestion) {
    const conv = {
        id: Date.now().toString(),
        title: firstQuestion.substring(0, 40),
        messages: [],
    };
    conversations.unshift(conv);
    activeConvId = conv.id;
    saveConversations();
    renderHistory();
    return conv;
}

function switchConversation(id) {
    activeConvId = id;
    renderHistory();
    renderMessages();
}

function deleteConversation(id) {
    conversations = conversations.filter(c => c.id !== id);
    if (activeConvId === id) {
        activeConvId = null;
        showWelcome();
    }
    saveConversations();
    renderHistory();
}

function newChat() {
    activeConvId = null;
    showWelcome();
    renderHistory();
    document.getElementById('chatInput').value = '';
    document.getElementById('chatInput').focus();
}

/* ── Render History Sidebar ── */
function renderHistory() {
    const container = document.getElementById('chatHistory');
    if (conversations.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:0.85rem">لا توجد محادثات بعد</div>';
        return;
    }
    container.innerHTML = conversations.map(c => `
        <div class="history-item ${c.id === activeConvId ? 'active' : ''}" data-id="${c.id}">
            <span class="history-title">${c.title}</span>
            <button class="history-delete" data-id="${c.id}" title="حذف">✕</button>
        </div>
    `).join('');

    container.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('history-delete')) return;
            switchConversation(el.dataset.id);
        });
    });

    container.querySelectorAll('.history-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteConversation(btn.dataset.id);
        });
    });
}

/* ── Render Messages ── */
function renderMessages() {
    const conv = getActiveConv();
    const area = document.getElementById('messagesArea');
    const welcome = document.getElementById('welcomeScreen');

    if (!conv || conv.messages.length === 0) {
        showWelcome();
        return;
    }

    if (welcome) welcome.remove();

    area.innerHTML = conv.messages.map(msg => {
        if (msg.role === 'user') {
            return `
                <div class="message">
                    <div class="msg-row user">
                        <div class="msg-avatar">👤</div>
                        <div class="msg-bubble">${escapeHtml(msg.content)}</div>
                    </div>
                </div>`;
        }
        return `
            <div class="message">
                <div class="msg-row assistant">
                    <div class="msg-avatar">📜</div>
                    <div class="msg-bubble">${msg.formatted || formatAIAnswer(msg.content)}</div>
                </div>
                <div class="msg-legal-note">⚖️ تذكر أن هذا ليس استشارة قانونية</div>
            </div>`;
    }).join('');

    // Article ref clicks
    area.querySelectorAll('.article-ref').forEach(ref => {
        ref.addEventListener('click', () => {
            const id = parseInt(ref.dataset.id);
            if (id) showArticle(id);
        });
    });

    scrollToBottom();
}

function showWelcome() {
    const area = document.getElementById('messagesArea');
    const existing = document.getElementById('welcomeScreen');
    if (existing) return;

    area.innerHTML = `
        <div class="welcome" id="welcomeScreen">
            <div class="welcome-icon">📜</div>
            <h2>مساعد مدونة الأسرة</h2>
            <p class="welcome-sub">القانون رقم 70.03 بمثابة مدونة الأسرة المغربية</p>
            <div class="welcome-examples">
                <button class="example-btn" data-q="شنو هي شروط الزواج؟">شنو هي شروط الزواج؟</button>
                <button class="example-btn" data-q="كيفاش كيتم الطلاق بالخلع؟">كيفاش كيتم الطلاق بالخلع؟</button>
                <button class="example-btn" data-q="شكون لي عندو الحق في الحضانة؟">شكون لي عندو الحق في الحضانة؟</button>
                <button class="example-btn" data-q="شنو هي حقوق المرأة في الميراث؟">شنو هي حقوق المرأة في الميراث؟</button>
            </div>
            <p class="welcome-note">⚖️ تذكر أن هذا ليس استشارة قانونية.</p>
        </div>`;
    setupExamples();
}

function appendUserMessage(text) {
    const area = document.getElementById('messagesArea');
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.remove();

    area.insertAdjacentHTML('beforeend', `
        <div class="message">
            <div class="msg-row user">
                <div class="msg-avatar">👤</div>
                <div class="msg-bubble">${escapeHtml(text)}</div>
            </div>
        </div>`);
    scrollToBottom();
}

function appendLoadingMessage() {
    const area = document.getElementById('messagesArea');
    area.insertAdjacentHTML('beforeend', `
        <div class="message msg-loading-container" id="loadingMsg">
            <div class="msg-row assistant msg-loading">
                <div class="msg-avatar">📜</div>
                <div class="msg-bubble">
                    <div class="typing-dots"><span></span><span></span><span></span></div>
                </div>
            </div>
        </div>`);
    scrollToBottom();
}

function replaceLoadingWithAnswer(formatted) {
    const loading = document.getElementById('loadingMsg');
    if (loading) {
        loading.outerHTML = `
            <div class="message">
                <div class="msg-row assistant">
                    <div class="msg-avatar">📜</div>
                    <div class="msg-bubble">${formatted}</div>
                </div>
                <div class="msg-legal-note">⚖️ تذكر أن هذا ليس استشارة قانونية</div>
            </div>`;
    }
    // Re-attach article ref handlers
    document.getElementById('messagesArea').querySelectorAll('.article-ref').forEach(ref => {
        ref.addEventListener('click', () => {
            const id = parseInt(ref.dataset.id);
            if (id) showArticle(id);
        });
    });
    scrollToBottom();
}

function scrollToBottom() {
    const area = document.getElementById('messagesArea');
    requestAnimationFrame(() => {
        area.scrollTop = area.scrollHeight;
    });
}

/* ── Input ── */
function setupInput() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    input.addEventListener('input', () => {
        sendBtn.disabled = !input.value.trim();
        autoResize(input);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', () => sendMessage());
    document.getElementById('newChatBtn').addEventListener('click', () => newChat());
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

/* ── Mode Chips ── */
function setupModeChips() {
    document.querySelectorAll('.mode-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.mode-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentMode = chip.dataset.mode;
        });
    });
}

/* ── Examples ── */
function setupExamples() {
    const messagesArea = document.getElementById('messagesArea');
    if (messagesArea.dataset.examplesBound === 'true') return;

    messagesArea.addEventListener('click', (event) => {
        const button = event.target.closest('.example-btn');
        if (!button) return;

        document.getElementById('chatInput').value = button.dataset.q;
        document.getElementById('sendBtn').disabled = false;
        sendMessage();
    });

    messagesArea.dataset.examplesBound = 'true';
}

function showLoadError(message) {
    const area = document.getElementById('messagesArea');
    area.innerHTML = `
        <div class="welcome" id="welcomeScreen">
            <div class="welcome-icon">⚠️</div>
            <h2>وقع مشكل فتحميل البيانات</h2>
            <p class="welcome-sub">${escapeHtml(message)}</p>
            <p class="welcome-note">جرّب تحدّث الصفحة أو تأكد من وجود ملف البيانات.</p>
        </div>`;
}

/* ── Mobile Sidebar ── */
function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuBtn');

    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        toggleOverlay(sidebar.classList.contains('open'));
    });

    document.getElementById('mobileSettingsBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('visible');
    });
}

function toggleOverlay(show) {
    let overlay = document.querySelector('.sidebar-overlay');
    if (show && !overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay visible';
        overlay.addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
            overlay.remove();
        });
        document.body.appendChild(overlay);
    } else if (!show && overlay) {
        overlay.remove();
    }
}

/* ── Settings ── */
function setupSettings() {
    const modal = document.getElementById('settingsModal');
    const input = document.getElementById('apiKeyInput');

    document.getElementById('openSettingsBtn').addEventListener('click', () => {
        input.value = localStorage.getItem('gemini_api_key') || '';
        modal.classList.add('visible');
    });

    document.getElementById('closeSettings').addEventListener('click', () => {
        modal.classList.remove('visible');
    });

    document.getElementById('saveApiKey').addEventListener('click', () => {
        const key = input.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            modal.classList.remove('visible');
            checkApiKey();
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('visible');
    });
}

function checkApiKey() {
    const hasKey = !!localStorage.getItem('gemini_api_key');
    const banner = document.querySelector('.no-key-banner');
    if (!hasKey && !banner) {
        const bar = document.querySelector('.input-bar');
        bar.insertAdjacentHTML('afterbegin',
            `<div class="no-key-banner">🔑 أدخل مفتاح Gemini API المجاني — <a href="https://aistudio.google.com/apikey" target="_blank">احصل على مفتاح</a> — ثم افتح ⚙️ الإعدادات</div>`);
    } else if (hasKey && banner) {
        banner.remove();
    }
}

/* ── Send Message ── */
async function sendMessage() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        document.getElementById('settingsModal').classList.add('visible');
        return;
    }

    const input = document.getElementById('chatInput');
    const question = input.value.trim();
    if (!question) return;

    input.value = '';
    input.style.height = 'auto';
    document.getElementById('sendBtn').disabled = true;

    // Create or use active conversation
    let conv = getActiveConv();
    if (!conv) {
        conv = createConversation(question);
    }

    // Add user message
    conv.messages.push({ role: 'user', content: question });
    saveConversations();
    appendUserMessage(question);
    appendLoadingMessage();

    try {
        const articlesContext = mudawanaData.articles
            .map(a => `المادة ${a.id}: ${a.text}`)
            .join('\n\n');

        const systemPrompt = getSystemPrompt(currentMode, articlesContext);

        // Build conversation history for context
        const historyParts = conv.messages.slice(-6).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        // Replace last user message with full prompt
        historyParts[historyParts.length - 1] = {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nسؤال المستخدم: ${question}` }]
        };

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: historyParts,
                    generationConfig: {
                        temperature: currentMode === 'brief' ? 0.2 : 0.4,
                        maxOutputTokens: currentMode === 'brief' ? 1000 : 10000,
                    }
                })
            }
        );

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'خطأ في الاتصال');
        }

        const data = await response.json();
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم الحصول على إجابة';
        const formatted = formatAIAnswer(answer);

        conv.messages.push({ role: 'assistant', content: answer, formatted });
        saveConversations();
        replaceLoadingWithAnswer(formatted);

    } catch (error) {
        const errHtml = `<div style="color:#dc2626;text-align:center">❌ ${error.message}</div>`;
        replaceLoadingWithAnswer(errHtml);
    }
}

function getSystemPrompt(mode, articlesContext) {
    if (mode === 'brief') {
        return `أنت مساعد دراسة وبحث متخصص في مدونة الأسرة المغربية (القانون رقم 70.03).

أنت في الوضع المختصر ⚡ — أعطِ جواب مباشر، قصير، وذكي.

قواعد الإجابة:
1. أجب بالدارجة المغربية (Darija)
2. كن مختصرًا جدًا — جملتين إلى 5 جمل كحد أقصى
3. اذكر رقم المادة/المواد المعنية مباشرة
4. لا تكرر السؤال ولا تقدم مقدمات
5. إذا لم تجد سندًا: "ما لقيتش شي سند نصي كافي في مدونة الأسرة باش نجاوبك على هاد السؤال"
6. لا تذكر أن هذا ليس استشارة قانونية
7. استخدم **النص الغليظ** للمصطلحات المهمة

نص مدونة الأسرة:
${articlesContext}`;
    }

    return `أنت مساعد دراسة وبحث متخصص في مدونة الأسرة المغربية (القانون رقم 70.03).

أنت في وضع التحليل المفصّل 🧠 — أعطِ تحليل شامل ومعمّق.

قواعد الإجابة:
1. أجب بالدارجة المغربية (Darija)
2. نظّم إجابتك بعناوين واضحة (## عنوان) وقوائم مرقمة
3. اشرح كل نقطة بالتفصيل مع ذكر المواد المعنية
4. قارن بين الحالات المختلفة إذا كان ذلك مناسبًا
5. اذكر الاستثناءات والشروط الخاصة
6. إذا لم تجد سندًا: "ما لقيتش شي سند نصي كافي في مدونة الأسرة باش نجاوبك على هاد السؤال"
7. لا تذكر أن هذا ليس استشارة قانونية
8. استخدم **النص الغليظ** للمصطلحات المهمة
9. في النهاية، لخّص النقاط الأساسية

نص مدونة الأسرة:
${articlesContext}`;
}

/* ── Format AI Answer ── */
function formatAIAnswer(text) {
    let formatted = text.replace(/المادة\s*(\d+)/g, (match, num) => {
        return `<span class="article-ref" data-id="${num}">المادة ${num}</span>`;
    });

    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Clean up stray markdown markers
    formatted = formatted.replace(/\*\*/g, '');
    formatted = formatted.replace(/(?<!\w)\*(?!\w)/g, '');

    const lines = formatted.split('\n').filter(l => l.trim());
    let html = '';

    for (const line of lines) {
        const trimmed = line.trim();

        if (/^#{1,3}\s+/.test(trimmed)) {
            const headingText = trimmed.replace(/^#{1,3}\s+/, '');
            html += `<div class="ai-heading">${headingText}</div>`;
            continue;
        }

        const numMatch = trimmed.match(/^(\d+)[.\-\)]\s*(.*)/);
        if (numMatch) {
            html += `<div class="ai-list-item"><span class="ai-list-num">${numMatch[1]}</span>${numMatch[2]}</div>`;
            continue;
        }

        if (/^[-*•]\s+/.test(trimmed)) {
            const bulletText = trimmed.replace(/^[-*•]\s+/, '');
            html += `<div class="ai-bullet">${bulletText}</div>`;
            continue;
        }

        html += `<p>${trimmed}</p>`;
    }

    return html;
}

/* ── Article Modal ── */
function showArticle(id) {
    const article = mudawanaData.articles.find(a => a.id === id);
    if (!article) return;

    const modal = document.getElementById('articleModal');
    document.getElementById('articleModalTitle').textContent = `المادة ${article.id}`;
    document.getElementById('articleModalBody').innerHTML = `
        <div class="article-meta">
            ${article.book_name ? `<span class="article-meta-tag">📖 ${article.book_name}</span>` : ''}
            ${article.chapter ? `<span class="article-meta-tag">📁 ${article.chapter}</span>` : ''}
        </div>
        <div class="article-full-text">${article.text}</div>`;
    modal.classList.add('visible');

    document.getElementById('closeArticle').onclick = () => modal.classList.remove('visible');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('visible'); };
}

/* ── Helpers ── */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ── Start ── */
document.addEventListener('DOMContentLoaded', init);
