/**
 * Service Worker sederhana untuk Cek Harga Toko.
 * Fungsinya: (1) syarat wajib agar PWA bisa di-install di Android,
 * (2) menyimpan cache "shell" aplikasi (HTML/CSS/JS) agar cepat dibuka.
 * Data harga TIDAK di-cache di sini karena harus selalu realtime
 * dari Google Spreadsheet.
 */

const CACHE_NAME = 'cek-harga-toko-v1';
const FILE_YANG_DI_CACHE = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// Saat instalasi: simpan file utama ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILE_YANG_DI_CACHE))
  );
  self.skipWaiting();
});

// Saat aktif: bersihkan cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((namaCache) =>
      Promise.all(
        namaCache
          .filter((nama) => nama !== CACHE_NAME)
          .map((nama) => caches.delete(nama))
      )
    )
  );
  self.clients.claim();
});

// Strategi: coba ambil dari jaringan dulu, jika gagal baru pakai cache.
// (Permintaan ke Apps Script/API tidak disentuh sama sekali di sini)
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Jangan cache permintaan ke Apps Script (harus selalu data terbaru)
  if (url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
