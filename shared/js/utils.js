const $ = (id) => document.getElementById(id);

const TRANSACTION_REGEX = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})[\s\n]+(\S+)[\s\n]+([\s\S]+?)(IDR)[\s\n]+([\d,.]+)[\s\n]+(DB|CR)[\s\n]+([\d,.]+)/g;
function formatCurrency(num) {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}
