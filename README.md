# SuperTools - BSI Mutation & Audit Tools

Kumpulan alat (*tools*) berbasis web untuk mempermudah proses audit, rekonsiliasi, dan perhitungan data mutasi Bank Syariah Indonesia (BSI). Aplikasi ini berjalan sepenuhnya di sisi browser (klien) sehingga sangat cepat dan aman tanpa memerlukan *backend* atau *database*.

## Daftar Tools

### 1. Calculator Proporsional (`/Calculator`)
Alat untuk membagi beban transaksi secara adil dan proporsional antar cabang. 
Pengguna cukup menempelkan (*paste*) teks template rincian transaksi, dan sistem akan otomatis menghitung serta membagi beban biaya sesuai dengan jumlah cabang yang dideteksi.

### 2. Audit Mutasi (`/Audit`)
Aplikasi cerdas untuk memproses dan mengaudit baris teks mutasi mentah BSI menjadi tabel terstruktur secara otomatis.
- **Auto-Highlight**: Mendeteksi dan mewarnai transaksi **QRIS** (Kuning), **EDC** (Hijau), **BSI OPS** (Biru), dan **Setoran Tunai** (Merah Muda).
- **Pendeteksi Anomali**: Mengecek keakuratan potongan biaya admin secara otomatis (0,7% untuk QRIS dan 1% untuk EDC).
- **Excel Support**: Mendukung unggah langsung dari file Excel (.xlsx).
- **Export to Word**: Dapat mengekspor hasil tabel mutasi yang sudah diaudit dan diwarnai ke dalam dokumen **Word (.docx)**.

### 3. Reconcile (`/Reconcile`)
Alat bantu untuk merekonsiliasi dan merangkum mutasi harian secara cepat.
- Menjumlahkan total kotor, bersih, dan biaya admin untuk seluruh transaksi QRIS dan EDC.
- Menangkap secara otomatis Nominal Saldo Akhir (*Last Balance*).
- Dilengkapi dengan fitur *filter* (DB/CR), pengurutan, serta fitur penyembunyian (*hide*) untuk transaksi minor agar proses pencocokan nota/struk menjadi lebih fokus.

## Fitur Global (Shared)
- **Dark/Light Mode Theme**: Kenyamanan visual yang disimpan secara otomatis di memori browser.
- **One-Click Copy**: Menyalin nominal hasil perhitungan hanya dengan mengklik tombol *copy*.
- **Modular & DRY**: Arsitektur Vanilla JavaScript dan CSS yang rapi, ringan, dan mudah dikembangkan.

## Cara Penggunaan
1. Unduh atau *clone* *repository* ini.
2. Buka file `index.html` (di folder utama) menggunakan browser modern (Google Chrome, Firefox, Safari, atau Edge).
3. Mulai gunakan tools sesuai kebutuhan Anda!

---

*Dibuat menggunakan HTML5, CSS3, dan Vanilla JavaScript murni.*