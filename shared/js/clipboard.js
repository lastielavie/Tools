window.svgCopy = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
window.svgCheck = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

function copyText(text, btn, timeout = 1200) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        const originalContent = btn.innerHTML;
        btn.innerHTML = svgCheck;
        btn.classList.add('copied');
        setTimeout(() => {
            btn.innerHTML = originalContent.includes('svg') ? svgCopy : originalContent;
            btn.classList.remove('copied');
        }, timeout);
    });
}

function initCopyButtons() {
    document.querySelectorAll('.btn-copy').forEach(btn => {
        if (!btn.innerHTML.trim()) {
            btn.innerHTML = svgCopy;
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCopyButtons);
} else {
    initCopyButtons();
}

window.copyVal = function(displayId, inputId, btn) {
    const $ = id => document.getElementById(id);
    let target = $(displayId);
    if (!target) return;
    let value = target.innerText;
    if (inputId) {
        let inputEl = $(inputId);
        if (inputEl && inputEl.style.display !== 'none' && inputEl.value) {
            value = inputEl.value;
        }
    }
    let cleanValue = value.replace(/Rp/gi, '').trim();
    copyText(cleanValue, btn);
};

window.renderCopyBtn = function(text) {
    if (!text) return '';
    return `<button class="btn-copy" onclick="copyText('${text}', this)" title="Salin Nominal">${window.svgCopy}</button>`;
};

window.setResult = function(displayId, copyId, text, prefix = 'Rp ') {
    if (displayId) {
        const el = document.getElementById(displayId);
        if (el) el.innerText = prefix + text;
    }
    const btn = document.getElementById(copyId);
    if (btn) {
        btn.onclick = function() { copyText(text, this); };
    }
};
