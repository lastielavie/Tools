const $ = id => document.getElementById(id);
const [QRIS_FEE_RATE, QRIS_NET_RATE, EDC_NET_RATE] = [0.007, 0.993, 0.99];

function parseToNumber(str) {
    if (!str) return 0;
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
        return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(str.replace(/,/g, ''));
}

function parseTransactions(rawText) {
    const cleanText = rawText.replace(/[\u200B-\u200D\uFEFF]/g, '');
    const results = [];
    TRANSACTION_REGEX.lastIndex = 0;
    let match;
    while ((match = TRANSACTION_REGEX.exec(cleanText)) !== null) {
        const [_, dateTime, ftNum, desc, curr, amount, type, balance] = match;
        const numAmount = parseToNumber(amount);
        results.push({
            dateTime,
            ftNum,
            cleanDesc: desc.replace(/\s+/g, ' ').trim(),
            amount,
            balance,
            numericAmount: numAmount,
            indoAmount: formatCurrency(numAmount),
            type: type.toUpperCase(),
            rawMatch: match[0]
        });
    }
    return results;
}

let parsedTransactions = [];

$('btnClear').addEventListener('click', () => {
    $('rawInput').value = '';
    processData();
});

window.hideRow = function(cb) {
    if (cb.checked) {
        const row = cb.closest('tr');
        row.style.opacity = '0';
        setTimeout(() => {
            row.style.display = 'none';
        }, 300);
    }
};

$('hideMinorCheckbox').addEventListener('change', function() {
    if (this.checked) {
        $('resultTable').classList.add('hide-minor-trx');
    } else {
        $('resultTable').classList.remove('hide-minor-trx');
        document.querySelectorAll('#tableBody tr').forEach(row => {
            row.style.display = '';
            row.style.opacity = '1';
            const cb = row.querySelector('.hide-cb');
            if (cb) cb.checked = false;
        });
    }
});

function processData() {
    const rawText = $('rawInput').value;
    parsedTransactions = [];
    if (!rawText.trim()) {
        $('tableBody').innerHTML = `<tr id="emptyStateRow"><td colspan="6" class="empty-state-cell"><div class="empty-state-content"><svg class="empty-svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>Tabel mutasi akan muncul di sini</div></td></tr>`;
        $('summaryCards').style.display = 'none';
        $('filterContainer').style.display = 'none';
        $('filterTipe').value = 'ALL';
        return;
    }
    let parsed = parseTransactions(rawText);
    if (!parsed.length) {
        $('tableBody').innerHTML = `<tr><td colspan="6" class="empty-state-cell" style="color: #ef4444;">Ups! Format teks tidak dikenali.</td></tr>`;
        $('summaryCards').style.display = 'none';
        $('filterContainer').style.display = 'none';
        return;
    }
    const uniqueDates = [...new Set(parsed.map(t => t.dateTime.split(/\s+/)[0]))].sort();
    const d1 = uniqueDates[0];
    const day1Parsed = parsed.filter(t => t.dateTime.startsWith(d1));
    if (day1Parsed.length < parsed.length) {
        $('rawInput').value = day1Parsed.map(t => t.rawMatch).join('\n\n');
    }
    parsed = day1Parsed;
    let totalQR = 0;
    let totalEDC = 0;
    let totalBiaya = 0;
    let lastBalance = "0";
    parsed.forEach(t => {
        const d = t.cleanDesc.toUpperCase();
        const isQR = /\bQR[A-Z0-9]*\b/.test(d);
        const isEDC = /^\d{17}/.test(d);
        const isMinor = isQR || d.includes('BIAYA PEMINDAHBUKUAN') || d.includes('BIAYA ADMINISTRASI');
        if (t.type === 'DB' && isMinor && !isQR) {
            totalBiaya += t.numericAmount;
        } else if (t.type === 'CR') {
            if (isQR) {
                totalQR += t.numericAmount;
            } else if (isEDC) {
                totalEDC += t.numericAmount;
            }
        }
        lastBalance = t.balance;
        parsedTransactions.push({
            dateTime: t.dateTime,
            ftNum: t.ftNum,
            cleanDesc: t.cleanDesc,
            indoAmount: t.indoAmount,
            type: t.type,
            isMinor
        });
    });
    const grossQR = totalQR / QRIS_NET_RATE;
    const totalAdminQR = grossQR * QRIS_FEE_RATE;
    const isExactQR = totalQR === 0 || Math.abs(grossQR - Math.round(grossQR)) < 0.01;
    const grossEDC = totalEDC / EDC_NET_RATE;
    const totalAdminEDC = grossEDC - totalEDC;
    const isExactEDC = totalEDC === 0 || Math.abs(grossEDC - Math.round(grossEDC)) < 0.01;
    $('summaryCards').style.display = 'grid';
    $('filterContainer').style.display = 'flex';
    const finalBalanceNum = parseToNumber(lastBalance);
    setResult('finalBalanceDisplay', 'copyFinalBalance', formatCurrency(finalBalanceNum));
    setResult('totalBiayaAdminDisplay', 'copyTotalBiayaAdmin', formatCurrency(totalBiaya));
    setResult('totalQrDisplay', 'copyTotalQr', formatCurrency(totalQR));
    setResult('totalEdcDisplay', 'copyTotalEdc', formatCurrency(totalEDC));
    if (!isExactQR) {
        $('totalAdminQrDisplay').innerHTML = `<span style="color:#ef4444;font-size:13px;">Bukan 0,7%</span>`;
        $('copyTotalAdminQr').style.display = 'none';
    } else {
        $('copyTotalAdminQr').style.display = 'inline-flex';
        setResult('totalAdminQrDisplay', 'copyTotalAdminQr', formatCurrency(totalAdminQR));
    }
    if (!isExactEDC) {
        $('totalAdminEdcDisplay').innerHTML = `<span style="color:#ef4444;font-size:13px;">Bukan 1%</span>`;
        $('copyTotalAdminEdc').style.display = 'none';
    } else {
        $('copyTotalAdminEdc').style.display = 'inline-flex';
        setResult('totalAdminEdcDisplay', 'copyTotalAdminEdc', formatCurrency(totalAdminEDC));
    }
    renderTable();
}

function renderTable() {
    if (!parsedTransactions.length) return;
    let data = [...parsedTransactions];
    const filterVal = $('filterTipe').value;
    if (filterVal === 'CR' || filterVal === 'DB') {
        data = data.filter(t => t.type === filterVal);
    } else if (filterVal === 'SORT') {
        data.sort((a, b) => a.type.localeCompare(b.type)); 
    }
    $('tableBody').innerHTML = data.map(t => `
        <tr ${t.isMinor ? 'class="is-minor"' : ''}>
            <td class="date">${t.dateTime}</td>
            <td>
                <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#475569; font-size:11px;">
                    ${t.ftNum}
                </code>
            </td>
            <td class="desc">${t.cleanDesc}</td>
            <td class="amount">
                <div class="amount-wrapper">
                    ${t.indoAmount} 
                    ${renderCopyBtn(t.indoAmount)}
                </div>
            </td>
            <td class="hide-cb-wrapper">
                <input type="checkbox" class="hide-cb" title="Sembunyikan" onclick="hideRow(this)">
            </td>
            <td class="col-center">
                <span class="${t.type.toLowerCase()}-label">${t.type}</span>
            </td>
        </tr>
    `).join('');
}

$('rawInput').addEventListener('input', processData);
$('filterTipe').addEventListener('change', renderTable);
initExcelUpload('excelUpload', 'rawInput', processData);
