# Instructor guide

Instructors build the course that students must follow in order. Sign in at `https://fluentis.web.id/instructor/login`. A student account is turned away from this page.

A super admin uses the same sign-in page and also sees **Users**, **Finance**, and **Settings**.

## Create a course

1. Open **Instructor** and create a course at `/instructor/courses/new`.
2. Set the title, description, level label, and price in rupiah.
3. Add levels in the order students must take them. Level 1 has no prerequisite. Level 2 opens only after every lesson in level 1 is complete.
4. Inside a level, add lessons:
   - **Video** for an HLS lesson.
   - **Reading** for text.
   - **Quiz** with a passing score. The studio starts at 80.
5. For a quiz, add questions and choices. Students never receive the answer key. The server shuffles questions and scores the attempt.
6. Choose **Publish** when the course should appear to students. An unpublished course stays out of the catalog.

You can preview a lesson in a course you own without buying it. Students cannot.

## Video

With `VIDEO_MODE=mock`, a published video lesson can play a test stream after the student is allowed in. Production playback uses Cloudflare Stream: the lesson stores a Stream asset id, and the API returns a short-lived signed playlist. Do not attach a raw `.mp4` as the lesson file.

The player draws the student watermark. Instructors do not place that watermark in the video file.

## Lesson files

On each lesson, including a quiz, the studio has a drop zone for materials.

- Allowed types are `.ppt`, `.pptx`, `.pdf`, and `.docx`.
- Each file can be up to 20 MB, and a lesson can hold 10 files.
- Students see the files under **Lesson resources** and download them only after they are allowed to open the lesson.

Files stay in private storage. The editor shows the file name and size, not a public link.

## What students experience

After you publish and a student pays:

- Level 1 is available immediately.
- **Mark as complete** on a video or reading lesson records that lesson.
- A quiz lesson is complete only when the score reaches the passing score.
- The next level appears without a full reload once the current level is finished.
- Finishing the whole course issues a certificate with a public verification page.

Changing the order of levels changes who can proceed. Do that before students are in the middle of the course.

## Super admin

A super admin uses this same sign-in page and then sees **Users**, **Finance**, and **Settings**. The steps for those screens are in the [admin guide](admin-guide.md).
