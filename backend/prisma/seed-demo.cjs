const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const courses = [
  {
    slug: 'workplace-english',
    title: 'Workplace English',
    description: 'Greet colleagues, write short messages, and handle a weekly meeting in clear English.',
    level: 'B1',
    price: '350000.00',
    status: 'PUBLISHED',
    enrollment: 'PAID',
    modules: [
      {
        title: 'First conversations',
        description: 'Open a workday with a polite greeting.',
        lessons: [
          {
            type: 'VIDEO',
            title: 'Greeting a colleague',
            description: 'Watch a short office greeting and notice the polite phrases.',
            durationSeconds: 420,
          },
          {
            type: 'READING',
            title: 'Polite openers',
            description: 'Good morning. How was your weekend? Could I ask a quick question? These openers keep a request friendly.',
          },
          {
            type: 'QUIZ',
            title: 'Greeting check',
            description: 'Choose the more polite option. You need 80 to pass.',
            passingScore: 80,
            questions: [
              {
                prompt: 'Which greeting fits a Monday morning at the office?',
                choices: [
                  { text: 'Hey, move.', correct: false },
                  { text: 'Good morning. How was your weekend?', correct: true },
                ],
              },
              {
                prompt: 'Which request is polite?',
                choices: [
                  { text: 'Could you send the report by noon?', correct: true },
                  { text: 'Send it now.', correct: false },
                ],
              },
            ],
          },
        ],
      },
      {
        title: 'Weekly meetings',
        description: 'This level opens after every lesson in level 1 is complete.',
        lessons: [
          {
            type: 'VIDEO',
            title: 'Starting a meeting',
            description: 'Learn how to open a meeting and invite the first update.',
            durationSeconds: 540,
          },
          {
            type: 'QUIZ',
            title: 'Meeting check',
            description: 'Pass with 80 to finish this level.',
            passingScore: 80,
            questions: [
              {
                prompt: 'How do you invite someone to speak?',
                choices: [
                  { text: 'Would you like to start with your update?', correct: true },
                  { text: 'You. Talk.', correct: false },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'english-for-travel',
    title: 'English for Travel',
    description: 'Ask for directions, book a room, and order food while traveling.',
    level: 'A2',
    price: '250000.00',
    status: 'PUBLISHED',
    enrollment: 'UNPAID',
    modules: [
      {
        title: 'At the hotel',
        description: 'Check in and ask about breakfast.',
        lessons: [
          {
            type: 'READING',
            title: 'Check-in phrases',
            description: 'I have a reservation under Ayu. What time is breakfast? Could I have a quiet room?',
          },
          {
            type: 'QUIZ',
            title: 'Hotel check',
            description: 'Pass with 80.',
            passingScore: 80,
            questions: [
              {
                prompt: 'How do you ask for breakfast time?',
                choices: [
                  { text: 'What time is breakfast?', correct: true },
                  { text: 'Food when?', correct: false },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

async function main() {
  const instructor = await prisma.user.findUnique({ where: { email: 'instructor@fluentis.test' } });
  const student = await prisma.user.findUnique({ where: { email: 'student@fluentis.test' } });
  if (!instructor || !student) {
    throw new Error('Seed the local users before the courses.');
  }

  for (const course of courses) {
    const existing = await prisma.course.findUnique({ where: { slug: course.slug }, select: { id: true } });
    if (existing) {
      await prisma.payment.deleteMany({ where: { enrollment: { courseId: existing.id } } });
      await prisma.enrollment.deleteMany({ where: { courseId: existing.id } });
      await prisma.certificate.deleteMany({ where: { courseId: existing.id } });
      await prisma.course.delete({ where: { id: existing.id } });
    }

    const created = await prisma.course.create({
      data: {
        instructorId: instructor.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        level: course.level,
        price: course.price,
        status: course.status,
        publishedAt: new Date(),
        modules: {
          create: course.modules.map((module, moduleIndex) => ({
            title: module.title,
            description: module.description,
            orderIndex: moduleIndex + 1,
            lessons: {
              create: module.lessons.map((lesson, lessonIndex) => ({
                title: lesson.title,
                description: lesson.description,
                type: lesson.type,
                orderIndex: lessonIndex + 1,
                passingScore: lesson.passingScore ?? null,
                ...(lesson.type === 'VIDEO'
                  ? {
                      videoAsset: {
                        create: {
                          provider: 'CLOUDFLARE_STREAM',
                          assetId: `seed${course.slug.replace(/-/g, '').slice(0, 12)}${lessonIndex + 1}`.padEnd(32, 'a'),
                          encryption: 'AES_128',
                          durationSeconds: lesson.durationSeconds ?? 300,
                        },
                      },
                    }
                  : {}),
                ...(lesson.questions
                  ? {
                      quizQuestions: {
                        create: lesson.questions.map((question, questionIndex) => ({
                          prompt: question.prompt,
                          orderIndex: questionIndex + 1,
                          choices: {
                            create: question.choices.map((choice, choiceIndex) => ({
                              text: choice.text,
                              correct: choice.correct,
                              orderIndex: choiceIndex + 1,
                            })),
                          },
                        })),
                      },
                    }
                  : {}),
              })),
            },
          })),
        },
      },
    });

    const paid = course.enrollment === 'PAID';
    const orderId = `seed-${course.slug}`;
    await prisma.enrollment.create({
      data: {
        userId: student.id,
        courseId: created.id,
        orderId,
        status: paid ? 'ACTIVE' : 'PENDING',
        paymentStatus: paid ? 'PAID' : 'UNPAID',
        amount: course.price,
        currency: 'IDR',
        paidAt: paid ? new Date() : null,
        payments: paid
          ? {
              create: {
                orderId: `${orderId}-pay`,
                provider: 'MIDTRANS',
                channel: 'QRIS',
                amount: course.price,
                currency: 'IDR',
                status: 'PAID',
                paidAt: new Date(),
              },
            }
          : undefined,
      },
    });
    console.log(`${course.slug} ${created.id}`);
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
