const $ = (id) => document.getElementById(id);

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

let excCyan = new Set();
let excYel = new Set();
let incPink = new Set();
let parsedTx = [];

window.tgYel = (id) => {
    if (excYel.has(id)) {
        excYel.delete(id);
    } else {
        excYel.add(id);
    }
    proc();
};

window.tgPink = (id) => {
    if (incPink.has(id)) {
        incPink.delete(id);
    } else {
        incPink.add(id);
    }
    proc();
};

window.cycleOps = (id) => {
    if (!excCyan.has(id) && !incPink.has(id)) {
        excCyan.add(id);
    } else if (excCyan.has(id) && !incPink.has(id)) {
        incPink.add(id);
    } else {
        excCyan.delete(id);
        incPink.delete(id);
    }
    proc();
};

$('btnClear').onclick = () => {
    $('rawInput').value = '';
    $('edcActualInput').value = '';
    $('qrisActualInput').value = '';
    $('rawInput').style.height = '';
    excCyan.clear();
    excYel.clear();
    incPink.clear();
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

function proc() {
    const text = $('rawInput').value;
    parsedTx = [];

    if (!text.trim()) {
        return actState('empty', 'Tabel mutasi akan muncul di sini');
    }

    let m;
    TRANSACTION_REGEX.lastIndex = 0;

    while ((m = TRANSACTION_REGEX.exec(text))) {
        parsedTx.push({
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

    if (!parsedTx.length) {
        return actState('empty', 'Ups! Format teks tidak dikenali.');
    }

    actState('data');

    parsedTx = parsedTx.map((t, i) => {
        return {
            ...t,
            id: i,
            balI: fmtIndo(t.bal),
            qris: false,
            edc: false,
            ops: false,
            exC: false,
            exY: false
        };
    });

    let uDt = [...new Set(parsedTx.map(t => t.dt.split(/\s+/)[0]))].sort();
    let rQris = 0;
    let rEdc = 0;
    let tOps = 0;
    let tSetoran = 0;

    if (uDt.length) {
        let d1 = uDt[0];
        let d2 = uDt[1] || null;
        let d1Arr = d1.split('-');
        let d1Str = d1Arr[2] + d1Arr[1] + d1Arr[0].substring(2);

        parsedTx.forEach(t => {
            let p = t.dt.split(/\s+/);
            let txD = p[0];
            let txT = p[1];
            let dU = t.desc.toUpperCase();
            let dN = t.desc.replace(/\s+/g, '');
            let d1Log = (txD === d1 && txT < '22:00:00') || (txD === d2 && txT >= '22:00:00');

            if (/^\d+$/.test(dN) && txD === d2) {
                t.edc = true;
                if (t.typ === 'CR') {
                    rEdc += t.nAmt;
                }
            }

           if (t.typ === 'CR') {
                if ((d1Log && dU.includes('QRIS')) || new RegExp(`QR[A-Z]? ${d1Str}`).test(dU) || /\bQR[A-Z]?\s+(?!\d{6}\b)/.test(dU)) {
                    t.qris = true;
                    t.exY = excYel.has(t.id);
                    if (!t.exY) {
                        rQris += t.nAmt;
                    }
                } else if (!t.qris && !t.edc && !/^\d+$/.test(dN) && !dU.includes('QR') && d1Log) {
                    t.ops = true;
                    t.exC = excCyan.has(t.id);
                    if (!t.exC && !incPink.has(t.id)) {
                        tOps += t.nAmt;
                    }
                }
            }
            
            if (incPink.has(t.id)) {
                tSetoran += t.nAmt;
            }
        });
    }

    let qAct = rQris / 0.993;
    let qErr = rQris > 0 && Math.abs(qAct - Math.round(qAct)) > 0.01;
    let eAct = rEdc / 0.99;
    let eErr = rEdc > 0 && Math.abs(eAct - Math.round(eAct)) > 0.01;

    $('qrisErrorBox').style.display = qErr ? 'flex' : 'none';
    $('edcErrorBox').style.display = eErr ? 'flex' : 'none';

    let aQris = calcMan(qErr, 'qrisActual', qAct, rQris);
    let aEdc = calcMan(eErr, 'edcActual', eAct, rEdc);

    let fQ = false;
    let fE = false;

    parsedTx.forEach(t => {
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
        
        if (t.ops && !t.exC && !incPink.has(t.id)) {
            t.desc += `<br><b>BSI OPS</b>`;
        }
        
        if (incPink.has(t.id)) {
            t.desc += `<br><b>SETORAN TUNAI</b>`;
        }
    });

    let qPctText = '0,7%';
    if (qErr && !isNaN(aQris.t) && aQris.t > 0) {
        qPctText = parseFloat(((aQris.a / aQris.t) * 100).toFixed(2)).toString().replace('.', ',') + '%';
    }
    
    let ePctText = '1%';
    if (eErr && !isNaN(aEdc.t) && aEdc.t > 0) {
        ePctText = parseFloat(((aEdc.a / aEdc.t) * 100).toFixed(2)).toString().replace('.', ',') + '%';
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

    updateTitle('.box-2 .summary-title', 'Admin Qris', qPctText);
    updateTitle('.box-6 .summary-title', 'Admin EDC', ePctText);

    $('rawQrisDisplay').innerText = 'Rp ' + formatCurrency(rQris);
    $('adminQrisDisplay').innerText = 'Rp ' + formatCurrency(aQris.a || 0);
    
    if (!qErr) {
        $('qrisActualDisplay').innerText = 'Rp ' + formatCurrency(qAct);
    }
    
    $('rawEdcDisplay').innerText = 'Rp ' + formatCurrency(rEdc);
    $('adminEdcDisplay').innerText = 'Rp ' + formatCurrency(aEdc.a || 0);
    
    if (!eErr) {
        $('edcActualDisplay').innerText = 'Rp ' + formatCurrency(eAct);
    }
    
    $('otherCrDisplay').innerText = 'Rp ' + formatCurrency(tOps);
    $('setoranTunaiDisplay').innerText = 'Rp ' + formatCurrency(tSetoran);

    renderTbl();
}

function calcMan(isErr, id, actT, raw) {
    if (isErr) {
        $(`${id}Display`).style.display = 'none';
        $(`${id}Input`).style.display = 'block';
        let v = parseManual($(`${id}Input`).value);
        return { 
            t: v, 
            a: isNaN(v) ? NaN : v - raw 
        };
    } else {
        $(`${id}Display`).style.display = 'block';
        $(`${id}Input`).style.display = 'none';
        return { 
            t: actT, 
            a: actT - raw 
        };
    }
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

function renderTbl() {
    const svgC = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0891b2" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    const svgY = svgC.replace('#0891b2', '#854d0e');
    const svgP = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#db2777" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    const svgX = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

    let uDt = [...new Set(parsedTx.map(t => t.dt.split(/\s+/)[0]))].sort();
    let d1 = uDt.length > 0 ? uDt[0] : null;

    let rowsHTML = parsedTx.map(t => {
        let clsArr = [];
        let act = '';
        
        if (incPink.has(t.id)) {
            clsArr.push('highlight-setoran');
        } else if (t.qris && !t.exY) {
            clsArr.push('highlight-qris');
        } else if (t.edc) {
            clsArr.push('highlight-edc');
        } else if (t.ops && !t.exC) {
            clsArr.push('highlight-ops');
        }
        
        let isInvalidQR = t.typ === 'CR' && t.desc.toUpperCase().includes('QR') && !t.qris;
        if (t.typ === 'DB' || isInvalidQR) {
            clsArr.push('row-hidden');
        }
        
        let cls = clsArr.join(' ');

        let txDate = t.dt.split(/\s+/)[0];
        let isFullAngka = /^\d+$/.test(t.desc.replace(/\s+/g, ''));
        let isDay1FullAngka = (txDate === d1 && isFullAngka);

        if (t.qris) {
            let icon = t.exY ? svgX : svgY;
            act = `<button class="action-x" title="Hapus/Kembalikan Stabilo Kuning" onclick="tgYel(${t.id})">${icon}</button>`;
        } else if (t.ops) {
            let icon = (!t.exC && !incPink.has(t.id)) ? svgC : (t.exC && !incPink.has(t.id)) ? svgX : svgP;
            act = `<button class="action-x" title="Ubah: BSI OPS -> Silang -> Setoran Tunai" onclick="cycleOps(${t.id})">${icon}</button>`;
        } else if (!t.edc && t.typ === 'CR' && !t.desc.toUpperCase().includes('QR')) {
            if (!isDay1FullAngka) {
                let icon = incPink.has(t.id) ? svgX : svgP;
                act = `<button class="action-x" title="Tambah Setoran Tunai" onclick="tgPink(${t.id})">${icon}</button>`;
            }
        }

        let typDbText = t.typ === 'DB' ? 'DB' : '';
        let typCrText = t.typ === 'CR' ? 'CR' : '';

        return `
            <tr class="${cls}">
                <td class="col-center">${act}</td>
                <td class="date">${t.dt}</td>
                <td><code>${t.ft}</code></td>
                <td>${t.desc}</td>
                <td>${t.cur}</td>
                <td class="amount">${t.iAmt}</td>
                <td class="col-center text-db">${typDbText}</td>
                <td class="col-center text-cr">${typCrText}</td>
                <td class="amount">${t.balI}</td>
            </tr>
        `;
    }).join('');

    $('tableBody').innerHTML = rowsHTML;
}

window.downloadTableToWord = () => {
    let w = ['16%', '18%', '31%', '5%', '10%', '4%', '4%', '12%'];
    let thTitles = ['Date', 'FT Number', 'Description', 'Currency', 'Amount', 'DB', 'CR', 'Balance'];
    let pSty = `style="margin:0cm; margin-bottom:.0001pt; line-height:normal;"`;
    
    let th = thTitles.map((h, i) => {
        return `<th style="width:${w[i]}; border:0.5pt solid black; padding:2px;"><p ${pSty}>${h}</p></th>`;
    }).join('');
    
    let rowsHtml = parsedTx.map(t => {
        let bg = 'transparent';
        if (incPink.has(t.id)) bg = '#ffb6c1';
        else if (t.qris && !t.exY) bg = 'yellow';
        else if (t.edc) bg = '#00ff00';
        else if (t.ops && !t.exC) bg = '#00ffff';
        
        let hl = '';
        if (bg === 'yellow') hl = 'yellow';
        else if (bg === '#00ff00') hl = 'brightgreen';
        else if (bg === '#00ffff') hl = 'cyan';
        else if (bg === '#ffb6c1') hl = 'magenta';
        
        let wrap = (text) => {
            if (bg !== 'transparent') {
                return `<span style="background:${bg}; mso-highlight:${hl};">${text}</span>`;
            }
            return text;
        };
        
        let descStr = t.desc.split('<br>').map(d => wrap(d)).join('<br/>');
        let tdSty = `style="border:0.5pt solid windowtext; padding:0px 2px; vertical-align:middle;"`;
        let typDbText = t.typ === 'DB' ? 'DB' : '';
        let typCrText = t.typ === 'CR' ? 'CR' : '';

        return `
            <tr>
                <td ${tdSty}><p ${pSty}>${wrap(t.dt)}</p></td>
                <td ${tdSty}><p ${pSty}>${wrap(t.ft)}</p></td>
                <td ${tdSty}><p ${pSty}>${descStr}</p></td>
                <td ${tdSty}><p ${pSty}>${wrap(t.cur)}</p></td>
                <td ${tdSty} align="right"><p ${pSty}>${wrap(t.iAmt)}</p></td>
                <td ${tdSty} align="center"><p ${pSty}>${wrap(typDbText)}</p></td>
                <td ${tdSty} align="center"><p ${pSty}>${wrap(typCrText)}</p></td>
                <td ${tdSty} align="right"><p ${pSty}>${wrap(t.balI)}</p></td>
            </tr>
        `;
    }).join('');

    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                p { margin: 0cm; margin-bottom: .0001pt; padding: 0pt; }
            </style>
        </head>
        <body>
            <table cellpadding="0" cellspacing="0" style="border-collapse:collapse; width:100%; font-family:Arial; font-size:6.5pt; table-layout:fixed;">
                <thead>
                    <tr style="background:#00a09d; color:black;">${th}</tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </body>
        </html>
    `;

    let br = "CABANG";
    let m = parsedTx.find(t => /QR/i.test(t.desc) && /MFLASH\s+([A-Z0-9]+)/i.test(t.desc)); 
    
    if (m) {
        br = m.desc.match(/MFLASH\s+([A-Z0-9]+)/i)[1].toUpperCase();
    }
    
    let dates = [...new Set(parsedTx.map(t => t.dt.split(' ')[0]))].sort();
    let d1 = dates[0].split('-');
    let d2 = dates[dates.length - 1].split('-');
    let tglStr = (d1[2] === d2[2]) ? d1[2] : `${d1[2]}-${d2[2]}`;
    let bulanArr = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    let blnName = bulanArr[parseInt(d1[1]) - 1];
    let fileName = `MUTASI BSI ${br} ${tglStr} ${blnName} ${d1[0]}.docx`; 
    
    try {
        let converted = htmlDocx.asBlob(html, { 
            orientation: 'portrait', 
            margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 } 
        });
        
        let a = document.createElement('a');
        a.href = URL.createObjectURL(converted);
        a.download = fileName;
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a);
    } catch (error) {
    }
};

initExcelUpload('excelUpload', 'rawInput', proc);
