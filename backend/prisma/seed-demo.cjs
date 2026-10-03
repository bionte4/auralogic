const { createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const RETIRED_SLUGS = [
  'workplace-english',
  'english-for-travel',
  'everyday-english',
  'school-projects',
  'english-for-presentations',
  'campus-english',
];

const courses = [
  course({
    slug: 'network-foundation',
    title: 'Fondasi Jaringan',
    description: 'Baca model jaringan, hitung subnet, dan bedakan switching dari routing.',
    level: 'FOUNDATION',
    track: 'NETWORK',
    contentLocale: 'ID',
    outcome: 'Peserta dapat menjelaskan jalur sebuah paket dari host ke host lain.',
    price: '350000.00',
    status: 'PUBLISHED',
    enrollment: 'PAID',
    accent: '#0284C7',
    moduleTitle: 'Model dan alamat',
    moduleDescription: 'OSI, TCP/IP, dan pengalamatan.',
    moduleOutcome: 'Menyebut lapisan yang bertanggung jawab atas alamat dan pengiriman.',
    videoTitle: 'Dari OSI ke TCP/IP',
    videoDescription: 'Empat lapisan TCP/IP dan apa yang masing-masing serahkan ke lapisan di bawahnya.',
    durationSeconds: 480,
    quizTitle: 'Cek subnet',
    prompt: 'Apa peran alamat jaringan pada sebuah subnet?',
    correct: 'Menamai subnet, bukan sebuah host.',
    wrong: 'Dipakai host untuk menjelajah web.',
  }),
  course({
    slug: 'network-routing',
    title: 'Routing dan Subnet',
    description: 'Pilih rute, baca tabel routing, dan hitung ulang sebuah subnet yang sudah terpakai.',
    level: 'PRACTITIONER',
    track: 'NETWORK',
    contentLocale: 'ID',
    outcome: 'Peserta dapat menjelaskan mengapa sebuah paket memilih satu next hop.',
    price: '490000.00',
    status: 'PUBLISHED',
    accent: '#0369A1',
    moduleTitle: 'Tabel routing',
    moduleDescription: 'Prefix, metrik, dan next hop.',
    moduleOutcome: 'Membaca satu baris tabel routing dan menyebut next hop-nya.',
    videoTitle: 'Memilih next hop',
    videoDescription: 'Router membandingkan prefix terpanjang, lalu memakai metrik saat prefix sama panjang.',
    durationSeconds: 640,
    quizTitle: 'Cek rute',
    prompt: 'Apa yang dipilih router saat dua rute sama panjang?',
    correct: 'Metrik yang lebih baik.',
    wrong: 'Alamat MAC pengirim.',
  }),
  course({
    slug: 'network-topology-draft',
    title: 'Draf: Topologi kecil',
    description: 'Sketsa satu LAN dengan switch, router, dan rentang alamat yang tidak bertumpuk.',
    level: 'FOUNDATION',
    track: 'NETWORK',
    contentLocale: 'ID',
    outcome: 'Peserta dapat menggambar tiga subnet yang tidak saling menimpa.',
    price: '290000.00',
    status: 'DRAFT',
    accent: '#7DD3FC',
    moduleTitle: 'Sketsa LAN',
    moduleDescription: 'Peran switch dan router pada gambar.',
    moduleOutcome: 'Menandai perangkat yang meneruskan paket antar subnet.',
    videoTitle: 'Switch atau router',
    videoDescription: 'Switch menghubungkan host dalam satu subnet. Router menghubungkan subnet yang berbeda.',
    durationSeconds: 360,
    quizTitle: 'Cek peran',
    prompt: 'Perangkat mana yang menghubungkan dua subnet?',
    correct: 'Router.',
    wrong: 'Kabel lurus antar dua host.',
  }),
  course({
    slug: 'cybersecurity-foundation',
    title: 'Fondasi Keamanan',
    description: 'Bedakan ancaman dan kerentanan, lalu susun baseline konfigurasi yang aman.',
    level: 'FOUNDATION',
    track: 'CYBERSECURITY',
    contentLocale: 'ID',
    outcome: 'Peserta dapat menulis rekomendasi hardening tanpa langkah menyerang.',
    price: '380000.00',
    status: 'PUBLISHED',
    accent: '#059669',
    moduleTitle: 'Risiko dan kontrol',
    moduleDescription: 'CIA, identitas, dan baseline.',
    moduleOutcome: 'Menilai satu kontrol untuk satu risiko.',
    videoTitle: 'Ancaman, kerentanan, kontrol',
    videoDescription: 'Kerentanan adalah kelemahan. Ancaman adalah pihak atau kejadian yang dapat memakainya. Kontrol mengurangi peluang itu.',
    durationSeconds: 520,
    quizTitle: 'Cek konsep',
    prompt: 'Mana yang merupakan kontrol, bukan langkah serangan?',
    correct: 'Mematikan layanan yang tidak diperlukan.',
    wrong: 'Mencoba masuk ke akun orang lain.',
  }),
  course({
    slug: 'cybersecurity-baseline',
    title: 'Baseline dan Log',
    description: 'Bandingkan konfigurasi dengan baseline, lalu baca log untuk menemukan penyimpangan.',
    level: 'PRACTITIONER',
    track: 'CYBERSECURITY',
    contentLocale: 'ID',
    outcome: 'Peserta dapat menandai satu baris log yang tidak sesuai baseline.',
    price: '540000.00',
    status: 'PUBLISHED',
    accent: '#047857',
    moduleTitle: 'Membaca penyimpangan',
    moduleDescription: 'Baseline, log, dan rekomendasi.',
    moduleOutcome: 'Mengusulkan satu perubahan konfigurasi dari sebuah temuan log.',
    videoTitle: 'Dari baseline ke log',
    videoDescription: 'Baseline mencatat layanan yang boleh hidup. Log menunjukkan apa yang benar-benar terjadi.',
    durationSeconds: 700,
    quizTitle: 'Cek log',
    prompt: 'Apa langkah yang tepat setelah sebuah layanan di luar baseline muncul di log?',
    correct: 'Catat temuannya dan rekomendasikan layanan itu dimatikan atau dibenarkan.',
    wrong: 'Uji layanan itu dengan mencoba mengeksploitasinya.',
  }),
  course({
    slug: 'cybersecurity-access-draft',
    title: 'Draf: Kontrol akses',
    description: 'Susun siapa yang boleh membaca, mengubah, dan menyetujui sebuah sistem.',
    level: 'FOUNDATION',
    track: 'CYBERSECURITY',
    contentLocale: 'ID',
    outcome: 'Peserta dapat memisahkan peran pemohon dan penyetuju.',
    price: '300000.00',
    status: 'DRAFT',
    accent: '#6EE7B7',
    moduleTitle: 'Peran dan izin',
    moduleDescription: 'Least privilege dan pemisahan tugas.',
    moduleOutcome: 'Menulis tiga peran dengan izin yang berbeda.',
    videoTitle: 'Izin secukupnya',
    videoDescription: 'Setiap peran hanya menerima izin yang dibutuhkan pekerjaannya.',
    durationSeconds: 400,
    quizTitle: 'Cek peran',
    prompt: 'Mengapa pemohon dan penyetuju sebaiknya orang yang berbeda?',
    correct: 'Agar satu orang tidak dapat menyetujui permintaannya sendiri.',
    wrong: 'Agar kata sandi dapat dibagikan dalam tim.',
  }),
  course({
    slug: 'data-foundation',
    title: 'Fondasi Data',
    description: 'Ajukan pertanyaan dengan SQL, bersihkan data, dan baca sebuah ringkasan.',
    level: 'FOUNDATION',
    track: 'DATA_SCIENCE',
    contentLocale: 'ID',
    outcome: 'Peserta dapat menulis kueri yang menjawab satu pertanyaan bisnis.',
    price: '320000.00',
    status: 'PUBLISHED',
    accent: '#D97706',
    moduleTitle: 'Bertanya ke tabel',
    moduleDescription: 'SELECT, filter, dan agregasi.',
    moduleOutcome: 'Menghitung satu metrik dari sebuah tabel.',
    videoTitle: 'Satu pertanyaan, satu kueri',
    videoDescription: 'SELECT region, COUNT(*) FROM orders WHERE paid = true GROUP BY region menjawab berapa pesanan lunas di tiap wilayah.',
    durationSeconds: 560,
    quizTitle: 'Cek SQL',
    prompt: 'Klausul mana yang menyaring baris sebelum agregasi?',
    correct: 'WHERE',
    wrong: 'ORDER BY',
  }),
  course({
    slug: 'data-metrics',
    title: 'Metrik yang bisa dijelaskan',
    description: 'Pilih pembilang dan penyebut, lalu tulis definisi metrik yang dapat diulang orang lain.',
    level: 'PRACTITIONER',
    track: 'DATA_SCIENCE',
    contentLocale: 'ID',
    outcome: 'Peserta dapat mempertahankan satu metrik beserta filternya.',
    price: '460000.00',
    status: 'PUBLISHED',
    accent: '#B45309',
    moduleTitle: 'Definisi metrik',
    moduleDescription: 'Pembilang, penyebut, dan jendela waktu.',
    moduleOutcome: 'Menulis definisi satu rasio beserta filternya.',
    videoTitle: 'Rasio yang jujur',
    videoDescription: 'Sebuah rasio tanpa jendela waktu dan filter dapat membandingkan hal yang berbeda.',
    durationSeconds: 610,
    quizTitle: 'Cek metrik',
    prompt: 'Apa yang wajib disebut saat mendefinisikan sebuah rasio?',
    correct: 'Pembilang, penyebut, dan jendela waktunya.',
    wrong: 'Hanya warna grafik.',
  }),
  course({
    slug: 'data-cleaning-draft',
    title: 'Draf: Membersihkan data',
    description: 'Tandai nilai kosong, duplikat, dan satuan yang tidak seragam sebelum menghitung.',
    level: 'FOUNDATION',
    track: 'DATA_SCIENCE',
    contentLocale: 'ID',
    outcome: 'Peserta dapat menolak sebuah rata-rata yang dihitung dari data kotor.',
    price: '280000.00',
    status: 'DRAFT',
    accent: '#FCD34D',
    moduleTitle: 'Sebelum agregasi',
    moduleDescription: 'Kosong, duplikat, dan satuan.',
    moduleOutcome: 'Menyebut satu alasan sebuah kolom belum siap dihitung.',
    videoTitle: 'Jangan rata-rata dulu',
    videoDescription: 'Nilai kosong dan satuan yang bercampur mengubah hasil agregasi.',
    durationSeconds: 340,
    quizTitle: 'Cek kebersihan',
    prompt: 'Kapan sebuah rata-rata layak dilaporkan?',
    correct: 'Setelah nilai kosong dan satuan yang bercampur ditangani.',
    wrong: 'Begitu file berhasil dibuka.',
  }),
  course({
    slug: 'ai-foundation',
    title: 'AI Foundations',
    description: 'Tell supervised learning from unsupervised learning and name one limit of a model.',
    level: 'FOUNDATION',
    track: 'AI',
    contentLocale: 'EN',
    outcome: 'A learner can say what a model was trained to predict and where it should not decide alone.',
    price: '420000.00',
    status: 'PUBLISHED',
    accent: '#7C3AED',
    moduleTitle: 'What a model learns',
    moduleDescription: 'Labels, features, and evaluation.',
    moduleOutcome: 'Name the question a model answers.',
    videoTitle: 'A labeled example',
    videoDescription: 'Supervised learning maps inputs to a label that a person already recorded.',
    durationSeconds: 540,
    quizTitle: 'Model check',
    prompt: 'Which task is supervised?',
    correct: 'Predict a known label from examples.',
    wrong: 'Group rows when no label exists.',
  }),
  course({
    slug: 'ai-evaluation',
    title: 'Evaluating a Model',
    description: 'Separate training data from a held-out check, and refuse a score that has no baseline.',
    level: 'PRACTITIONER',
    track: 'AI',
    contentLocale: 'EN',
    outcome: 'A learner can explain why a single accuracy number is not a decision.',
    price: '580000.00',
    status: 'PUBLISHED',
    accent: '#6D28D9',
    moduleTitle: 'A fair check',
    moduleDescription: 'Holdout data, baseline, and human review.',
    moduleOutcome: 'Compare a model with a simple baseline before trusting it.',
    videoTitle: 'Accuracy is not enough',
    videoDescription: 'A high score on the training rows does not show how the model behaves on new rows.',
    durationSeconds: 720,
    quizTitle: 'Evaluation check',
    prompt: 'Which set should be used to judge a model the team did not tune on?',
    correct: 'Rows held out from training.',
    wrong: 'The same rows the model memorized.',
  }),
  course({
    slug: 'ai-limits-draft',
    title: 'Draft: Where a model stops',
    description: 'List decisions that stay with a person even when a model suggests an answer.',
    level: 'FOUNDATION',
    track: 'AI',
    contentLocale: 'EN',
    outcome: 'A learner can name one decision the model must not make alone.',
    price: '310000.00',
    status: 'DRAFT',
    accent: '#C4B5FD',
    moduleTitle: 'Human review',
    moduleDescription: 'Suggestions versus decisions.',
    moduleOutcome: 'Write one case that needs a person to confirm the result.',
    videoTitle: 'A suggestion, not a verdict',
    videoDescription: 'The model can rank options. A person remains responsible for the decision.',
    durationSeconds: 380,
    quizTitle: 'Limit check',
    prompt: 'What should happen when a model is unsure?',
    correct: 'Show the case to a person.',
    wrong: 'Hide the uncertainty and proceed.',
  }),
];

function course(input) {
  return input;
}

function sampleAssetId(slug) {
  return createHash('sha256').update(`auralogic-sample:${slug}`).digest('hex').slice(0, 32);
}

function coverSvg(accent, variant) {
  const drift = (variant % 4) * 70;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#0B1220"/>
  <circle cx="${980 + drift}" cy="${120 + drift}" r="250" fill="${accent}" opacity="0.9"/>
  <circle cx="${160 + drift}" cy="640" r="210" fill="${accent}" opacity="0.28"/>
  <circle cx="640" cy="360" r="${90 + drift}" fill="${accent}" opacity="0.18"/>
</svg>`;
}

async function ensureVideo(courseId, slug, lesson) {
  const modules = await prisma.module.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
    include: { lessons: { include: { videoAsset: true } } },
  });
  const hasVideo = modules.some((module) => module.lessons.some((item) => item.videoAsset));
  if (hasVideo || modules.length === 0) {
    return;
  }
  const module = modules[0];
  const orderIndex = module.lessons.reduce((max, item) => Math.max(max, item.orderIndex), 0) + 1;
  await prisma.lesson.create({
    data: {
      moduleId: module.id,
      title: lesson.videoTitle,
      description: lesson.videoDescription,
      type: 'VIDEO',
      orderIndex,
      videoAsset: {
        create: {
          provider: 'CLOUDFLARE_STREAM',
          assetId: sampleAssetId(slug),
          encryption: 'AES_128',
          durationSeconds: lesson.durationSeconds,
        },
      },
    },
  });
}

async function createCourse(instructorId, item) {
  return prisma.course.create({
    data: {
      instructorId,
      title: item.title,
      slug: item.slug,
      description: item.description,
      level: item.level,
      track: item.track,
      contentLocale: item.contentLocale,
      price: item.price,
      outcome: item.outcome,
      coverImageUrl: `/covers/${item.slug}.svg`,
      status: item.status,
      publishedAt: item.status === 'PUBLISHED' ? new Date() : null,
      modules: {
        create: [
          {
            title: item.moduleTitle,
            description: item.moduleDescription,
            outcome: item.moduleOutcome,
            orderIndex: 1,
            lessons: {
              create: [
                {
                  title: item.videoTitle,
                  description: item.videoDescription,
                  type: 'VIDEO',
                  orderIndex: 1,
                  videoAsset: {
                    create: {
                      provider: 'CLOUDFLARE_STREAM',
                      assetId: sampleAssetId(item.slug),
                      encryption: 'AES_128',
                      durationSeconds: item.durationSeconds,
                    },
                  },
                },
                {
                  title: item.quizTitle,
                  description: 'Nilai lulus 80.',
                  type: 'QUIZ',
                  orderIndex: 2,
                  passingScore: 80,
                  quizQuestions: {
                    create: [
                      {
                        prompt: item.prompt,
                        orderIndex: 1,
                        choices: {
                          create: [
                            { text: item.correct, correct: true, orderIndex: 1 },
                            { text: item.wrong, correct: false, orderIndex: 2 },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });
}

async function main() {
  const instructor = await prisma.user.findUnique({ where: { email: 'instructor@fluentis.test' } });
  const student = await prisma.user.findUnique({ where: { email: 'student@fluentis.test' } });
  if (!instructor || !student) {
    throw new Error('Seed the local users before the courses.');
  }
  await prisma.user.update({ where: { id: instructor.id }, data: { name: 'Auralogic Studio' } });

  const { writeFileSync, mkdirSync } = require('node:fs');
  const { join } = require('node:path');
  const coverDir = join(__dirname, '../../frontend/public/covers');
  mkdirSync(coverDir, { recursive: true });

  await prisma.course.updateMany({ where: { slug: { in: RETIRED_SLUGS } }, data: { status: 'ARCHIVED' } });

  for (const item of courses) {
    writeFileSync(join(coverDir, `${item.slug}.svg`), coverSvg(item.accent, item.slug.length));
    const existing = await prisma.course.findUnique({ where: { slug: item.slug }, select: { id: true, publishedAt: true } });
    if (existing) {
      await prisma.course.update({
        where: { id: existing.id },
        data: {
          title: item.title,
          description: item.description,
          level: item.level,
          track: item.track,
          contentLocale: item.contentLocale,
          price: item.price,
          outcome: item.outcome,
          coverImageUrl: `/covers/${item.slug}.svg`,
          status: item.status,
          publishedAt: item.status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : null,
        },
      });
      await ensureVideo(existing.id, item.slug, item);
      console.log(`${item.slug} updated ${existing.id}`);
      continue;
    }

    const created = await createCourse(instructor.id, item);
    if (item.enrollment === 'PAID') {
      const orderId = `seed-${item.slug}`;
      const already = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: student.id, courseId: created.id } } });
      if (!already) {
        await prisma.enrollment.create({
          data: {
            userId: student.id,
            courseId: created.id,
            orderId,
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            amount: item.price,
            currency: 'IDR',
            paidAt: new Date(),
            payments: {
              create: {
                orderId: `${orderId}-pay`,
                provider: 'MIDTRANS',
                channel: 'QRIS',
                amount: item.price,
                currency: 'IDR',
                status: 'PAID',
                paidAt: new Date(),
              },
            },
          },
        });
      }
    }
    console.log(`${item.slug} ${item.status} ${created.id}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
