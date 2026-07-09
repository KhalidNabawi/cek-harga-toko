/**
 * =====================================================================
 *  CEK HARGA TOKO — app.js
 *  Berisi: logika scanner, navigasi antar layar, dan komunikasi
 *  dengan backend Google Apps Script (via fetch).
 * =====================================================================
 */

// -----------------------------------------------------------------------
// 1. KONFIGURASI — GANTI dengan URL Web App Apps Script Anda
// -----------------------------------------------------------------------
const API_URL = 'https://script.google.com/macros/s/AKfycbyIL36592Fyno1rag-XDGgpKe2YArDFPW6Hu2XEwrtuhlLd2-XgF1BonzlDVYpMT8T3ow/exec';
// Contoh: 'https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxx/exec'


// -----------------------------------------------------------------------
// 2. REFERENSI ELEMEN
// -----------------------------------------------------------------------
const viewScanner   = document.getElementById('view-scanner');
const viewHasil      = document.getElementById('view-hasil');
const viewTidakAda   = document.getElementById('view-tidak-ada');
const viewForm       = document.getElementById('view-form');

const hasilNama   = document.getElementById('hasil-nama');
const hasilHarga  = document.getElementById('hasil-harga');
const tidakAdaBarcode = document.getElementById('tidak-ada-barcode');

const inputBarcode = document.getElementById('input-barcode');
const inputNama    = document.getElementById('input-nama');
const inputHarga   = document.getElementById('input-harga');

const loadingEl = document.getElementById('loading');
const toastEl   = document.getElementById('toast');

let barcodeTerakhirTidakDitemukan = '';
let html5QrCode = null;
let sedangMemproses = false; // mencegah scan barcode yang sama diproses berkali-kali


// -----------------------------------------------------------------------
// 3. NAVIGASI ANTAR LAYAR
// -----------------------------------------------------------------------
function tampilkanView(view) {
  [viewScanner, viewHasil, viewTidakAda, viewForm].forEach(v => v.classList.remove('active'));
  view.classList.add('active');
}

function tampilkanLoading(tampil) {
  loadingEl.classList.toggle('hidden', !tampil);
}

function tampilkanToast(pesan, error = false) {
  toastEl.textContent = pesan;
  toastEl.classList.toggle('error', error);
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 2500);
}


// -----------------------------------------------------------------------
// 4. SCANNER BARCODE (html5-qrcode)
// -----------------------------------------------------------------------
function mulaiScanner() {
  sedangMemproses = false;

  html5QrCode = new Html5Qrcode('reader');

  const config = {
    fps: 10,
    qrbox: { width: 260, height: 160 }, // kotak panduan di tengah layar
    // Fokus ke format barcode umum di toko + QR (lebih cepat dari mode "semua format")
    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.QR_CODE
    ]
  };

  html5QrCode.start(
    { facingMode: 'environment' }, // kamera belakang
    config,
    onScanSukses,
    () => { /* diabaikan: dipanggil terus saat belum ada barcode terbaca */ }
  ).catch(err => {
    tampilkanToast('Tidak dapat mengakses kamera: ' + err, true);
  });
}

function hentikanScanner() {
  if (html5QrCode) {
    html5QrCode.stop().catch(() => {});
  }
}

function onScanSukses(barcodeText) {
  if (sedangMemproses) return; // cegah scan berulang untuk barcode yang sama
  sedangMemproses = true;

  hentikanScanner();
  cariProdukKeServer(barcodeText);
}


// -----------------------------------------------------------------------
// 5. KOMUNIKASI DENGAN GOOGLE APPS SCRIPT
// -----------------------------------------------------------------------

/**
 * Mencari produk berdasarkan barcode ke backend.
 */
async function cariProdukKeServer(barcode) {
  tampilkanLoading(true);
  try {
    const url = `${API_URL}?action=cari&barcode=${encodeURIComponent(barcode)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.ditemukan) {
      hasilNama.textContent = data.namaBarang;
      hasilHarga.textContent = 'Rp ' + formatRupiah(data.hargaJual);
      tampilkanView(viewHasil);
    } else {
      barcodeTerakhirTidakDitemukan = barcode;
      tidakAdaBarcode.textContent = 'Barcode: ' + barcode;
      tampilkanView(viewTidakAda);
    }
  } catch (err) {
    tampilkanToast('Gagal terhubung ke server.', true);
    tampilkanView(viewScanner);
    mulaiScanner();
  } finally {
    tampilkanLoading(false);
  }
}

/**
 * Mengirim produk baru ke backend untuk disimpan di Spreadsheet.
 */
async function simpanProdukKeServer(produk) {
  tampilkanLoading(true);
  try {
    // Dikirim sebagai text/plain (default fetch untuk body string)
    // agar tidak memicu CORS preflight yang tidak didukung Apps Script.
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'tambah', ...produk })
    });
    const data = await res.json();

    if (data.sukses) {
      tampilkanToast('Produk berhasil ditambahkan.');
      kembaliKeScanner();
    } else {
      tampilkanToast(data.pesan || 'Gagal menyimpan produk.', true);
    }
  } catch (err) {
    tampilkanToast('Gagal terhubung ke server.', true);
  } finally {
    tampilkanLoading(false);
  }
}


// -----------------------------------------------------------------------
// 6. FORM TAMBAH PRODUK
// -----------------------------------------------------------------------
function bukaFormTambah(barcodeAwal = '') {
  inputBarcode.value = barcodeAwal;
  inputNama.value = '';
  inputHarga.value = '';
  tampilkanView(viewForm);
  // Fokuskan ke field yang paling relevan
  if (barcodeAwal) {
    inputNama.focus();
  } else {
    inputBarcode.focus();
  }
}

document.getElementById('form-produk').addEventListener('submit', (e) => {
  e.preventDefault();
  const produk = {
    barcode: inputBarcode.value.trim(),
    namaBarang: inputNama.value.trim(),
    hargaJual: Number(inputHarga.value)
  };
  simpanProdukKeServer(produk);
});


// -----------------------------------------------------------------------
// 7. TOMBOL-TOMBOL
// -----------------------------------------------------------------------
document.getElementById('btn-scan-lagi').addEventListener('click', kembaliKeScanner);
document.getElementById('btn-batal-tidak-ada').addEventListener('click', kembaliKeScanner);
document.getElementById('btn-batal-form').addEventListener('click', kembaliKeScanner);

document.getElementById('btn-tambah').addEventListener('click', () => {
  bukaFormTambah(barcodeTerakhirTidakDitemukan);
});

document.getElementById('btn-manual').addEventListener('click', () => {
  hentikanScanner();
  bukaFormTambah(''); // kosong, boleh diisi manual (contoh: PM001)
});

function kembaliKeScanner() {
  tampilkanView(viewScanner);
  mulaiScanner();
}

function formatRupiah(angka) {
  return Number(angka).toLocaleString('id-ID');
}


// -----------------------------------------------------------------------
// 8. INISIALISASI SAAT APLIKASI DIBUKA
// -----------------------------------------------------------------------
window.addEventListener('load', () => {
  mulaiScanner();

  // Daftarkan Service Worker agar aplikasi bisa diinstall (PWA)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
