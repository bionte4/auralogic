# Panduan instruktur

Instruktur menyusun kursus yang harus diikuti peserta secara berurutan. Masuk di `https://auralogic.web.id/instructor/login`. Akun peserta ditolak di halaman ini.

Admin memakai halaman masuk yang sama, lalu juga melihat **Users**, **Finance**, dan **Settings**. Langkah layar itu ada di [panduan admin](admin-guide.md).

Akun instruktur tidak dibuat dari tombol **Daftar**. Peserta mendaftar dulu, lalu admin mengubah perannya menjadi **Instructor**.

## Buat kursus

1. Di header, pilih **New course**. Formulir ada di `/instructor/courses/new`.
2. Isi judul (minimal 3 karakter), deskripsi, **Jenjang**, **Jalur**, **Bahasa materi**, dan **Harga (IDR)**.
   - Jenjang: Fondasi, Praktisi, atau Lanjut.
   - Jalur: Network, Cybersecurity, Data science, AI, atau Datacenter.
   - Bahasa materi: Indonesia atau English. Ini bahasa isi pelajaran, bukan bahasa tombol.
   - Harga bilangan bulat rupiah, dari 1 sampai 100.000.000.
3. Pilih **Lanjut ke modul**. Studio terbuka di `/instructor/courses/<id>`.

Kursus baru berstatus **DRAFT**. Draf tidak muncul di katalog publik.

## Profil katalog

Di tab **Outline**, bagian katalog menyimpan:

- **URL gambar sampul**, wajib `https://...`
- **Edisi bahasa lain**, yaitu kursus pasangan. Kosongkan jika belum ada.
- **Hasil belajar**, yaitu apa yang dapat dilakukan peserta setelah kursus selesai.

Pilih **Simpan profil**.

Mengganti bahasa antarmuka tidak menerjemahkan kursus. Untuk edisi kedua, buat kursus baru dengan bahasa materi yang lain, lalu pasangkan keduanya lewat **Edisi bahasa lain**.

## Modul dan pelajaran

Di studio, satu modul ditampilkan sebagai **Level**. Urutan itulah yang dikunci untuk peserta. Server yang memberi nomor urut.

1. Isi judul modul dan, bila perlu, hasil belajar modul itu.
2. Pilih **Add level**. Level 1 tidak punya prasyarat. Level 2 terbuka hanya setelah setiap pelajaran di level 1 selesai, kecuali pemeriksaan penempatan memulai peserta di level yang lebih belakang.
3. Di dalam level, tambah pelajaran:
   - **Video** untuk pelajaran HLS.
   - **Reading** untuk teks.
   - **Quiz**, dengan nilai lulus. Studio mulai dari 80.
4. Untuk kuis, tambah pertanyaan dan pilihan. Peserta tidak pernah menerima kunci jawaban. Server mengacak pertanyaan lalu menilai upaya itu.

Selama lencana masih **DRAFT**, tiap bagian bisa diubah:

1. Di kartu **Katalog**, ubah judul, deskripsi, jenjang, dan harga, lalu pilih **Simpan profil**.
2. Pada sebuah level, pilih **Edit**, ubah judul atau hasil belajar modul, lalu **Simpan**.
3. Pada sebuah pelajaran yang sudah ada, pilih **Edit**, ubah judul, jenis, atau nilai lulus, lalu **Simpan**.

**Batal** menutup formulir tanpa menyimpan. Setelah **Publish**, judul modul dan pelajaran yang sudah tersimpan tidak bisa diubah lagi. Pelajaran baru masih bisa ditambah.

Jangan mengubah urutan level saat peserta sudah di tengah kursus. Urutan baru mengubah siapa yang boleh lanjut.

Materi cybersecurity tetap pada risiko, baseline, log, dan rekomendasi hardening. Jangan menaruh langkah serangan, malware, atau lab eksploit di pelajaran, kuis, atau lampiran.

## Pemeriksaan penempatan

Di outline ada **Add placement question**. Tiap jawaban menunjuk level awal. Server merata-ratakan level itu, membuka kursus di sana, dan tetap mengunci setiap level setelah level yang belum selesai.

Jika pertanyaan penempatan ada dan peserta belum menjawab, setiap pelajaran ditolak. Lewati bagian ini jika semua peserta harus mulai dari level 1.

## Tugas akhir

Formulir **Tugas akhir** di outline menyimpan judul, jenis (laporan lab, analisis, desain, atau notebook), instruksi, dan rubrik. Pilih **Simpan tugas**.

Peserta baru bisa mengumpulkan setelah setiap pelajaran selesai. Di tab **Students**, isi nilai 0–100 pada baris peserta itu. Bergabung ke kelas tidak menggantikan tugas ini.

## Terbitkan

Saat kursus siap dilihat peserta, pilih **Publish**. Status berubah dari **DRAFT** menjadi **PUBLISHED**. Kursus yang belum terbit tetap di studio dan tidak masuk katalog.

Anda dapat meninjau pelajaran di kursus yang Anda miliki tanpa membelinya. Peserta tidak bisa.

## Video

Tab **Video** memasang aset video pada pelajaran bertipe video.

- Saat server masih `VIDEO_MODE=mock`, pelajaran video yang boleh dibuka memutar aliran uji.
- Produksi memakai Cloudflare Stream. Pelajaran menyimpan id aset Stream. API mengembalikan daftar putar bertanda tangan yang berumur pendek.
- Jangan melampirkan berkas `.mp4` mentah sebagai berkas pelajaran.

Watermark email peserta digambar pemutar. Instruktur tidak menaruh watermark itu di dalam berkas video.

## Berkas pelajaran

Pada tiap pelajaran, termasuk kuis, ada zona unggah materi.

- Jenis yang diizinkan: `.ppt`, `.pptx`, `.pdf`, dan `.docx`.
- Satu berkas paling besar 20 MB. Satu pelajaran paling banyak 10 berkas.
- Peserta melihatnya di **Lesson resources** dan mengunduh hanya setelah pelajaran itu boleh dibuka.

Berkas tinggal di penyimpanan pribadi. Editor menampilkan nama dan ukuran, bukan tautan publik.

## Peserta

Tab **Students** memuat pembayaran, progres, level awal, dan nilai tugas akhir.

1. Tambah nama kelas, misalnya `7A`.
2. Pilih kelas itu, lalu masukkan peserta yang sudah terdaftar di kursus.
3. Daftar bisa disaring satu kelas.

Kelas hanya mengelompokkan daftar. Memasukkan seseorang ke kelas tidak memberinya akses. Akses peserta yang membayar tetap menunggu notifikasi pembayaran yang terverifikasi. Kembali dari halaman bank tidak membuka kursus.

Jika belum ada pendaftaran, tab ini menulis bahwa pembayaran tetap tertunda sampai webhook memverifikasinya.

## Yang dialami peserta

Setelah terbit dan pembayaran terverifikasi:

- Level 1 langsung tersedia, kecuali pemeriksaan penempatan belum dijawab.
- **Mark as complete** pada video atau bacaan mencatat pelajaran itu.
- Kuis selesai hanya jika nilai mencapai batas lulus.
- Level berikutnya muncul tanpa memuat ulang seluruh situs setelah level berjalan tuntas.
- Menyelesaikan seluruh pelajaran menerbitkan sertifikat dengan halaman verifikasi publik.

Alur peserta selengkapnya ada di [panduan peserta](student-guide.md).
