function initExcelUpload(inputId, textareaId, callback) {
    const excelInput = document.getElementById(inputId);
    if (!excelInput) return;
    excelInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array', raw: true });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
                const cleanedText = jsonData.map(row => {
                    const d = row['Date'] || '';
                    const f = row['FT Number'] || '';
                    const de = row['Description'] || '';
                    const c = row['Currency'] || 'IDR';
                    const a = row['Amount'] || '';
                    const cr = row['CR'] || '';
                    const b = row['Balance'] || '';
                    const type = cr ? 'CR' : 'DB';
                    return `${d} ${f} ${de} ${c} ${a} ${type} ${b}`;
                }).join('\n');
                const myTextArea = document.getElementById(textareaId);
                if (myTextArea) {
                    myTextArea.value = cleanedText;
                    callback();
                }
                setTimeout(() => { excelInput.value = ''; }, 2000);
            } catch (error) {}
        };
        reader.readAsArrayBuffer(file);
    });
}
