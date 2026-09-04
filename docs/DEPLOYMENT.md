# Deployment Windows + Cloudflare Tunnel

## Persiapan

- Gunakan Node.js LTS yang kompatibel dengan Next.js.
- Isi `.env` produksi dengan password hash dan JWT secret yang kuat.
- Jalankan migrasi dan build.
- Pastikan firewall lokal hanya membuka port 3007 sesuai kebutuhan.

## Windows tray dan background supervisor

Jalankan `npm run build`, kemudian `npm run tray:install`. Launcher di folder Startup pengguna akan membuka tray dalam sesi desktop saat pengguna masuk Windows. Tray menjalankan Next.js di `127.0.0.1:3007`, memantau proses setiap lima detik, dan otomatis menjalankannya kembali setelah crash.

Klik dua kali ikon tray untuk membuka domain. Menu klik kanan menyediakan status, start/stop/restart Next.js, restart service Cloudflared, dan folder log. Gunakan `npm run tray:uninstall` untuk menghapus startup otomatis.

Cloudflared sudah berjalan sebagai Windows service `Cloudflared` dengan startup Automatic. Jangan jalankan instance tunnel kedua karena tunnel ini juga melayani aplikasi lain.

## Cloudflare Tunnel

Ingress hostname `amal.rsudwelasasih.my.id`, path `/notes*`, service `http://127.0.0.1:3007` harus berada sebelum catch-all. Next.js sudah dikonfigurasi dengan `basePath: /notes`. Validasi perubahan dengan `cloudflared tunnel ingress validate`, lalu restart service Cloudflared.

## Backup terjadwal

Buat Windows Scheduled Task yang menjalankan PowerShell dengan argumen `-ExecutionPolicy Bypass -File C:\nextjs\notes\scripts\backup.ps1` setiap hari. Simpan salinan backup tambahan di media berbeda.
