const fmtIndo = (num) => {
    return num.replace(/,/g, 'T').replace(/\./g, ',').replace(/T/g, '.');
};

const parseNum = (num) => {
    return parseFloat(num.replace(/,/g, ''));
};

const parseManual = (val) => {
    if (val) {
        return parseFloat(val.replace(/Rp/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.'));
    }
    return NaN;
};

const AuditStore = {
    transactions: [],
    excCyan: new Set(),
    excYel: new Set(),
    incPink: new Set(),
    
    toggleYel(id) {
        this.excYel.has(id) ? this.excYel.delete(id) : this.excYel.add(id);
    },
    
    togglePink(id) {
        this.incPink.has(id) ? this.incPink.delete(id) : this.incPink.add(id);
    },
    
    cycleOps(id) {
        if (!this.excCyan.has(id) && !this.incPink.has(id)) {
            this.excCyan.add(id);
        } else if (this.excCyan.has(id) && !this.incPink.has(id)) {
            this.incPink.add(id);
        } else {
            this.excCyan.delete(id);
            this.incPink.delete(id);
        }
    },
    
    clear() {
        this.excCyan.clear();
        this.excYel.clear();
        this.incPink.clear();
        this.transactions = [];
    }
};

$('btnClear').onclick = () => {
    $('rawInput').value = '';
    $('edcActualInput').value = '';
    $('qrisActualInput').value = '';
    $('rawInput').style.height = '';
    AuditStore.clear();
    proc();
};

$('rawInput').oninput = () => {
    $('edcActualInput').value = '';
    $('qrisActualInput').value = '';
    proc();
};

$('edcActualInput').oninput = proc;
$('qrisActualInput').oninput = proc;

$('hideInvalidCb').addEventListener('change', (e) => {
    const container = $('tableContainer');
    if (e.target.checked) {
        container.classList.add('hide-invalid');
    } else {
        container.classList.remove('hide-invalid');
    }
});

$('tableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('.action-x');
    if (!btn) return;
    
    const id = parseInt(btn.dataset.id, 10);
    const action = btn.dataset.action;

    if (action === 'toggleYel') AuditStore.toggleYel(id);
    if (action === 'togglePink') AuditStore.togglePink(id);
    if (action === 'cycleOps') AuditStore.cycleOps(id);

    proc();
});

function parseAuditText(text) {
    let txs = [];
    let m;
    TRANSACTION_REGEX.lastIndex = 0;
    while ((m = TRANSACTION_REGEX.exec(text))) {
        txs.push({
            dt: m[1],
            ft: m[2],
            desc: m[3].replace(/\s+/g, ' ').trim(),
            cur: m[4],
            typ: m[6].toUpperCase(),
            bal: m[7],
            nAmt: parseNum(m[5]),
            iAmt: fmtIndo(m[5])
        });
    }
    return txs;
}

function processAuditLogic(rawTxs, states) {
    let processed = rawTxs.map((t, i) => ({
        ...t,
        id: i,
        balI: fmtIndo(t.bal),
        qris: false, edc: false, ops: false, exC: false, exY: false
    }));

    let uDt = [...new Set(processed.map(t => t.dt.split(/\s+/)[0]))].sort();
    let rQris = 0, rEdc = 0, tOps = 0, tSetoran = 0;

    if (uDt.length) {
        let d1 = uDt[0], d2 = uDt[1] || null;
        let d1Arr = d1.split('-'), d1Str = d1Arr[2] + d1Arr[1] + d1Arr[0].substring(2);

        processed.forEach(t => {
            let p = t.dt.split(/\s+/);
            let txD = p[0], txT = p[1];
            let dU = t.desc.toUpperCase(), dN = t.desc.replace(/\s+/g, '');
            let d1Log = (txD === d1 && txT < '22:00:00') || (txD === d2 && txT >= '22:00:00');

            if (/^\d+$/.test(dN) && txD === d2) {
                t.edc = true;
                if (t.typ === 'CR') rEdc += t.nAmt;
            }

            if (t.typ === 'CR') {
                if ((d1Log && dU.includes('QRIS')) || new RegExp(`QR[A-Z]? ${d1Str}`).test(dU) || /\bQR[A-Z]?\s+(?!\d{6}\b)/.test(dU)) {
                    t.qris = true;
                    t.exY = states.excYel.has(t.id);
                    if (!t.exY) rQris += t.nAmt;
                } else if (!t.qris && !t.edc && !/^\d+$/.test(dN) && !dU.includes('QR') && d1Log) {
                    t.ops = true;
                    t.exC = states.excCyan.has(t.id);
                    if (!t.exC && !states.incPink.has(t.id)) tOps += t.nAmt;
                }
            }
            if (states.incPink.has(t.id)) tSetoran += t.nAmt;
        });
    }

    let qAct = rQris / 0.993, qErr = rQris > 0 && Math.abs(qAct - Math.round(qAct)) > 0.01;
    let eAct = rEdc / 0.99, eErr = rEdc > 0 && Math.abs(eAct - Math.round(eAct)) > 0.01;

    let aQris = qErr ? { t: states.qInp, a: isNaN(states.qInp) ? NaN : states.qInp - rQris } : { t: qAct, a: qAct - rQris };
    let aEdc = eErr ? { t: states.eInp, a: isNaN(states.eInp) ? NaN : states.eInp - rEdc } : { t: eAct, a: eAct - rEdc };

    let fQ = false, fE = false;
    processed.forEach(t => {
        if (t.qris && !t.exY && !fQ) {
            let errClass = (qErr && isNaN(aQris.t)) ? ' class="text-error"' : '';
            let valText = isNaN(aQris.t) ? '(Belum)' : formatCurrency(aQris.a);
            t.desc += `<br><b${errClass}>ADMIN QRIS ${valText}</b>`;
            fQ = true;
        }
        if (t.edc && !fE) {
            let errClass = (eErr && isNaN(aEdc.t)) ? ' class="text-error"' : '';
            let valText = isNaN(aEdc.t) ? '(Belum)' : formatCurrency(aEdc.a);
            t.desc += `<br><b${errClass}>ADMIN EDC ${valText}</b>`;
            fE = true;
        }
        if (t.ops && !t.exC && !states.incPink.has(t.id)) t.desc += `<br><b>BSI OPS</b>`;
        if (states.incPink.has(t.id)) t.desc += `<br><b>SETORAN TUNAI</b>`;
    });

    return { processed, summary: { rQris, rEdc, tOps, tSetoran, qAct, qErr, eAct, eErr, aQris, aEdc } };
}

const updateTitle = (selector, baseText, pctText) => {
    const el = document.querySelector(selector);
    if (el) {
        const svg = el.querySelector('svg');
        if (svg) {
            el.innerHTML = '';
            el.appendChild(svg);
            el.appendChild(document.createTextNode(` ${baseText} (${pctText})`));
        } else {
            el.innerText = `${baseText} (${pctText})`;
        }
    }
};

function toggleManualInput(id, isErr) {
    $(`${id}Display`).style.display = isErr ? 'none' : 'block';
    $(`${id}Input`).style.display = isErr ? 'block' : 'none';
}

function proc() {
    const text = $('rawInput').value;
    AuditStore.transactions = [];

    if (!text.trim()) return actState('empty', 'Tabel mutasi akan muncul di sini');

    let rawTxs = parseAuditText(text);
    if (!rawTxs.length) return actState('empty', 'Ups! Format teks tidak dikenali.');

    actState('data');

    const states = {
        excYel: AuditStore.excYel, 
        excCyan: AuditStore.excCyan, 
        incPink: AuditStore.incPink,
        qInp: parseManual($('qrisActualInput').value),
        eInp: parseManual($('edcActualInput').value)
    };

    const result = processAuditLogic(rawTxs, states);
    AuditStore.transactions = result.processed; 
    const sum = result.summary;

    $('qrisErrorBox').style.display = sum.qErr ? 'flex' : 'none';
    $('edcErrorBox').style.display = sum.eErr ? 'flex' : 'none';

    toggleManualInput('qrisActual', sum.qErr);
    toggleManualInput('edcActual', sum.eErr);

    let qPctText = (sum.qErr && !isNaN(sum.aQris.t) && sum.aQris.t > 0) 
        ? parseFloat(((sum.aQris.a / sum.aQris.t) * 100).toFixed(2)).toString().replace('.', ',') + '%' 
        : '0,7%';
        
    let ePctText = (sum.eErr && !isNaN(sum.aEdc.t) && sum.aEdc.t > 0) 
        ? parseFloat(((sum.aEdc.a / sum.aEdc.t) * 100).toFixed(2)).toString().replace('.', ',') + '%' 
        : '1%';

    updateTitle('.box-2 .summary-title', 'Admin Qris', qPctText);
    updateTitle('.box-6 .summary-title', 'Admin EDC', ePctText);

    $('rawQrisDisplay').innerText = 'Rp ' + formatCurrency(sum.rQris);
    $('adminQrisDisplay').innerText = 'Rp ' + formatCurrency(sum.aQris.a || 0);
    if (!sum.qErr) $('qrisActualDisplay').innerText = 'Rp ' + formatCurrency(sum.qAct);
    
    $('rawEdcDisplay').innerText = 'Rp ' + formatCurrency(sum.rEdc);
    $('adminEdcDisplay').innerText = 'Rp ' + formatCurrency(sum.aEdc.a || 0);
    if (!sum.eErr) $('edcActualDisplay').innerText = 'Rp ' + formatCurrency(sum.eAct);
    
    $('otherCrDisplay').innerText = 'Rp ' + formatCurrency(sum.tOps);
    $('setoranTunaiDisplay').innerText = 'Rp ' + formatCurrency(sum.tSetoran);

    renderTbl();
}

function actState(s, msg = '') {
    $('emptyState').style.display = (s === 'empty') ? 'flex' : 'none';
    if (s === 'empty') {
        const span = $('emptyState').querySelector('span');
        if (span) span.innerText = msg;
    }
    $('dataState').style.display = (s === 'data') ? 'block' : 'none';
    let btnDownload = $('btnDownloadWord');
    if (btnDownload) {
        btnDownload.style.display = (s === 'data') ? 'flex' : 'none';
    }
    let toggleLabel = $('toggleHiddenLabel');
    if (toggleLabel) {
        toggleLabel.style.display = (s === 'data') ? 'flex' : 'none';
    }
}

const ACTION_ICONS = {
    ops: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0891b2" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    qris: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#854d0e" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    setoran: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#db2777" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    remove: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
};

function getRowClasses(t) {
    let clsArr = [];
    if (AuditStore.incPink.has(t.id)) clsArr.push('highlight-setoran');
    else if (t.qris && !t.exY) clsArr.push('highlight-qris');
    else if (t.edc) clsArr.push('highlight-edc');
    else if (t.ops && !t.exC) clsArr.push('highlight-ops');
    
    let isInvalidQR = t.typ === 'CR' && t.desc.toUpperCase().includes('QR') && !t.qris;
    if (t.typ === 'DB' || isInvalidQR) clsArr.push('row-hidden');
    
    return clsArr.join(' ');
}

function getActionBtn(t, d1) {
    let txDate = t.dt.split(/\s+/)[0];
    let isFullAngka = /^\d+$/.test(t.desc.replace(/\s+/g, ''));
    let isDay1FullAngka = (txDate === d1 && isFullAngka);

    if (t.qris) {
        let icon = t.exY ? ACTION_ICONS.remove : ACTION_ICONS.qris;
        return `<button class="action-x" title="Hapus/Kembalikan Stabilo Kuning" data-action="toggleYel" data-id="${t.id}">${icon}</button>`;
    } else if (t.ops) {
        let icon = (!t.exC && !AuditStore.incPink.has(t.id)) ? ACTION_ICONS.ops : (t.exC && !AuditStore.incPink.has(t.id)) ? ACTION_ICONS.remove : ACTION_ICONS.setoran;
        return `<button class="action-x" title="Ubah: BSI OPS -> Silang -> Setoran Tunai" data-action="cycleOps" data-id="${t.id}">${icon}</button>`;
    } else if (!t.edc && t.typ === 'CR' && !t.desc.toUpperCase().includes('QR') && !isDay1FullAngka) {
        let icon = AuditStore.incPink.has(t.id) ? ACTION_ICONS.remove : ACTION_ICONS.setoran;
        return `<button class="action-x" title="Tambah Setoran Tunai" data-action="togglePink" data-id="${t.id}">${icon}</button>`;
    }
    return '';
}

function renderTableRowHTML(t, d1) {
    return `
        <tr class="${getRowClasses(t)}">
            <td class="col-center">${getActionBtn(t, d1)}</td>
            <td class="date">${t.dt}</td>
            <td><code>${t.ft}</code></td>
            <td>${t.desc}</td>
            <td>${t.cur}</td>
            <td class="amount">${t.iAmt}</td>
            <td class="col-center text-db">${t.typ === 'DB' ? 'DB' : ''}</td>
            <td class="col-center text-cr">${t.typ === 'CR' ? 'CR' : ''}</td>
            <td class="amount">${t.balI}</td>
        </tr>
    `;
}

function renderTbl() {
    let uDt = [...new Set(AuditStore.transactions.map(t => t.dt.split(/\s+/)[0]))].sort();
    let d1 = uDt.length > 0 ? uDt[0] : null;

    $('tableBody').innerHTML = AuditStore.transactions.map(t => renderTableRowHTML(t, d1)).join('');
}

window.downloadTableToWord = () => {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType, VerticalAlign, TableLayoutType } = docx;

    let w = [16, 18, 31, 5, 10, 4, 4, 12];
    let thTitles = ['Date', 'FT Number', 'Description', 'Currency', 'Amount', 'DB', 'CR', 'Balance'];
    
    let headerCells = thTitles.map((h, i) => {
        return new TableCell({
            width: { size: w[i], type: WidthType.PERCENTAGE },
            shading: { fill: "00A09D", type: ShadingType.CLEAR, color: "auto" },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 0, bottom: 0, left: 30, right: 30 },
            children: [
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 0, before: 0 },
                    children: [new TextRun({ text: h, color: "000000", size: 13, font: "Arial" })]
                })
            ]
        });
    });
    
    let rows = [new TableRow({ children: headerCells, tableHeader: true })];
    
    AuditStore.transactions.forEach(t => {
        let bg = undefined;
        if (AuditStore.incPink.has(t.id)) bg = "FFB6C1";
        else if (t.qris && !t.exY) bg = "FFFF00";
        else if (t.edc) bg = "00FF00";
        else if (t.ops && !t.exC) bg = "00FFFF";
        
        let typDbText = t.typ === 'DB' ? 'DB' : '';
        let typCrText = t.typ === 'CR' ? 'CR' : '';

        let createCell = (text, align = AlignmentType.LEFT, isDesc = false) => {
            let paragraphs = [];
            if (isDesc) {
                let parts = text.split(/<br\s*\/?>/i);
                parts.forEach(p => {
                    let isBold = p.includes('<b>') || p.includes('class="text-error"');
                    let isErr = p.includes('class="text-error"');
                    let cleanText = p.replace(/<[^>]+>/g, '').trim();
                    
                    let trProps = { text: cleanText, size: 13, font: "Arial", bold: isBold, color: isErr ? "B91C1C" : "000000" };
                    if (bg) trProps.shading = { type: ShadingType.CLEAR, fill: bg };

                    paragraphs.push(new Paragraph({
                        alignment: align,
                        spacing: { after: 0, before: 0 },
                        children: [new TextRun(trProps)]
                    }));
                });
            } else {
                let trProps = { text: text, size: 13, font: "Arial", color: "000000" };
                if (bg) trProps.shading = { type: ShadingType.CLEAR, fill: bg };

                paragraphs.push(new Paragraph({
                    alignment: align,
                    spacing: { after: 0, before: 0 },
                    children: [new TextRun(trProps)]
                }));
            }

            return new TableCell({
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 0, bottom: 0, left: 30, right: 30 },
                children: paragraphs
            });
        };

        rows.push(new TableRow({
            children: [
                createCell(t.dt),
                createCell(t.ft),
                createCell(t.desc, AlignmentType.LEFT, true),
                createCell(t.cur),
                createCell(t.iAmt, AlignmentType.RIGHT),
                createCell(typDbText, AlignmentType.CENTER),
                createCell(typCrText, AlignmentType.CENTER),
                createCell(t.balI, AlignmentType.RIGHT)
            ]
        }));
    });

    const tableBorders = {
        top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" }
    };

    const doc = new Document({
        sections: [{
            properties: {
                page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
            },
            children: [
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    layout: TableLayoutType.FIXED,
                    borders: tableBorders,
                    rows: rows
                })
            ]
        }]
    });

    let br = "CABANG";
    let m = AuditStore.transactions.find(t => /QR/i.test(t.desc) && /MFLASH\s+([A-Z0-9]+)/i.test(t.desc)); 
    
    if (m) {
        br = m.desc.match(/MFLASH\s+([A-Z0-9]+)/i)[1].toUpperCase();
    }
    
    let dates = [...new Set(AuditStore.transactions.map(t => t.dt.split(' ')[0]))].sort();
    let d1 = dates[0].split('-');
    let d2 = dates[dates.length - 1].split('-');
    let tglStr = (d1[2] === d2[2]) ? d1[2] : `${d1[2]}-${d2[2]}`;
    let bulanArr = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    let blnName = bulanArr[parseInt(d1[1]) - 1];
    let fileName = `MUTASI BSI ${br} ${tglStr} ${blnName} ${d1[0]}.docx`; 
    
    Packer.toBlob(doc).then(blob => {
        let a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a);
    });
};

initExcelUpload('excelUpload', 'rawInput', proc);
