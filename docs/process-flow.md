# Alur proses

Ini jalur yang benar-benar diikuti Auralogic. Peramban tidak bisa memberi akses kursus atau melewati modul. Kedua keputusan itu dibuat API.

Satu modul ditampilkan sebagai **Level** di studio dan pemutar. Jenjang kursus (Fondasi, Praktisi, Lanjut) dan jalur (Network, Cybersecurity, Data science, AI, Datacenter) hanya label katalog. Keduanya tidak membuka atau mengunci pelajaran. Aplikasi juga tidak memaksa urutan antar-kursus.

Bahasa antarmuka (cookie `locale`, nilai akun `ID` atau `EN`) terpisah dari bahasa materi kursus. Mengganti bahasa tombol tidak menerjemahkan pelajaran. Edisi bahasa lain adalah kursus pasangan.

## 1. Akun

```mermaid
flowchart TD
  visit[Buka auralogic.web.id] --> register[Daftar]
  register --> student[Peran: Peserta]
  student --> studentLogin["Masuk di /student/login"]
  staffLogin["Masuk di /instructor/login"] --> staff{Peran}
  staff -->|Instruktur| studio[Studio instruktur]
  staff -->|Admin| admin[Users, Finance, Settings]
  staff -->|Peserta| rejected[Ditolak]
  admin --> promote[Ubah peserta menjadi Instruktur atau Admin]
  promote --> staffLogin
```

Pendaftaran publik selalu membuat peserta. Admin pertama dibuat di server, lalu admin itu yang mengangkat orang lain. Peserta yang membuka halaman instruktur ditolak, dan instruktur yang membuka halaman peserta ditolak.

Lupa kata sandi selalu menampilkan pesan yang sama, baik email itu ada maupun tidak. Tautan reset berlaku 15 menit. Basis data hanya menyimpan hash token.

## 2. Susun kursus

```mermaid
flowchart TD
  create[Buat kursus] --> profile[Sampul, jalur, jenjang, bahasa materi, hasil belajar]
  profile --> levels[Tambah modul beserta hasil belajar modul]
  levels --> lessons[Tambah pelajaran video, bacaan, atau kuis]
  lessons --> placement[Pemeriksaan penempatan, opsional]
  placement --> files[Berkas PPT, PDF, atau DOCX, opsional]
  files --> project[Tugas akhir, opsional]
  project --> publish[Publish]
  publish --> catalog[Terlihat peserta]
```

Modul 1 tidak punya prasyarat. Modul 2 terbuka hanya setelah setiap pelajaran di modul 1 selesai, kecuali pemeriksaan penempatan memulai peserta di modul yang lebih belakang. Kuis mulai dengan nilai lulus 80 kecuali instruktur mengubahnya. Kunci jawaban tidak pernah dikirim ke peserta. Kunci penempatan tetap di server.

Kursus **DRAFT** tetap di studio dan tidak masuk katalog.

## 3. Bayar dan buka

```mermaid
flowchart TD
  browse[Peserta membuka halaman kursus] --> preview[Pratinjau konten pelajaran pertama]
  preview --> checkout[Checkout]
  checkout --> pending[Pendaftaran tertunda dan belum lunas]
  pending --> gateway[Midtrans atau Xendit]
  gateway --> notify[Penyedia mengirim notifikasi POST]
  notify --> check{Tanda tangan dan jumlah cocok?}
  check -->|Ya| active[Pendaftaran aktif dan lunas]
  check -->|Tidak| stay[Pendaftaran tetap terkunci]
  gateway --> browser[Peramban kembali ke situs]
  browser --> stay
  active --> diagnose{Ada pertanyaan penempatan?}
  diagnose -->|Ya| placed[Peserta menjawab pemeriksaan penempatan]
  placed --> learn[Kursus terbuka di modul hasil penempatan]
  diagnose -->|Tidak| learn
```

Pratinjau hanya untuk membaca atau memutar pelajaran 1 di modul 1 pada kursus yang sudah terbit. Menandai selesai, mengirim kuis, dan mengunduh lampiran tetap butuh pendaftaran aktif dan lunas.

URL notifikasi Midtrans adalah `https://api.auralogic.web.id/api/payments/midtrans/notification`. Membukanya di peramban tidak mencatat pembayaran. Pengembalian dana membuat pendaftaran dibatalkan dan pembayaran berstatus refund. Pemberitahuan gagal yang datang kemudian tidak mencabut akses yang sudah lunas.

## 4. Belajar berurutan

```mermaid
flowchart TD
  open[Buka pelajaran] --> access{Aktif, lunas, dan di dalam masa akses?}
  access -->|Tidak| locked[403 Forbidden]
  access -->|Ya| level{Setiap pelajaran di modul sebelumnya selesai?}
  level -->|Tidak| locked
  level -->|Ya| kind{Jenis pelajaran}
  kind -->|Video atau bacaan| mark[Mark as complete]
  kind -->|Kuis| score[Server menilai upaya]
  score --> pass{Nilai mencapai batas lulus?}
  pass -->|Tidak| retry[Tetap berjalan]
  pass -->|Ya| done[Pelajaran selesai]
  mark --> done
  done --> next{Modul selesai?}
  next -->|Ya| unlock[Modul berikutnya terbuka]
  next -->|Tidak| more[Lanjut di modul ini]
```

Kuis yang punya pertanyaan mengabaikan nilai yang diketik peramban. Server mengacak pertanyaan dan pilihan, lalu menghitung nilai. Pelajaran yang sudah selesai tidak bisa dikembalikan menjadi belum selesai.

Pemeriksaan penempatan dapat membuka kursus di modul yang lebih belakang. Modul sampai modul awal itu tetap tersedia untuk ditinjau. Setiap modul setelahnya tetap menunggu modul sebelumnya selesai. Jika kursus punya pertanyaan penempatan dan peserta yang sudah lunas belum menjawab, setiap pelajaran mengembalikan 403.

Tugas akhir terbuka hanya setelah setiap pelajaran selesai. Instruktur yang memberi nilai. Kelas bernama mengelompokkan peserta yang sudah terdaftar agar daftar bisa dibaca satu kelas. Masuk kelas tidak memberi akses.

Hadiah diberikan sekali: 10 XP untuk video atau bacaan, 25 XP untuk kuis yang lulus, dan 50 XP saat satu modul tuntas. Nilai kuis 90 atau lebih dapat menambah lencana distinction. Streak memakai hari kalender Asia/Jakarta.

Instruktur pemilik kursus dan super admin dapat meninjau pelajaran tanpa membeli dan tanpa menyelesaikan modul sebelumnya.

## 5. Sertifikat

```mermaid
flowchart TD
  all[Setiap pelajaran dalam kursus selesai] --> issue[Sertifikat terbit]
  issue --> download[Peserta mengunduh PDF]
  issue --> qr["QR membuka /verify/id-sertifikat"]
  qr --> public[Halaman publik mengonfirmasi sertifikat]
  public --> hidden[Email peserta tidak ditampilkan]
```

Tugas akhir tidak menjadi syarat terbitnya sertifikat.

## 6. Kursi perusahaan

```mermaid
flowchart TD
  admin[Admin membuka Bulk enroll] --> list[Tempel email atau unggah CSV]
  list --> cap{Paling banyak 100 orang}
  cap --> create[Buat peserta jika email baru]
  create --> grant[Beri kursus tanpa baris pembayaran]
  grant --> show[Tampilkan kata sandi sementara sekali]
  grant --> finance[Total keuangan tidak berubah]
```

## 7. Yang diperiksa tiap permintaan

| Tindakan | Syarat |
| --- | --- |
| Lihat katalog | Kursus berstatus terbit |
| Putar atau baca pelajaran 1 modul 1 | Sesi peserta dan kursus terbit. Pembayaran tidak wajib untuk konten ini |
| Tandai selesai, kirim kuis, atau unduh berkas | Sesi peserta, pendaftaran aktif dan lunas, waktu sekarang di dalam masa akses, plus setiap pelajaran di modul sebelumnya selesai |
| Buka modul berikutnya | Syarat yang sama dengan menulis progres |
| Putar video | Syarat konten pelajaran itu, lalu daftar putar HLS yang berumur pendek |
| Pratinjau staf | Super admin, atau instruktur yang memiliki kursus itu |
| Catat keuangan | Baris pembayaran yang nyata. Kursi perusahaan tidak masuk |
