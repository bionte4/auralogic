# Admin guide

A super admin signs in at `https://fluentis.web.id/instructor/login`. The same page is used by instructors. After sign-in, the header shows **Users**, **Finance**, and **Settings**. An instructor account does not see those links.

The first super admin is created on the server. See [Operations](operations.md). Public registration only creates students.

## Users

Open **Users** or go to `/admin/users`.

1. Search by name or email, optionally filter by role, then choose **Apply**.
2. Change the role in the row. The labels are **Student**, **Instructor**, and **Admin**. Admin is the super admin role.
3. Choose **Deactivate** to block sign-in. **Activate** restores the account. A deactivated person cannot sign in or reset a password.
4. Use **Previous** and **Next** to move through pages of 20 accounts.

The directory refuses to deactivate the last active admin, and it refuses to change that last admin into another role.

To give someone an instructor studio, they register as a student first. Then set their role to **Instructor**.

## Bulk enroll

**Bulk enroll** grants a published course to many students without a payment. Those seats do not appear as revenue.

1. Choose **Bulk enroll**.
2. Pick a published course. Unpublished courses are not listed.
3. Paste addresses such as `alya@corp.test, budi@corp.test`, or upload a CSV with `email` and `name` columns.
4. Choose **Enroll batch**. The batch stops at 100 people.

A new address gets a student account. The temporary password is shown once on this screen. Copy it before you close the dialog. An address that already has an account is enrolled and keeps its current password.

## Finance

Open **Finance** or go to `/admin/finance`.

- **Gross revenue** is the sum of paid and refunded charges.
- **Net revenue** is the amount still held after refunds.
- Dates use the Asia/Jakarta calendar.
- Filter with a start date, end date, search text, and course level, then choose **Apply**.
- The chart shows the monthly trend. The table lists transactions.
- **Export CSV** downloads the rows that match the current filter.

Company seats from bulk enroll have no payment row, so they stay out of these totals.

## Settings

Open **Settings** or go to `/admin/settings`. There are four tabs: **SMTP / Email**, **AI**, **Cloudflare Stream**, and **Payment & QRIS**.

1. Fill the form. A secret field shows dots when a value is already stored. Leave that field blank to keep the saved secret.
2. Choose **Test connection** to check SMTP, the AI provider, Cloudflare, or the payment key. The payment test does not create a charge.
3. Choose **Save changes**. The toast confirms the result. The raw secret is not shown again.

Saved settings are an admin record. Live checkout, mail, and video still read the server environment file. Changing a key in this screen does not switch Midtrans, Resend, or Cloudflare until that environment file is updated and the API container is restarted.

## Certificates and courses

Admins can also open **Courses** and use the instructor studio. Course access for a paying student still waits for a verified payment notification. The browser return from the bank does not unlock a course.
