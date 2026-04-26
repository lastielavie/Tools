function fmt(n, c) {
    let options = {};
    if (c) {
        options = { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 };
    }
    return new Intl.NumberFormat('id-ID', options).format(n);
}

function parseInput(txt) {
    let items = [];
    let tot = 0;
    let matchDiv = txt.match(/(\d+)\s*cabang/i);
    let div = parseInt((matchDiv || [])[1]) || 1;
    let lines = txt.split('\n');
    lines.forEach(l => {
        let m = l.trim().match(/^(.*?)\s+(?:Rp\.?\s*)?([\d.,]+)$/i);
        if (m && !m[1].toLowerCase().includes('per cabang') && !l.toLowerCase().startsWith('total')) {
            let v = parseFloat(m[2].replace(/[.,]/g, ''));
            if (v) {
                items.push({ n: m[1].trim(), v: v });
                tot += v;
            }
        }
    });
    return { div, items, tot };
}

function calculateProportions(items, tot, div) {
    let pDiv = Math.ceil(tot / div);
    let acc = 0;
    let results = [];
    
    items.forEach((i, x) => {
        let b = (x === items.length - 1) ? pDiv - acc : Math.round(i.v / div);
        acc += b;
        results.push({ 
            ...i, 
            b: b, 
            prop: (i.v / tot * 100).toFixed(2) 
        });
    });
    
    return { pDiv, results };
}

function calc() {
    let txt = $('inp').value;
    const { div, items, tot } = parseInput(txt);

    if (!items.length) {
        return resetView();
    }
    
    const { pDiv, results } = calculateProportions(items, tot, div);

    let tb = '';
    $('l-div').innerText = `Beban Per Cabang (${div})`;
    setResult('t-all', 'b-all', fmt(tot));
    setResult('t-div', 'b-div', fmt(pDiv));
    
    results.forEach(res => {
        tb += `
            <tr>
                <td>
                    <div class="trx-name">${res.n}</div>
                    <div class="trx-original">Asli: ${fmt(res.v)}</div>
                </td>
                <td class="text-right trx-prop">${res.prop}%</td>
                <td class="text-right">
                    <div class="flex-cell">
                        <strong class="trx-b-main">${fmt(res.b)}</strong>
                        ${renderCopyBtn(fmt(res.b))}
                    </div>
                </td>
            </tr>
        `;
    });
    $('t-body').innerHTML = tb;
    $('t-foot').innerHTML = `
        <tr>
            <td class="foot-label">TOTAL</td>
            <td class="text-right foot-prop">100%</td>
            <td class="text-right">
                <div class="flex-cell">
                    <strong class="foot-total">${fmt(pDiv)}</strong>
                </div>
            </td>
        </tr>
    `;
    $('empty').style.display = 'none';
    $('res').style.display = 'block';
}

function clearInput() {
    $('inp').value = '';
    resetView();
}

function resetView() {
    $('empty').style.display = 'flex';
    $('res').style.display = 'none';
}
