# Panduan peserta

Auralogic adalah tempat belajar network, cybersecurity, data science, dan AI. Satu kursus terbuka satu modul demi satu modul. Pelajaran berikutnya baru bisa dibuka setelah modul sebelumnya selesai, dan setelah pembayaran terverifikasi.

Alamat situs: `https://auralogic.web.id`.

Tombol antarmuka mengikuti bahasa yang dipilih. Label di bawah memakai bahasa Indonesia. Jika bahasa diubah ke English, arti tombolnya sama.

## Bahasa

Ada dua bahasa yang terpisah.

- **Bahasa antarmuka** dipilih dari sakelar bahasa di pojok atas. Pilihan ini mengubah menu dan tombol. Pilihan tersimpan di peramban, dan ikut akun setelah masuk.
- **Bahasa materi** melekat pada kursus. Mengganti bahasa antarmuka tidak menerjemahkan isi pelajaran. Edisi bahasa lain, kalau ada, adalah kursus terpisah. Tautannya muncul di halaman kursus.

## Buat akun

1. Buka beranda, lalu pilih **Daftar**. Formulir ada di `/learn/register`.
2. Isi nama, email yang bisa dibuka, dan kata sandi. Kata sandi minimal 8 karakter dan wajib memuat huruf serta angka.
3. Pendaftaran publik selalu membuat akun peserta.
4. Masuk di `/student/login`.

Sesi disimpan di cookie. Akun instruktur atau admin yang masuk lewat halaman peserta ditolak.

## Lupa kata sandi

1. Di halaman masuk, buka **Forgot password?**
2. Isi email yang sama. Layar selalu mengatakan tautan sedang dikirim, baik email itu terdaftar maupun tidak.
3. Buka tautan dalam 15 menit. Bentuknya `/reset-password?token=...`.
4. Buat kata sandi baru, lalu masuk lagi.

Selama pengiriman surat masih mode log, tautan hanya ada di log API. Minta tautan itu ke pengelola situs.

## Pilih dan bayar kursus

Beranda menampilkan kursus yang sudah terbit, sebelum masuk. Saring lewat jalur (Network, Cybersecurity, Data science, AI), jenjang (Fondasi, Praktisi, Lanjut), bahasa materi, atau kotak **Cari kursus**.

1. Buka sebuah kartu kursus. Baca hasil belajar dan daftar modul.
2. Pilih **Pilih kursus**. Jika belum masuk, situs meminta masuk dulu, lalu membuka halaman pembayaran.
3. Selesaikan pembayaran di Midtrans atau Xendit.
4. Akses terbuka setelah penyedia pembayaran memberi tahu Auralogic. Kembali dari halaman bank saja belum membuka kursus.
5. Kursus yang pembayarannya belum terverifikasi tetap terkunci. Lencana statusnya bukan **Active**.

Kursus perusahaan yang diberikan admin tidak punya tagihan pribadi. Kursus itu langsung aktif.

## Pratinjau gratis

Setelah masuk, buka halaman kursus di area peserta (`/learn/courses/...`).

- Bagian **Free preview** menampilkan pelajaran pertama.
- Jika pelajaran itu video dan kursus belum lunas, tombol **Play preview** memutarnya.
- Kuis dan pelajaran setelahnya tetap terkunci sampai pembayaran terverifikasi.
- Halaman publik sebelum masuk hanya untuk membaca dan membayar, bukan untuk memutar video.

## Belajar

Beranda peserta ada di `/learn`. Header menampilkan **Kursus saya** dan **Keluar**.

- Kartu sambutan menampilkan nama, XP, streak (hari kalender Asia/Jakarta), dan progres.
- **Continue learning** lalu **Open lesson** kembali ke pelajaran yang sedang dikerjakan.
- Kartu kursus aktif bisa dibuka. Kartu yang belum lunas tidak bisa dibuka.
- **Certificates** muncul di bagian bawah setelah ada sertifikat.

Jika kursus punya pemeriksaan penempatan, jawab dulu sebelum pelajaran terbuka. Hasilnya menentukan modul awal. Modul sebelum itu tetap bisa ditinjau. Modul setelah modul yang belum selesai tetap ditolak server.

Di dalam kursus:

- Kurikulum memakai label **Level** untuk tiap modul. Gembok berarti modul sebelumnya belum selesai. Centang berarti pelajaran selesai.
- Di ponsel, kurikulum ada di menu geser.
- Video diputar di halaman. Pemutar menampilkan email dan ID sebagai watermark yang bergerak. Pintasan unduh dimatikan.
- Pelajaran bacaan menampilkan teks dari instruktur.
- **Lesson resources** memuat berkas PPT, PDF, dan DOCX. **Download** baru berhasil setelah server mengizinkan pelajaran itu.
- **Mark as complete** mencatat pelajaran video atau bacaan, lalu membuka butir berikutnya jika modul mengizinkan.
- Kuis dinilai di server. Nilai lulus bawaan adalah 80. Gagal berarti pelajaran tetap berjalan dan boleh diulang. Nilai 90 atau lebih dapat lencana distinction.
- Menyelesaikan setiap pelajaran dalam satu modul memberi XP tambahan.

Mengubah alamat halaman tidak bisa menandai modul belakang sebagai selesai. API menjawab `403` sampai modul sebelumnya tuntas.

XP diberikan sekali: 10 untuk video atau bacaan, 25 untuk kuis yang lulus, dan 50 saat satu modul tuntas.

## Tugas akhir

Jika instruktur memasang tugas akhir, formulirnya terbuka setelah setiap pelajaran selesai. Tulis jawaban, lalu kirim. Instruktur yang memberi nilai 0–100. Nilai itu bukti laporan, bukan syarat terbitnya sertifikat.

## Sertifikat

Sertifikat terbit saat setiap pelajaran dalam kursus selesai. Di `/learn`, bagian **Certificates** punya tiga tombol:

- **View PDF** membuka berkas.
- **Download PDF** menyimpan berkas. Nama berkas berbentuk `auralogic-<id>.pdf`.
- **Verify** membuka halaman publik `/verify/<id-sertifikat>`.

Siapa pun yang memindai kode QR di PDF membuka halaman yang sama. Halaman itu mengonfirmasi nama, kursus, dan tanggal terbit, tanpa menampilkan email.
