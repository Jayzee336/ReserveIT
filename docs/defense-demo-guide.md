# ReserveIT Defense Demonstration Guide

This guide gives the team a repeatable way to present the workflows addressed by the defense feedback. Use a disposable test database and non-production accounts. Do not use real payment information.

## 1. Before the presentation

On the latest feature branch:

```powershell
php artisan migrate
php artisan test
npm.cmd run build
```

For focused evidence, run these commands separately and capture the terminal output:

```powershell
php artisan test --filter=BookingApprovalWorkflowTest
php artisan test --filter=BookingUpdateTest
php artisan test --filter=BookingCheckInOutTest
php artisan test --filter=BookingSchedulePrivacyTest
php artisan test --filter=AdminDashboardAnalyticsTest
```

Keep the full-suite output and Vite build output as final verification evidence. Run the commands on the actual presentation machine and record the actual result; do not copy a previous run's result into the evidence sheet.

## 2. Suggested live demonstration order

### A. Booking status and approval attribution

1. Sign in as a General User and submit a booking for an available slot.
2. Open My Bookings and show that Pending means the slot is temporarily held while the request awaits review; it is not yet confirmed.
3. Sign in as the assigned Facility Admin and approve the request.
4. Return to the booking owner's My Bookings details.
5. Show the Approved/Confirmed state, approver name, and approval timestamp.

### B. Schedule Grid and 12-hour time

1. Sign in as a Facility Admin.
2. Open Schedule Grid and select a date that has daytime and evening bookings.
3. Show AM/PM labels from the morning through the final evening hour.
4. Show a booking that starts at a quarter-hour increment, such as 8:30 PM, and a booking ending at 10:00 PM.
5. Confirm that the Facility Admin sees only assigned facilities.

### C. Cancellation reason and notifications

1. Sign in as a booking owner and open a pending or approved booking that has not been checked in.
2. Select Cancel and attempt to submit without a reason.
3. Enter a reason and confirm cancellation.
4. Sign in as the assigned Facility Admin and show the cancellation notification.
5. Open Facilitator Bookings, filter by Cancelled, and show the saved reason.
6. Show that a new request can be made for the released time slot.

### D. Owner check-in, check-out, and overtime

1. Prepare an approved booking for the current date and use the booking owner account.
2. Open its details in My Bookings when the 15-minute check-in window is open.
3. Check in as the owner.
4. Check out after the scheduled end in a controlled test scenario.
5. Show the recorded timestamps and final overtime amount.
6. Show that the charge remains Unpaid until an authorized Facility Admin or Super Admin records receipt.
7. Use the focused automated suite to demonstrate the calculated overtime minutes, fee snapshot, and rejection of owner payment-recording attempts.

For a short defense slot, the automated `BookingCheckInOutTest` output is the repeatable evidence for overtime calculation. Do not alter the presentation machine's system clock to simulate overtime.

### E. Client and operations analytics

1. Sign in as Super Admin and show system-wide client and operational metrics.
2. Show unique clients, returning clients, approval rate, cancellation rate, average approval time, peak booking hour, overtime count/minutes, and overtime fees.
3. Sign in as a Facility Admin and show that the same metrics are scoped to assigned facilities only.

## 3. Evidence checklist

Capture screenshots or short recordings of:

- Pending booking displayed as a temporary hold.
- Approved booking with approver name and timestamp.
- Schedule Grid using AM/PM labels and showing evening time slots.
- Cancellation reason form, administrator notification, and cancelled history record.
- Booking owner check-in and check-out controls.
- Final overtime amount and unpaid state.
- Facility Admin and Super Admin analytics views.
- Focused PHPUnit results and the final full-suite result.
- Successful Vite production build.

Record each manual scenario in `docs/uat.md` with its actual outcome and evidence filename. Keep cases marked Not Tested until executed.

## 4. Payment and data safety

ReserveIT's overtime payment action is a manual receipt confirmation. It does not charge a payment gateway. Demonstrate it only with disposable test data and never enter real card, bank, or e-wallet details.
