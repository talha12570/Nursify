# Nursify — Functional Requirements & System "How It Works"

Generated from the current repository implementation (Mobile App + Admin Portal + Server).

## 1) What Nursify is
Nursify is a role-based healthcare services platform that connects **patients** with **caregivers** (nurses/caretakers) for time-bound services (hourly/daily/weekly/monthly). The system supports:
- Patient discovery of available/approved caregivers (including nearby search).
- Booking requests that require caregiver acceptance.
- Payment confirmation (cash or Mastercard card payment).
- Live service tracking during the visit.
- Post-service completion confirmation and mutual reviews.
- Admin verification/approval for caregivers and operational oversight (users, bookings, payments, reviews).

## 2) System components (high-level architecture)

### 2.1 Mobile App (Expo / React Native)
Primary end-user app for patients and caregivers.
- Navigation is implemented as a **manual screen state machine** (string-based), not a typical router.
- Stores auth state in `AsyncStorage` (`authToken`, `userData`).
- Uses GPS for patient location (caregiver discovery + service map) and for caregiver live tracking (heartbeat updates).

### 2.2 Admin Portal (React + TypeScript + Vite)
Web app used by admins.
- Stores admin auth token in `localStorage` as `adminToken`.
- Uses server API endpoints under `/api/admin/*`.

### 2.3 Server (Node.js / Express)
REST API server.
- Express app exposes `/api/auth`, `/api/otp`, `/api/patient`, `/api/caregiver`, `/api/admin`, `/api/review`, `/api/payment`.
- Uses JWT auth + role checks.
- Uses MongoDB (Mongoose) as system of record.
- Uses Cloudinary for image/file uploads.
- Uses email (Nodemailer) for OTP delivery.
- Uses Mastercard MPGS integration for card payments (with a simulation mode fallback).

## 3) Roles and access model

### 3.1 Roles
- **Patient**: can browse caregivers, book services, confirm completion, submit reviews.
- **Caregiver** (nurse/caretaker): can accept/reject bookings, set availability, update service status, submit reviews.
- **Admin**: can approve/reject caregiver registrations and view operational dashboards.

### 3.2 Authentication
- Auth is primarily JWT-based via `Authorization: Bearer <token>`.
- Mobile stores JWT in `AsyncStorage`.
- Admin Portal stores JWT in `localStorage`.

### 3.3 Verification vs approval
The platform distinguishes between:
- **Email verification** (OTP-based): `isVerified` must be true for normal access.
- **Admin approval** (caregivers only): caregivers require `isApproved` true; patients are auto-approved.

## 4) Core data model (conceptual)

### 4.1 User
Key concepts used across flows:
- Identity: `fullName`, `email`, `phone`, `passwordHash`.
- Role: `userType` in `{ patient, nurse, caretaker }` plus admin marker.
- Compliance documents (caregivers): CNIC front/back, license photo, experience letter/image, etc.
- Status flags: `isVerified`, `isApproved`, `isRejected` (with rejection reason).
- Availability flags: `isAvailable` and activity marker `lastActive`.
- Location: GeoJSON point for caregiver discovery.
- Profile/rates: about/education/institution/licenseType plus hourly/daily/weekly/monthly rates.

### 4.2 Booking
A booking links a patient and caregiver for a specific time window:
- Parties: `patient`, `caregiver`.
- Service details: `serviceType`, `duration`, `date`, `time`, `location`.
- Conflict window: `startDateTime` and computed `endDateTime`.
- Amount + payment method: `amount`, `paymentMethod`.
- Booking status lifecycle (see section 7).
- Payment status: `paid/unpaid` tracking.

### 4.3 Review
- A review is tied to a booking.
- A reviewer reviews the other party (patient ↔ caregiver).
- Contains rating + optional review text.

### 4.4 EmailVerificationToken (OTP)
- Stores OTP tokens with a TTL (~1 hour) for verification and reset flows.

## 5) End-to-end user flows

## 5.1 Patient journey

### 5.1.1 Patient registration
Requirements:
- Patient provides: full name, email, phone, password, CNIC number.
- Client-side validation includes email format, phone format, CNIC format, and password strength.
- Server registers patient and triggers email OTP verification.

Result:
- Patient must complete OTP verification before normal login is allowed.

### 5.1.2 Patient login
Behavior:
- If login succeeds and user is verified + approved (patients are approved), mobile stores:
  - `authToken`
  - `userData`
- If user is not verified, API responds with an error indicating verification is required; the app transitions to OTP screen.

### 5.1.3 Discover caregivers
Requirements:
- Patient can view a list/map of caregivers.
- Discovery favors caregivers that are:
  - verified,
  - approved,
  - available,
  - and recently active (heartbeat-based).
- Nearby search depends on both patient GPS and caregiver stored GPS.

### 5.1.4 Request a booking (BookingFlow)
Mobile flow is a 3-step wizard:
1) Select service type.
2) Select date and time and **must check availability** before proceeding.
   - Time defaults to the next 30-minute boundary.
   - Availability check calls the server with `startDateTime` + computed `endDateTime`.
3) Select location.
   - App requests GPS permission.
   - App reverse-geocodes GPS to an address and fills `location`.
   - Patient can drag a map marker to adjust the address.

Submit:
- The app creates a booking with:
  - `status: pending`
  - `paymentMethod: cash` (default)
  - computed `amount` based on caregiver rates (or defaults)

### 5.1.5 Wait for caregiver decision (PendingApproval)
Requirements:
- Patient sees a waiting screen.
- App polls booking status every ~5 seconds using the booking id.
- If caregiver accepts: status becomes `approved` and patient proceeds to payment confirmation.
- If caregiver rejects: status becomes `rejected` and patient returns to find another caregiver.
- Patient can cancel the request (delete/cancel booking).

### 5.1.6 Confirm payment method (LocationPayment)
Requirements:
- Once booking is `approved`, patient must confirm the booking.
- Two practical payment options in the current UI:
  - **Cash on service**: app updates booking to `status: confirmed` and sets `paymentMethod: cash`.
  - **Mastercard**: app collects card details locally and calls `/payment/mastercard/initiate`.
    - Only Mastercard is accepted (client enforces Mastercard brand + Luhn).
    - On success, the booking becomes paid and confirmed.

Notes:
- JazzCash and Easypaisa appear in the UI list but are disabled/unavailable.

### 5.1.7 Track service and confirm completion (PatientServiceTracking)
Requirements:
- The patient can track service progress after confirmation.
- The patient view polls booking status every ~3 seconds.
- When booking status is `on_the_way` or `arrived`, the app shows a live map:
  - Patient marker from patient GPS.
  - Nurse marker from server nurse location endpoint.

Completion:
- When booking status is `service_completed`, the patient must confirm completion.
- Confirmation transitions the booking to `completed_confirmed`.

Review:
- After completion confirmation, patient is prompted to submit a review for the caregiver.

## 5.2 Caregiver journey (nurse/caretaker)

### 5.2.1 Caregiver registration
Requirements:
- Caregiver provides the same base identity as patients.
- Caregiver must upload compliance documents (CNIC images, experience docs, etc.).
- Nurses additionally provide license number and license photo.
- Server requires email OTP verification.
- Caregiver then requires **admin approval** before full access.

### 5.2.2 Pending verification / approval
Behavior:
- After OTP verification, caregivers may be shown a “pending approval” state until `isApproved` becomes true.

### 5.2.3 Caregiver dashboard
Capabilities:
- Availability toggle (online/offline) updates backend caregiver visibility.
- Heartbeat:
  - Dashboard sends a heartbeat roughly every 5 seconds.
  - Heartbeat includes caregiver GPS when available.
  - The server uses this to keep `lastActive` fresh and to support nearby search.

Bookings view:
- Dashboard fetches booking requests (`status=pending`) as “job requests”.
- Caregiver can accept or reject requests.

### 5.2.4 Accept / reject booking
Requirements:
- Accepting a booking moves it to `approved`.
- Rejecting a booking moves it to `rejected`.
- Patient is notified in-app via polling.

### 5.2.5 Active booking lifecycle (CaregiverActiveBooking)
Requirements:
- After the patient confirms payment/method, booking becomes `confirmed`.
- Caregiver progresses through a linear status sequence:
  - `confirmed` → `on_the_way` → `arrived` → `service_started` → `service_completed`

Live tracking:
- When caregiver marks `on_the_way`, the app starts continuous GPS tracking via `expo-location`.
- Each GPS update pushes location to the server via the heartbeat endpoint.
- Tracking stops automatically when caregiver marks `arrived` (and remains stopped after `service_completed`).

End of service:
- After caregiver marks `service_completed`, the caregiver waits for the patient to confirm completion.

Review:
- After `completed_confirmed`, caregiver can submit a review for the patient.

### 5.2.6 Caregiver profile setup (SetProfile)
Requirements:
- Caregiver can set profile fields:
  - about, work experience, education, institution, license type.
  - at least one rate: hourly/daily/weekly/monthly.
- Profile is saved to the backend and used by patient booking pricing.

## 5.3 Admin journey (Admin Portal)

### 5.3.1 Admin login
Requirements:
- Admin logs in using the same `/auth/login` endpoint.
- Admin portal requires the returned `userType` to be `admin`.
- Token is stored as `adminToken` in localStorage.

### 5.3.2 Admin dashboard
Requirements:
- Admin portal loads stats from `/admin/dashboard/stats` and renders:
  - total users
  - active bookings
  - pending verifications
  - monthly revenue
  - flagged incidents
  - growth rate
- Also shows “recent activity” items returned by the API.

### 5.3.3 Verification Center (caregiver approval)
Requirements:
- Admin views pending caregiver signups from `/admin/users/pending`.
- Admin can open a user detail view that includes document URLs (CNIC/License/Experience docs).
- Admin can:
  - Approve user: `/admin/users/approve/:userId`
  - Reject user with reason: `/admin/users/reject/:userId` (requires a text reason)

### 5.3.4 User management
Requirements:
- Admin can view all users from `/admin/users`.
- UI supports simple filtering by user type and client-side search.
- “View/Edit/Deactivate” buttons exist in UI but are not wired to server actions in the current implementation.

### 5.3.5 Booking management
Requirements:
- Admin can view all bookings from `/admin/bookings`.
- UI can filter bookings by status.

### 5.3.6 Payments and transactions
Requirements:
- Admin can view payment stats + transactions from `/admin/payments`.

### 5.3.7 Reviews moderation
Requirements:
- Admin can view reviews from `/admin/reviews`.
- UI includes “flag review” actions, but flagging is currently a UI placeholder (not wired).

### 5.3.8 Safety Monitoring / Analytics / Settings
Current state:
- These pages are present but use placeholder data and are not connected to backend endpoints.

## 6) API contracts (behavioral summary)
This section is intentionally behavioral (what the system guarantees), rather than listing every route.

### 6.1 Auth + OTP
- Registration creates a user and sends OTP to email.
- Login blocks access if:
  - user is not email-verified (requires OTP verification), or
  - caregiver is not admin-approved.
- Forgot/reset password is OTP-based.

### 6.2 Patient APIs
- Caregiver discovery supports approved/available caregivers.
- Booking creation:
  - requires authentication.
  - uses conflict detection by overlapping time window.
- Booking confirmation:
  - can be done via cash confirmation or via payment initiation.
- Nurse-location endpoint supports live tracking during on-the-way/arrived phases.

### 6.3 Caregiver APIs
- Heartbeat endpoint updates last activity and optional location.
- Accept/reject endpoints control whether a patient can proceed to payment.
- Status endpoint enforces a strict status transition order.
- Earnings endpoint aggregates completed bookings.

### 6.4 Admin APIs
- Approve/reject caregivers.
- Platform stats and operational tables (bookings, payments, reviews).

### 6.5 Payment APIs
- Mastercard payment initiation validates booking eligibility and processes the payment.
- A simulation mode may be used when merchant configuration is not present.

## 7) Booking lifecycle (state machine)

### 7.1 States
The booking model uses a status enum with the following practical lifecycle:
1. `pending` (patient requested; awaiting caregiver accept)
2. `approved` (caregiver accepted; awaiting patient payment confirmation)
3. `confirmed` (patient confirmed payment method / payment success)
4. `on_the_way` (caregiver traveling; live tracking active)
5. `arrived`
6. `service_started`
7. `service_completed` (caregiver finished; awaiting patient confirm)
8. `completed_confirmed` (patient confirmed completion)

Terminal/exception states:
- `rejected` (caregiver declined)
- `cancelled` (patient cancelled)

### 7.2 Transition rules (requirements)
- Only caregivers can accept/reject a `pending` booking.
- Only patients can confirm payment method and/or initiate card payment.
- Only caregivers can move from `confirmed` through `service_completed`.
- Only patients can confirm completion (`service_completed` → `completed_confirmed`).

## 8) Payments

### 8.1 Cash
- Patient confirms booking with `paymentMethod=cash` and `status=confirmed`.
- Service proceeds normally; payment collection is assumed offline.

### 8.2 Mastercard
- Patient enters card details and submits.
- Client enforces Mastercard-only cards.
- Server completes payment and marks booking as paid/confirmed when approved.

## 9) Location and live tracking

### 9.1 Caregiver discovery
- Caregiver location is updated via periodic heartbeats.
- Patient “nearby” features depend on this location being present and recent.

### 9.2 In-service tracking
- When caregiver status is `on_the_way`, caregiver app begins a GPS watch.
- Server exposes nurse location to the patient via a booking-scoped endpoint.
- Patient map UI polls frequently and re-centers to show both patient and caregiver.

## 10) Non-functional requirements (implied by implementation)

### 10.1 Availability and responsiveness
- Mobile UX relies on polling (3–5 second intervals) for near-real-time updates.

### 10.2 File handling
- Uploads are routed through Cloudinary.
- System restricts formats/sizes for uploaded files.

### 10.3 Reliability
- OTP emails are sent via Nodemailer; OTP tokens expire via TTL.

### 10.4 Security notes
- JWT-based auth is required on most routes.
- Admin routes require an admin token.

## 11) Known gaps / inconsistencies to be aware of
These are not “requirements”; they are implementation observations worth validating:
- Some server code references fields that may not exist consistently in the user schema (e.g., favorites, some 2FA fields).
- Some utilities suggest a queue-based email sender but appear to run synchronously and reference variables that may not be defined.
- Caregiver discovery logic is split between `User` and a separate caregiver model in places (potential legacy overlap).
- Admin Portal includes several pages (Safety/Analytics/Settings) that are placeholders and not connected to the backend.

---

## Appendix A — Where these behaviors live in the repo
- Server API: `Server/`
- Mobile app: `App/`
- Admin portal: `Admin Portal/`
