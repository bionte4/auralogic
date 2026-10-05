# Panduan admin

Admin masuk di `https://auralogic.web.id/instructor/login`. Halaman yang sama dipakai instruktur. Setelah masuk, header admin menampilkan **Courses**, **Users**, **Finance**, **Settings**, dan **New course**. Akun instruktur tidak melihat **Users**, **Finance**, dan **Settings**.

Pendaftaran di situs hanya membuat peserta. Admin pertama dibuat di server. Langkahnya ada di [operasi](operations.md). Pertahankan sedikitnya satu admin yang aktif.

Admin juga boleh membuka studio instruktur. Cara menyusun kursus ada di [panduan instruktur](instructor-guide.md).

## Pengguna

Buka **Users** atau pergi ke `/admin/users`.

1. Cari nama atau email, saring peran bila perlu, lalu pilih **Apply**.
2. Pilih **Edit** di kolom nama, ubah nama tampilan, lalu **Save**. **Cancel** menutup tanpa menyimpan.
3. Ubah peran pada baris itu. Labelnya **Student**, **Instructor**, dan **Admin**. Admin adalah peran super admin.
4. Pilih **Reset password** untuk akun yang aktif. Kata sandi sementara ditampilkan sekali di layar. Salin sebelum menekan **Dismiss**. Tautan lupa kata sandi yang masih berlaku untuk akun itu dibatalkan.
5. Pilih **Deactivate** untuk menutup masuk. **Activate** mengembalikan akun. Akun yang dinonaktifkan tidak bisa masuk, tidak bisa memakai lupa kata sandi, dan tidak bisa di-reset dari tombol ini sampai diaktifkan lagi.
6. **Previous** dan **Next** membalik halaman berisi 20 akun.

Direktori menolak menonaktifkan admin aktif yang terakhir, dan menolak mengubah admin terakhir itu menjadi peran lain. Akun tidak dihapus dari basis data.

Agar seseorang punya studio, minta mereka mendaftar sebagai peserta. Lalu ubah perannya menjadi **Instructor**.

## Daftar massal

**Bulk enroll** memberi kursus yang sudah terbit kepada banyak peserta tanpa pembayaran. Kursi ini tidak masuk pendapatan.

1. Pilih **Bulk enroll**.
2. Pilih kursus yang sudah terbit. Kursus yang belum terbit tidak ada di daftar.
3. Tempel alamat, misalnya `alya@corp.test, budi@corp.test`, atau unggah CSV dengan kolom `email` dan `name`.
4. Pilih **Enroll batch**. Satu batch berhenti di 100 orang.

Alamat baru mendapat akun peserta. Kata sandi sementara ditampilkan sekali di layar ini. Salin sebelum menutup dialog. Alamat yang sudah punya akun didaftarkan ke kursus dan tetap memakai kata sandi lama.

Baris yang dilewati muncul beserta alasannya. Periksa email yang tidak valid atau kursus yang tidak bisa diberi.

## Keuangan

Buka **Finance** atau pergi ke `/admin/finance`.

- **Gross revenue** adalah jumlah tagihan yang lunas dan yang sudah dikembalikan.
- **Net revenue** adalah jumlah yang masih tertahan setelah pengembalian dana.
- Tanggal memakai kalender Asia/Jakarta.
- Saring tanggal mulai, tanggal akhir, teks cari, dan jenjang, lalu pilih **Apply**.
- Grafik menampilkan tren bulanan. Tabel menampilkan transaksi.
- **Export CSV** mengunduh baris yang cocok dengan saringan yang sedang dipakai.

Kursi perusahaan dari daftar massal tidak punya baris pembayaran, jadi tidak masuk total ini.

Pengembalian dana membatalkan pendaftaran dan menandai pembayaran sebagai refund. Pemberitahuan gagal yang datang kemudian tidak mencabut akses yang sudah lunas.

## Pengaturan

Buka **Settings** atau pergi ke `/admin/settings`. Ada empat tab: **SMTP / Email**, **AI**, **Cloudflare Stream**, dan **Payment & QRIS**.

1. Isi formulir. Kolom rahasia menampilkan titik-titik jika nilainya sudah tersimpan. Biarkan kolom itu kosong untuk mempertahankan rahasia yang ada.
2. Pilih **Test connection** untuk memeriksa SMTP, penyedia AI, Cloudflare, atau kunci pembayaran. Uji pembayaran tidak membuat tagihan.
3. Pilih **Save changes**. Toast mengonfirmasi hasilnya. Rahasia mentah tidak ditampilkan lagi.

Nilai yang disimpan adalah catatan admin. Checkout, surat, dan video yang sedang berjalan tetap membaca berkas lingkungan di server. Mengganti kunci di layar ini tidak memindahkan Midtrans, Resend, atau Cloudflare sampai berkas lingkungan diperbarui dan kontainer API dijalankan ulang.

URL notifikasi pembayaran production:

- Midtrans: `https://api.auralogic.web.id/api/payments/midtrans/notification`
- Xendit invoice: `https://api.auralogic.web.id/api/payments/xendit/invoices`
- Xendit QRIS: `https://api.auralogic.web.id/api/payments/xendit/qris`

Membuka URL itu di peramban tidak mencatat pembayaran. Yang membuka kursus adalah notifikasi POST yang tanda tangan dan jumlahnya cocok.

## Kursus dan sertifikat

Admin dapat membuka **Courses** dan memakai studio yang sama dengan instruktur, termasuk menerbitkan kursus dan menilai tugas akhir.

Di tab **Outline**, admin melihat tombol **Hapus** pada modul, pelajaran, dan berkas PPT, PDF, atau DOCX. Instruktur tidak melihat tombol itu. Sebelum menghapus, layar meminta konfirmasi.

- Menghapus modul menghapus setiap pelajaran di dalamnya, berkas materi, video, progres, dan nilai kuis pada pelajaran itu.
- Menghapus pelajaran menghapus progres dan nilai kuis pada pelajaran itu.
- Menghapus berkas hanya menghapus lampiran itu.
- Nomor urut modul dan pelajaran yang tersisa disusun ulang otomatis.
- Kursus utuh yang sudah punya pendaftaran atau sertifikat tidak bisa dihapus. Gunakan arsip jika kursus harus hilang dari katalog tanpa menghapus riwayat pembayaran.

Akses peserta yang membayar tetap menunggu notifikasi pembayaran yang terverifikasi. Kembali dari halaman bank tidak membuka kursus. Sertifikat terbit di akun peserta setelah setiap pelajaran kursus itu selesai. Halaman cek publik ada di `/verify/<id-sertifikat>` dan tidak menampilkan email peserta.
