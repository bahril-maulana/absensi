# Setup Supabase

## 1. Buat database

1. Buka project Supabase.
2. Masuk ke **SQL Editor**.
3. Jalankan seluruh isi [schema.sql](schema.sql).
4. Isi data karyawan pada tabel `employees` melalui **Table Editor**.

## 2. Login dashboard HR

Dashboard menggunakan login lokal berikut, bukan Supabase Auth:

- Username: `admin bahril`
- Password: `admin 123`

Bagikan alamat `dashboard.html` hanya kepada HR.

Kolom wajib karyawan: `id`, `nama`, dan `pin`. Kolom `jabatan` dan `foto` boleh memakai nilai default/kosong.

## 3. Hubungkan frontend

Buka `script.js`, lalu isi dua konstanta di bagian paling atas dari **Project Settings > API**:

```js
const SUPABASE_URL = "https://project-id.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...";
```

Gunakan **anon public key**, jangan gunakan `service_role` key di frontend.

## 4. Jalankan aplikasi

Buka `index.html` melalui server lokal atau hosting statis, lalu lakukan hard refresh dengan `Ctrl + F5`.

Alur aplikasi:

- Beranda membaca karyawan aktif dari `employees`.
- Status hari ini membaca `attendance`.
- Absen masuk membuat satu record per karyawan per tanggal.
- Absen pulang memperbarui record yang sama.
- Dashboard mengambil rekap berdasarkan bulan yang dipilih.
- Dashboard HR berada di `dashboard.html`, terpisah dari panel absensi.

## Catatan keamanan

PIN masih diverifikasi di browser agar panel absensi dapat digunakan tanpa login karyawan. Publishable key aman diletakkan di frontend, tetapi jangan pernah memasukkan `service_role` key. Untuk keamanan tingkat produksi, tambahkan RPC server-side yang memverifikasi PIN sebelum membuka akses insert/update absensi.
