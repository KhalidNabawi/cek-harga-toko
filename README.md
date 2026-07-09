# Cek Harga Toko — Panduan Lengkap

Aplikasi sederhana untuk cek harga jual barang via scan barcode.
Backend: Google Apps Script + Google Spreadsheet.
Frontend: PWA statis (bisa di-install di Android).

## Struktur Proyek
```
cek-harga-toko/
├── gas/
│   └── Code.gs          → di-deploy ke script.google.com
└── pwa/
    ├── index.html
    ├── style.css
    ├── app.js            → GANTI API_URL di file ini
    ├── manifest.json
    ├── sw.js
    └── icons/
        ├── icon-192.png
        └── icon-512.png
```

Kenapa dipisah jadi 2 bagian (bukan satu HTML di dalam Apps Script)?
Karena Google Apps Script menjalankan halamannya di dalam iframe pada domain
`googleusercontent.com`, sehingga Service Worker (syarat wajib PWA) **tidak
bisa didaftarkan** di sana. Solusinya: Apps Script hanya bertugas sebagai
**API data** (baca/tulis Spreadsheet), sedangkan tampilan PWA di-hosting
terpisah sebagai file statis (misal di GitHub Pages, gratis dan mudah).

---

## LANGKAH 1 — Membuat Google Spreadsheet

1. Buka [sheets.google.com](https://sheets.google.com) → buat spreadsheet baru.
2. Beri nama sheet pertama menjadi **`Produk`** (klik 2x nama tab sheet di bawah).
3. Isi baris pertama sebagai header, lalu contoh data:

| Barcode       | Nama Barang    | Harga Jual |
|---------------|----------------|-----------:|
| 8991234567890 | Indomie Goreng |       3500 |
| PM001         | Permen Kopiko  |        500 |
| PM002         | Relaxa         |        500 |

4. Salin **ID Spreadsheet** dari URL-nya:
   ```
   https://docs.google.com/spreadsheets/d/ID_SPREADSHEET_ADA_DISINI/edit
   ```

---

## LANGKAH 2 — Deploy Google Apps Script

1. Di Spreadsheet tadi, klik **Ekstensi → Apps Script**.
2. Hapus kode default, lalu tempel isi file `gas/Code.gs`.
3. Ganti baris berikut dengan ID Spreadsheet Anda dari Langkah 1:
   ```javascript
   const SPREADSHEET_ID = 'MASUKKAN_ID_SPREADSHEET_DISINI';
   ```
4. Klik **Simpan** (ikon disket).
5. Klik **Deploy → New deployment (Deployment baru)**.
6. Pilih tipe **Web app**.
7. Isi pengaturan:
   - **Execute as (Jalankan sebagai):** Me (akun Anda)
   - **Who has access (Yang memiliki akses):** Anyone (Siapa saja)
     *(wajib "Anyone" agar aplikasi bisa diakses tanpa login)*
8. Klik **Deploy**, lalu **izinkan akses** (Authorize) saat diminta Google.
9. Salin **URL Web App** yang muncul, contoh:
   ```
   https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxx/exec
   ```
10. Simpan URL ini — akan dipakai di Langkah 3.

> Setiap kali Anda mengubah `Code.gs`, Anda harus **Deploy → Manage deployments
> → Edit (ikon pensil) → New version → Deploy** agar perubahan aktif.

---

## LANGKAH 3 — Menghubungkan PWA ke Apps Script

1. Buka file `pwa/app.js`.
2. Ganti baris berikut dengan URL Web App dari Langkah 2:
   ```javascript
   const API_URL = 'MASUKKAN_URL_WEB_APP_DISINI';
   ```
3. Simpan file.

Uji coba cepat: buka URL Web App Anda di browser dan tambahkan
`?action=cari&barcode=PM001` di belakangnya. Jika Spreadsheet sudah terisi
contoh data, harusnya muncul teks JSON berisi data produk tersebut.

---

## LANGKAH 4 — Hosting PWA (agar bisa diinstall di Android)

Cara termudah & gratis: **GitHub Pages**.

1. Buat akun/repo baru di [github.com](https://github.com) (misal: `cek-harga-toko`).
2. Upload semua isi folder `pwa/` (index.html, style.css, app.js, manifest.json,
   sw.js, folder icons) ke repo tersebut — **bukan folder `gas/`**.
3. Buka **Settings → Pages** di repo tersebut.
4. Pada **Source**, pilih branch `main` dan folder `/root`, klik **Save**.
5. Tunggu 1–2 menit, GitHub akan memberi URL seperti:
   ```
   https://namaAnda.github.io/cek-harga-toko/
   ```
6. Buka URL tersebut — aplikasi sudah bisa dipakai lewat browser Android.

*(Alternatif hosting statis lain: Firebase Hosting, Netlify, Vercel — caranya serupa: upload folder `pwa/` saja.)*

---

## LANGKAH 5 — Install sebagai Aplikasi (PWA) di Android

1. Buka URL PWA (hasil Langkah 4) menggunakan **Google Chrome** di HP Android.
2. Ketuk menu titik tiga (⋮) di pojok kanan atas.
3. Pilih **"Tambahkan ke layar utama" / "Add to Home screen"** atau
   **"Install app"** (jika muncul otomatis, tinggal ketuk "Install").
4. Ikon **Cek Harga Toko** akan muncul di layar utama HP seperti aplikasi biasa,
   lengkap tanpa address bar browser saat dibuka.

---

## Cara Kerja Aplikasi

1. Saat dibuka → kamera langsung aktif, muncul kotak panduan scan.
2. Barcode terbaca → app memanggil Apps Script (`?action=cari&barcode=...`).
   - **Ditemukan** → tampil Nama Barang + Harga (font besar) + tombol "Scan Lagi".
   - **Tidak ditemukan** → tampil pesan "Produk belum terdaftar." + tombol
     "Tambah Produk" (barcode otomatis terisi di form).
3. Form Tambah Produk disimpan → data dikirim via `POST` ke Apps Script dan
   langsung masuk ke Spreadsheet, lalu kamera aktif lagi.
4. Barang tanpa barcode (permen dsb.) → tombol **"Tambah Produk Manual"** di
   layar scanner, isi kode manual bebas (contoh: `PM001`).

## Catatan Teknis Singkat

- Library scanner: [`html5-qrcode`](https://github.com/mebjas/html5-qrcode) — ringan, cepat, mendukung EAN-13/EAN-8/CODE128/CODE39/UPC/QR.
- Tidak ada sistem login — sesuai permintaan.
- Tidak ada database lain selain Google Spreadsheet.
- Duplikasi barcode dicegah otomatis oleh backend (`Code.gs`).
- Komunikasi PWA ↔ Apps Script memakai `fetch()` biasa (POST dikirim sebagai
  `text/plain` agar tidak terkena CORS preflight yang tak didukung Apps Script).
