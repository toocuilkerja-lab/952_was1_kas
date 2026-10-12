# 952_was1_kas - Aplikasi Uang Kas Seksi

Aplikasi pengelolaan uang kas seksi dengan fitur debet, kredit, lampiran foto, dan rekapitulasi iuran pegawai.

## Panduan Deploy ke Vercel

Aplikasi ini telah dikonfigurasi agar kompatibel dengan Vercel. Namun, ada beberapa hal penting yang perlu diperhatikan:

### 1. Database (PENTING)
Aplikasi ini saat ini menggunakan **SQLite** (`kas.db`). Di lingkungan **Vercel (Serverless)**, file database ini bersifat **sementara (ephemeral)**. Artinya:
- Data akan hilang setiap kali fungsi serverless dimulai ulang atau dideploy ulang.
- Data tidak akan tersinkronisasi antar pengguna jika Vercel menjalankan beberapa instance.

**Saran untuk Produksi:**
Untuk penggunaan nyata di Vercel, disarankan mengganti `better-sqlite3` dengan database cloud seperti:
- **Supabase** (PostgreSQL)
- **Neon** (PostgreSQL)
- **MongoDB Atlas**

### 2. Langkah Deploy
1. Push kode ini ke repository **GitHub** Anda.
2. Masuk ke [Vercel Dashboard](https://vercel.com).
3. Klik **"Add New"** > **"Project"**.
4. Impor repository dari GitHub.
5. Vercel akan mendeteksi konfigurasi dari `vercel.json`.
6. Klik **"Deploy"**.

## Pengembangan Lokal
1. Install dependensi: `npm install`
2. Jalankan server dev: `npm run dev`
3. Buka `http://localhost:3000`

## Teknologi
- **Frontend**: React, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Express.js, Better-SQLite3.
- **Build Tool**: Vite.
