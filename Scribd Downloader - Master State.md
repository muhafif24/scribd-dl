# Scribd Downloader - Master State

Dokumen ini adalah *Single Source of Truth* (sumber acuan utama) untuk status proyek, arsitektur teknis, log keputusan, dan langkah berikutnya untuk program **Scribd Downloader**.

---

## 1. Project Overview & Current Status

*   **Deskripsi Proyek**: Aplikasi web berbasis Node.js untuk mengunduh dokumen dari Scribd, SlideShare, dan Everand secara mudah dengan cara merender halaman via browser headless lokal (Puppeteer) dan menyatukannya ke dalam PDF utuh.
*   **Status Saat Ini**: 
    *   **Fitur Web-based GUI Selesai**: Antarmuka grafis berbasis web modern telah diimplementasikan dengan gaya **Shadcn/ui (Zinc Theme)**, lengkap dengan progress bar linier, checklist langkah, notifikasi Toast, riwayat lokal, dan auto Light/Dark mode.
    *   **100% Server & Hosting-Ready**: Server HTTP internal mandiri (`server.js`) dan modul Chromium (`PuppeteerSg.js`) telah dioptimalkan agar berjalan otomatis tanpa sandboxing di Linux VPS/cPanel/Node-Hosting, serta menggunakan port dinamis dari environment hosting.
    *   **Siap untuk Di-Zip**: Struktur folder bersih, bebas dari build step React yang berat, sehingga proyek siap langsung dikompres ke file ZIP dan diunggah ke webserver produksi Anda.

---

## 2. Technical Stack & Architecture

*   **Backend & CLI Core**: Node.js (`server.js`) menggunakan HTTP internal bawaan (Zero-Dependency) untuk menayangkan GUI statis, memancarkan progres langsung melalui **Server-Sent Events (SSE)** via `/api/download`, dan mentransfer file via `/api/download-file`.
*   **Browser Render Engine**: Puppeteer (Chromium headless) dengan optimasi auto-sandbox khusus untuk Linux server non-Windows.
*   **Frontend GUI (Shadcn/ui Style)**: HTML5 semantik, modern Tailwind CSS (dengan dark-mode media query bawaan), Lucide Icons, dan JavaScript murni di folder `public/` (ringan, cepat, responsif, tanpa overhead build step).
*   **Manajemen Riwayat**: Penyimpanan daftar riwayat unduhan lokal di browser menggunakan `localStorage`.

---

## 3. Major Decision Log

*   **Keputusan #1 (18 Mei 2026)**: Menghubungkan repositori Git lokal langsung ke fork pribadi di GitHub (`https://github.com/muhafif24/scribd-dl`).
*   **Keputusan #2 (18 Mei 2026)**: Menambahkan fitur Web GUI menggunakan SSE (Server-Sent Events) untuk streaming status unduhan real-time karena sangat efisien dan tidak membutuhkan dependensi WebSocket yang rumit.
*   **Keputusan #3 (18 Mei 2026)**: Mengadopsi replika visual desain **Shadcn/ui (Zinc Theme)** yang solid dan flat (tanpa Glassmorphism) dengan dukungan penuh auto light/dark mode berbasis OS.
*   **Keputusan #4 (18 Mei 2026)**: Menghindari pembuatan React build step (Vite/Webpack) untuk frontend agar ukuran zip tetap super kecil (hanya beberapa KB diluar node_modules) dan 100% kompatibel untuk di-hosting langsung tanpa kompilasi.
*   **Keputusan #5 (18 Mei 2026)**: Mengaktifkan optimasi platform-aware Puppeteer secara otomatis (menambahkan `--no-sandbox` di non-Windows) agar server webserver Linux dapat langsung menjalankannya tanpa error permission.

---

## 4. Upcoming Tasks / Next Steps

1.  [x] Menginisialisasi repositori Git lokal dan sinkronisasi HEAD ke branch main di fork GitHub Anda.
2.  [x] Membuat Web-based GUI dengan arsitektur SSE.
3.  [x] Merombak total UI menjadi gaya Shadcn/ui (Zinc Theme) dengan solid flat design.
4.  [x] Mengimplementasikan auto Light/Dark mode berdasarkan preferensi OS.
5.  [x] Menambahkan tab "Riwayat Unduhan" dengan penyimpanan lokal di `localStorage`.
6.  [x] Mengoptimalkan Puppeteer & Server agar 100% siap di-hosting di server Linux/VPS/cPanel.
7.  [ ] **Langkah Pengguna**: Mengompresi folder proyek ini ke format `.zip`, mengunggahnya ke Node.js webserver/hosting Anda, jalankan `npm install` dan `npm run gui` (atau `node server.js`), dan aplikasi siap digunakan di server produksi Anda!
