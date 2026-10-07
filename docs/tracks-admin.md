# Jalur pembelajaran dari admin

Kartu jalur di beranda **tidak lagi hardcode**. Daftar jalur hidup di tabel `learning_tracks` dan dikelola super admin di `/admin/tracks`.

## Model

| Kolom | Arti |
|-------|------|
| `slug` | Kode stabil (`NETWORK`, `DATACENTER`, …). Dipakai di URL `?track=` dan kolom `courses.track`. |
| `nameId` / `nameEn` | Judul kartu |
| `blurbId` / `blurbEn` | Deskripsi singkat di kartu |
| `iconKey` | Kunci ikon whitelist (dipetakan ke Lucide di frontend) |
| `sortOrder` | Urutan tampil |
| `active` | Nonaktif = hilang dari beranda/filter; kursus lama tetap menyimpan slug |

`courses.track` adalah **string slug**, bukan enum Prisma.

## API

- `GET /api/tracks` — publik, hanya jalur `active` (beranda, katalog, form instruktur).
- `GET /api/admin/tracks` — semua jalur (admin).
- `POST /api/admin/tracks` — tambah.
- `PATCH /api/admin/tracks/:id` — ubah teks, ikon, urutan, aktif. Slug tidak diubah setelah dibuat.
- `DELETE /api/admin/tracks/:id` — hanya jika tidak ada kursus yang memakai slug itu.

Saat tabel kosong, layanan mengisi lima jalur bawaan (sama seperti katalog awal).

## Alur admin

1. Masuk sebagai admin → **Tracks**.
2. Tambah / edit / nonaktifkan jalur.
3. Instruktur memilih jalur aktif saat membuat kursus.
4. Publish kursus → muncul di filter jalur itu di beranda.

## Ikon

Admin memilih dari daftar kunci tetap (`waypoints`, `shield`, `chart`, `sparkles`, `server`, …). Unggah SVG kustom belum didukung di MVP ini.
