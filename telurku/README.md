# Telurku Operasional

MVP aplikasi mobile untuk alur setoran kandang, penerimaan, penimbangan, grading gabungan A-E, dan laporan owner.

## Menjalankan lokal

Jalankan server statis dari folder ini lalu buka alamat lokal di browser.

```bash
python3 -m http.server 4173
```

## Login Supabase

Aplikasi memakai Supabase Authentication. Setelah login, nama dan posisi pengguna dibaca dari tabel `profiles`.

Login menerima username atau email. Jika pengguna mengetik username tanpa `@`, aplikasi otomatis memakai email internal `username@telurku.local` untuk Supabase Auth.

Data contoh transaksi masih tersimpan di browser melalui `localStorage` sampai tahap penyimpanan operasional dialihkan penuh ke tabel Supabase.

Sistem digunakan untuk pencatatan baru. Tidak ada proses migrasi atau impor data lama.

Owner dapat melihat dan mengatur password semua pengguna. Admin hanya dapat melihat dan mengatur password Anak Kandang, Kepala Penerimaan, dan Kepala Gudang; password Owner dan Admin lain tetap dilindungi.

Untuk project Supabase yang sudah dibuat sebelum kolom email dan penugasan ditambahkan, jalankan file `supabase/migrations/2026-06-21-profile-email-assignment.sql` di SQL Editor.

## Deployment

Folder ini dapat dipublikasikan langsung ke Netlify. Sebelum digunakan secara operasional, sambungkan autentikasi dan penyimpanan ke Supabase menggunakan skema `supabase/schema.sql`.

Konfigurasi Supabase ada di `supabase-config.js`. Versi ini sudah membawa Project URL dan publishable key.

Fitur tambah/ubah pengguna memakai Netlify Function `netlify/functions/manage-user.js`. Pastikan environment variables `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` sudah diisi di Netlify.
