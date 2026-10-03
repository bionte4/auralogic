# Student guide

Fluentis teaches one level at a time. A lesson opens after every lesson in the previous level is complete, and after the course has been paid.

## Create an account

1. Open `https://fluentis.web.id`.
2. Choose **Register**. The form is at `/learn/register`.
3. Use a real email address. The password needs at least 8 characters and must include a letter and a number.
4. Sign in at `/student/login`.

The session is stored in a secure cookie. Signing in as an instructor on the student page is rejected.

## If you forget the password

1. On the sign-in page, open **Forgot password?**
2. Enter the same email. The screen always says a link is on the way, even when the email is unknown.
3. Open the link within 15 minutes. It looks like `/reset-password?token=...`.
4. Set a new password and sign in again.

While mail delivery is still in log mode, the school operator reads the link from the API log and sends it to you.

## Buy a course

1. The public homepage lists published courses before you sign in. Open a course to read the outcome and the level list. **Choose course** asks you to sign in, then sends you to payment. Access stays closed until the payment notification is verified.
2. After you sign in, `/learn` still lists the catalog. The first lesson of a course you have not paid for can play as a free preview.
3. Finish payment at Midtrans. Access appears after Midtrans notifies Fluentis. Returning to the site from the bank page does not unlock the course by itself.
4. A course that is still unpaid stays closed.

Corporate seats can be granted by a super admin. Those seats do not create a personal payment.

## Learn

The home of the student area is `/learn`.

- The welcome area shows your name, XP, streak, and progress.
- **Continue learning** returns to the lesson you were on.
- Each course card shows progress. A locked course cannot be opened.

If the course has a placement check, answer it before the lessons open. The result is the level you start on. You can still review earlier levels, and the server still refuses a level that comes after an unfinished one.

The catalog can be narrowed by phase, level, and price. After every lesson in a course is complete, the phase project opens. Submit the writing, or the transcript of what you said. The teacher scores it, and that score is the report evidence.

Inside a course:

- The curriculum lists levels and lessons. A lock means the previous level is unfinished. A check means the lesson is complete.
- On a phone, the curriculum is a slide-over menu.
- Video plays in the page. The player shows your email and ID as a moving watermark. Download shortcuts are disabled.
- Reading lessons show the text supplied by the instructor.
- **Lesson resources** lists PPT, PDF, and DOCX files. **Download** saves a copy after the server checks that you may open the lesson.
- **Mark as complete** records a video or reading lesson and unlocks the next item when the level allows it.
- A quiz is scored on the server. The usual passing score is 80. A failed attempt stays in progress so you can try again. A score of 90 or more can earn a distinction badge.
- Completing every lesson in a level awards extra XP. The streak uses the Asia/Jakarta calendar day.

You cannot mark a later level complete by editing the page address. The API answers `403` until the previous level is done.

## Certificate

When every lesson in the course is complete, Fluentis issues a certificate. Download it from the student dashboard. Anyone who scans the QR code opens `/verify/<certificate-id>` and can confirm the certificate without seeing your email.
