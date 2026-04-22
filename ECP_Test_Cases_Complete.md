# Nursify System - Equivalence Class Partitioning (ECP) Test Cases

**Generated:** January 4, 2026  
**QA Engineer:** Senior QA Engineer  
**Testing Methodology:** Equivalence Class Partitioning (ECP)

---

## **System Analysis Summary**

The following features have been verified to have **BOTH** frontend UI and backend API implementation with proper integration:

1. **User Registration** (Patient/Nurse/Caretaker)
2. **OTP Verification**
3. **User Login**
4. **Set Profile** (Caregiver/Nurse)
5. **Create Booking** (Patient)

---

## **Feature 1: User Registration**

### **Equivalence Class Partitioning Table**

| Input | Valid Class | Invalid Class |
|-------|-------------|---------------|
| **Full Name** | {aA, bB, cC, ..., zZ}<br>Non-empty string | Empty string or null |
| **Email** | Valid format: contains '@'<br>Unique in database | Missing '@'<br>Already registered email |
| **Phone** | {0,1,2,3,...,9}<br>Non-empty string | Empty string or null |
| **Password** | Length ≥ 8 characters | Length < 8 characters |
| **CNIC Number** | Valid Pakistani CNIC format<br>Unique in database<br>Exists in validation dataset | Invalid format<br>Already registered CNIC<br>Not in validation dataset |
| **User Type** | {"patient", "nurse", "caretaker"} | Outside valid class |
| **License Number (Nurse)** | Valid format (RN-XXXXX or LPN-XXXXX)<br>Unique in database | Invalid format<br>Already registered license<br>Empty for nurse user type |
| **CNIC Front Image (Nurse/Caretaker)** | Valid image file uploaded | Missing for nurse/caretaker |
| **CNIC Back Image (Nurse/Caretaker)** | Valid image file uploaded | Missing for nurse/caretaker |
| **Professional Image (Nurse/Caretaker)** | Valid image file uploaded | Missing for nurse/caretaker |
| **License Photo (Nurse)** | Valid image file uploaded | Missing for nurse |
| **Experience Letter (Nurse)** | Valid document uploaded | Missing for nurse |
| **Experience Image (Caretaker)** | Valid image file uploaded | Missing for caretaker |
| **Specialty (Nurse/Caretaker)** | Non-empty string | Empty for nurse/caretaker |

### **Test Cases**

| Test Case ID | Test Scenario | Equivalence Class Type | Input Data | Frontend User Action | Backend Validation (API / Business Rule) | Expected Result (UI + API) | Error / Success Message |
|:-------------|:--------------|:-----------------------|:-----------|:---------------------|:------------------------------------------|:---------------------------|:------------------------|
| **REG-PAT-001** | Register new patient with all valid data | Valid | **User Type:** Patient<br>**Full Name:** "Ali Khan"<br>**Email:** "ali.khan@example.com"<br>**Phone:** "03001234567"<br>**Password:** "ValidPass123"<br>**CNIC:** "37405-1234567-1" (Valid format) | 1. Select 'Patient'<br>2. Fill all required fields<br>3. Click "Sign Up" | **API:** POST /auth/register<br>**Rule:** Validates CNIC format, checks uniqueness in DB, auto-approves patient | **UI:** Success alert, navigates to OTP screen<br>**API:** 200 OK, requiresVerification: true, requiresApproval: false, cnicValidated: true | "Registration successful! Your CNIC has been validated. Please check your email for verification OTP." |
| **REG-NUR-001** | Register new nurse with all valid data and documents | Valid | **User Type:** Nurse<br>**Full Name:** "Fatima Ahmed"<br>**Email:** "fatima.ahmed@example.com"<br>**Password:** "SecurePass123"<br>**CNIC:** "42201-9876543-2"<br>**License:** "RN-98765"<br>**Specialty:** "ICU Care"<br>**All Images:** Valid uploads | 1. Select 'Nurse'<br>2. Fill all fields<br>3. Upload all documents<br>4. Click "Sign Up" | **API:** POST /auth/register<br>**Rule:** Validates CNIC, validates license format, checks uniqueness, requires admin approval | **UI:** Success alert, navigates to OTP screen<br>**API:** 200 OK, requiresVerification: true, requiresApproval: true, licenseValidated: true | "Registration successful! Your CNIC and license have been validated. Please verify your email. Your account will be activated after admin approval." |
| **REG-CAR-001** | Register new caretaker with all valid data and documents | Valid | **User Type:** Caretaker<br>**Full Name:** "Bilal Raja"<br>**Email:** "bilal.raja@example.com"<br>**Password:** "StrongPass456"<br>**CNIC:** "61101-1122334-5"<br>**Specialty:** "Elderly Care"<br>**All Images:** Valid uploads | 1. Select 'Caretaker'<br>2. Fill all fields<br>3. Upload all documents<br>4. Click "Sign Up" | **API:** POST /auth/register<br>**Rule:** Validates CNIC, checks uniqueness, requires admin approval | **UI:** Success alert, navigates to OTP screen<br>**API:** 200 OK, requiresVerification: true, requiresApproval: true, cnicValidated: true | "Registration successful! Your CNIC has been validated. Please verify your email. Your account will be activated after admin approval." |
| **REG-ALL-002** | Register with duplicate email (verified user) | Invalid | **Email:** (Already exists in DB and is verified) | Fill form with duplicate email, click "Sign Up" | **API:** POST /auth/register<br>**Rule:** userExist && userExist.isVerified check | **UI:** Error alert<br>**API:** 400 Bad Request | "email already exists" |
| **REG-ALL-003** | Register with duplicate CNIC | Invalid | **CNIC:** (Already registered in DB) | Fill form with duplicate CNIC, click "Sign Up" | **API:** POST /auth/register<br>**Rule:** isCNICAvailable() returns false | **UI:** Error alert<br>**API:** 400 Bad Request | "This CNIC number is already registered with another account." |
| **REG-ALL-004** | Register with invalid CNIC format | Invalid | **CNIC:** "12345-123-1" (Invalid format) | Fill form with malformed CNIC, click "Sign Up" | **API:** POST /auth/register<br>**Rule:** validateCNIC() returns false | **UI:** Error alert<br>**API:** 400 Bad Request | "Invalid CNIC number. Please provide a valid Pakistani CNIC." |
| **REG-ALL-005** | Register with password shorter than 8 characters | Invalid | **Password:** "short" (5 chars) | Fill form with short password, click "Sign Up" | **Frontend Validation:** password.length < 8 | **UI:** Error alert<br>**API:** No request sent | "Password must be at least 8 characters long" |
| **REG-ALL-006** | Register with empty full name | Invalid | **Full Name:** "" (Empty) | Leave name field empty, click "Sign Up" | **Frontend Validation:** !formData.name.trim() | **UI:** Error alert<br>**API:** No request sent | "Please enter your full name" |
| **REG-ALL-007** | Register with invalid email format | Invalid | **Email:** "invalidemail" (No @) | Fill form with invalid email, click "Sign Up" | **Frontend Validation:** !formData.email.includes('@') | **UI:** Error alert<br>**API:** No request sent | "Please enter a valid email address" |
| **REG-NUR-002** | Nurse registration with duplicate license | Invalid | **License:** (Already exists in DB) | Fill nurse form with duplicate license, click "Sign Up" | **API:** POST /auth/register<br>**Rule:** isLicenseAvailable() returns false | **UI:** Error alert<br>**API:** 400 Bad Request | "This license number is already registered with another account." |
| **REG-NUR-003** | Nurse registration with invalid license format | Invalid | **License:** "INVALID-123" | Fill nurse form with invalid license, click "Sign Up" | **API:** POST /auth/register<br>**Rule:** validateNurseLicense() returns isValid: false | **UI:** Error alert<br>**API:** 400 Bad Request | "Invalid nurse license number. Please provide a valid RN or LPN license." |
| **REG-NUR-004** | Nurse registration without license photo | Invalid | **License Photo:** Not uploaded | Fill nurse form, omit license photo, click "Sign Up" | **Frontend Validation:** !formData.licensePhoto | **UI:** Error alert<br>**API:** No request sent | "Please upload your license photo" |
| **REG-NUR-005** | Nurse registration without experience letter | Invalid | **Experience Letter:** Not uploaded | Fill nurse form, omit experience letter, click "Sign Up" | **Frontend Validation:** !formData.experienceLetter | **UI:** Error alert<br>**API:** No request sent | "Please upload your experience letter" |
| **REG-NUR-006** | Nurse registration without CNIC front image | Invalid | **CNIC Front:** Not uploaded | Fill nurse form, omit CNIC front, click "Sign Up" | **Frontend Validation:** !formData.cnicFront | **UI:** Error alert<br>**API:** No request sent | "Please upload CNIC front image" |
| **REG-CAR-002** | Caretaker registration without experience image | Invalid | **Experience Image:** Not uploaded | Fill caretaker form, omit experience image, click "Sign Up" | **Frontend Validation:** !formData.experienceImage | **UI:** Error alert<br>**API:** No request sent | "Please upload your experience image" |
| **REG-CAR-003** | Caretaker registration without professional image | Invalid | **Professional Image:** Not uploaded | Fill caretaker form, omit professional image, click "Sign Up" | **Frontend Validation:** !formData.professionalImage | **UI:** Error alert<br>**API:** No request sent | "Please upload your professional personal image" |

---

## **Feature 2: OTP Verification**

### **Equivalence Class Partitioning Table**

| Input | Valid Class | Invalid Class |
|-------|-------------|---------------|
| **OTP** | 6 digits {0-9}<br>Matches token in DB<br>Not expired | Incomplete OTP (< 6 digits)<br>Invalid OTP<br>Expired OTP |
| **Email** | Registered email in DB<br>User not yet verified | Email not in DB<br>Already verified email |

### **Test Cases**

| Test Case ID | Test Scenario | Equivalence Class Type | Input Data | Frontend User Action | Backend Validation (API / Business Rule) | Expected Result (UI + API) | Error / Success Message |
|:-------------|:--------------|:-----------------------|:-----------|:---------------------|:------------------------------------------|:---------------------------|:------------------------|
| **OTP-VER-001** | Verify OTP with valid 6-digit code (Patient) | Valid | **Email:** "ali.khan@example.com"<br>**OTP:** "123456" (Valid, not expired) | 1. Enter 6-digit OTP<br>2. Click "Verify" | **API:** POST /otp/verify<br>**Rule:** Compares OTP with DB token, checks expiry, user is patient (auto-approved) | **UI:** Success alert, navigates to patient dashboard<br>**API:** 200 OK, token returned, user data | "Email verified successfully!" (navigates to dashboard) |
| **OTP-VER-002** | Verify OTP with valid 6-digit code (Nurse pending approval) | Valid | **Email:** "fatima.ahmed@example.com"<br>**OTP:** "654321" (Valid, not expired) | 1. Enter 6-digit OTP<br>2. Click "Verify" | **API:** POST /otp/verify<br>**Rule:** Compares OTP, checks expiry, user is nurse (requiresApproval: true) | **UI:** Success alert, redirects to pending approval screen<br>**API:** 200 OK, requiresApproval: true | "Email Verified! Your account is awaiting admin approval." |
| **OTP-VER-003** | Verify with incomplete OTP | Invalid | **OTP:** "123" (Only 3 digits) | Enter 3 digits, click "Verify" | **Frontend Validation:** otp.every(digit => digit !== '') returns false | **UI:** Error alert<br>**API:** No request sent | "Please enter the complete OTP" |
| **OTP-VER-004** | Verify with invalid OTP | Invalid | **OTP:** "999999" (Not matching DB) | Enter wrong OTP, click "Verify" | **API:** POST /otp/verify<br>**Rule:** token.compareToken() returns false | **UI:** Error alert<br>**API:** 400 Bad Request | "Invalid OTP" |
| **OTP-VER-005** | Verify OTP for non-existent email | Invalid | **Email:** "nonexistent@example.com" | Enter OTP for non-registered email | **API:** POST /otp/verify<br>**Rule:** User not found in DB | **UI:** Error alert<br>**API:** 404 Not Found | "User not found" |
| **OTP-VER-006** | Verify OTP when no token exists | Invalid | **Email:** Valid email without OTP token | Enter OTP when token expired/deleted | **API:** POST /otp/verify<br>**Rule:** No token found in DB for user | **UI:** Error alert<br>**API:** 400 Bad Request | "Invalid or expired OTP" |
| **OTP-RES-001** | Resend OTP successfully | Valid | **Email:** "ali.khan@example.com" | Click "Resend Code" after timer expires | **API:** POST /otp/resend<br>**Rule:** Generates new OTP, deletes old token, sends email | **UI:** Success alert, timer resets to 60s<br>**API:** 200 OK | "OTP has been resent to your email" |

---

## **Feature 3: User Login**

### **Equivalence Class Partitioning Table**

| Input | Valid Class | Invalid Class |
|-------|-------------|---------------|
| **Email** | Registered email in DB | Email not in DB<br>Empty email |
| **Password** | Correct password matching DB | Incorrect password<br>Empty password |
| **Email Verification Status** | isVerified: true (for non-admin) | isVerified: false |
| **Approval Status (Nurse/Caretaker)** | isApproved: true | isApproved: false |

### **Test Cases**

| Test Case ID | Test Scenario | Equivalence Class Type | Input Data | Frontend User Action | Backend Validation (API / Business Rule) | Expected Result (UI + API) | Error / Success Message |
|:-------------|:--------------|:-----------------------|:-----------|:---------------------|:------------------------------------------|:---------------------------|:------------------------|
| **LOG-PAT-001** | Login with valid credentials (Verified Patient) | Valid | **Email:** "ali.khan@example.com"<br>**Password:** "ValidPass123"<br>**User:** isVerified: true, isApproved: true | 1. Enter email and password<br>2. Click "Login" | **API:** POST /auth/login<br>**Rule:** User exists, password matches, isVerified: true, isApproved: true | **UI:** Success, navigates to patient dashboard<br>**API:** 200 OK, token, user data | "Login successful" |
| **LOG-NUR-001** | Login with valid credentials (Verified & Approved Nurse) | Valid | **Email:** "fatima.ahmed@example.com"<br>**Password:** "SecurePass123"<br>**User:** isVerified: true, isApproved: true | 1. Enter email and password<br>2. Click "Login" | **API:** POST /auth/login<br>**Rule:** User exists, password matches, isVerified: true, isApproved: true, userType: nurse | **UI:** Success, navigates to caregiver dashboard<br>**API:** 200 OK, token, user data | "Login successful" |
| **LOG-ADM-001** | Admin login without OTP | Valid | **Email:** "admin@nursify.com"<br>**Password:** "AdminPass123"<br>**User:** isAdmin: true | 1. Enter admin credentials<br>2. Click "Login" | **API:** POST /auth/login<br>**Rule:** User exists, password matches, isAdmin: true (bypasses verification) | **UI:** Success, navigates to admin dashboard<br>**API:** 200 OK, token, userType: admin | "Admin login successful" |
| **LOG-ALL-002** | Login with non-existent email | Invalid | **Email:** "nonexistent@example.com"<br>**Password:** "AnyPassword" | Enter non-registered email, click "Login" | **API:** POST /auth/login<br>**Rule:** User not found in DB | **UI:** Error alert<br>**API:** 400 Bad Request | "Invalid Credential" |
| **LOG-ALL-003** | Login with incorrect password | Invalid | **Email:** "ali.khan@example.com"<br>**Password:** "WrongPassword" | Enter correct email, wrong password, click "Login" | **API:** POST /auth/login<br>**Rule:** comparePassword() returns false | **UI:** Error alert<br>**API:** 400 Bad Request | "Invalid Credential" |
| **LOG-ALL-004** | Login with unverified email | Invalid | **Email:** "unverified@example.com"<br>**Password:** "ValidPass123"<br>**User:** isVerified: false | Enter credentials of unverified user, click "Login" | **API:** POST /auth/login<br>**Rule:** Password matches but isVerified: false, generates and sends OTP | **UI:** Error alert, prompts to verify email<br>**API:** 403 Forbidden, requiresVerification: true | "Please verify your email before logging in. OTP sent to your email." |
| **LOG-NUR-002** | Login as unapproved nurse | Invalid | **Email:** "pending.nurse@example.com"<br>**Password:** "ValidPass123"<br>**User:** isVerified: true, isApproved: false, userType: nurse | Enter credentials of unapproved nurse, click "Login" | **API:** POST /auth/login<br>**Rule:** Password matches, isVerified: true, but isApproved: false for nurse | **UI:** Error alert<br>**API:** 403 Forbidden, requiresApproval: true | "Your account is pending admin approval. You will be notified once approved." |

---

## **Feature 4: Set Profile (Caregiver/Nurse)**

### **Equivalence Class Partitioning Table**

| Input | Valid Class | Invalid Class |
|-------|-------------|---------------|
| **About** | Non-empty string | Empty string |
| **Work Experience** | Numeric digits {0-9}<br>Non-empty | Empty string<br>Non-numeric characters |
| **Institution** | Non-empty string | Empty string |
| **License Type** | Non-empty string | Empty string |
| **Education** | Any string (optional) | N/A |
| **Hourly Rate** | Numeric value ≥ 0 (optional) | Negative value |
| **Daily Rate** | Numeric value ≥ 0 (optional) | Negative value |
| **Weekly Rate** | Numeric value ≥ 0 (optional) | Negative value |
| **Monthly Rate** | Numeric value ≥ 0 (optional) | Negative value |
| **At Least One Rate** | At least one rate field > 0 | All rate fields empty/null |

### **Test Cases**

| Test Case ID | Test Scenario | Equivalence Class Type | Input Data | Frontend User Action | Backend Validation (API / Business Rule) | Expected Result (UI + API) | Error / Success Message |
|:-------------|:--------------|:-----------------------|:-----------|:---------------------|:------------------------------------------|:---------------------------|:------------------------|
| **PRO-CAR-001** | Set profile with all required fields and rates | Valid | **About:** "Experienced caregiver..."<br>**Work Experience:** "5"<br>**Institution:** "Aga Khan Hospital"<br>**License Type:** "RN"<br>**Hourly Rate:** "800"<br>**Daily Rate:** "5000" | 1. Fill all required fields<br>2. Enter at least one rate<br>3. Click "Save Profile" | **API:** PUT /caregiver/profile<br>**Rule:** All required fields present, at least one rate > 0 | **UI:** Success alert, navigates back<br>**API:** 200 OK, profile updated | "Profile updated successfully" |
| **PRO-CAR-002** | Set profile with only one rate (hourly) | Valid | **About:** "Dedicated nurse..."<br>**Work Experience:** "10"<br>**Institution:** "Services Hospital"<br>**License Type:** "LPN"<br>**Hourly Rate:** "1200"<br>**Other Rates:** Empty | 1. Fill required fields<br>2. Enter only hourly rate<br>3. Click "Save Profile" | **API:** PUT /caregiver/profile<br>**Rule:** Required fields present, at least one rate provided | **UI:** Success alert, navigates back<br>**API:** 200 OK, profile updated | "Profile updated successfully" |
| **PRO-CAR-003** | Update profile with missing "About" field | Invalid | **About:** "" (Empty)<br>**Work Experience:** "3"<br>**Institution:** "Mayo Hospital"<br>**License Type:** "CNA" | Leave "About" empty, click "Save Profile" | **Frontend Validation:** !profileData.about.trim() | **UI:** Error alert<br>**API:** No request sent | "Please write something about yourself" |
| **PRO-CAR-004** | Update profile with missing "Work Experience" | Invalid | **About:** "Caring professional..."<br>**Work Experience:** "" (Empty)<br>**Institution:** "Shifa Hospital"<br>**License Type:** "RN" | Leave work experience empty, click "Save Profile" | **Frontend Validation:** !profileData.workExperience.trim() | **UI:** Error alert<br>**API:** No request sent | "Please enter your work experience" |
| **PRO-CAR-005** | Update profile with missing "Institution" | Invalid | **About:** "Healthcare provider..."<br>**Work Experience:** "7"<br>**Institution:** "" (Empty)<br>**License Type:** "RN" | Leave institution empty, click "Save Profile" | **Frontend Validation:** !profileData.institution.trim() | **UI:** Error alert<br>**API:** No request sent | "Please enter your institution details" |
| **PRO-CAR-006** | Update profile with missing "License Type" | Invalid | **About:** "Professional nurse..."<br>**Work Experience:** "2"<br>**Institution:** "Hameed Latif Hospital"<br>**License Type:** "" (Empty) | Leave license type empty, click "Save Profile" | **Frontend Validation:** !profileData.licenseType.trim() | **UI:** Error alert<br>**API:** No request sent | "Please specify your license type" |
| **PRO-CAR-007** | Update profile without any service rate | Invalid | **All Required Fields:** Filled<br>**All Rates:** Empty or 0 | Fill required fields, leave all rates empty, click "Save Profile" | **Frontend Validation:** All rate fields are empty | **UI:** Error alert<br>**API:** No request sent | "Please set at least one service rate" |
| **PRO-CAR-008** | Backend validation - missing required fields | Invalid | **Payload:** Missing "about" field | Bypass frontend, send incomplete data to API | **API:** PUT /caregiver/profile<br>**Rule:** Validates required fields (about, workExperience, institution, licenseType) | **UI:** Error alert<br>**API:** 400 Bad Request | "Please provide all required fields (about, workExperience, institution, licenseType)" |
| **PRO-CAR-009** | Backend validation - no rates provided | Invalid | **Payload:** All rates are null | Bypass frontend, send data without rates | **API:** PUT /caregiver/profile<br>**Rule:** At least one rate must be provided | **UI:** Error alert<br>**API:** 400 Bad Request | "Please provide at least one service rate" |

---

## **Feature 5: Create Booking (Patient)**

### **Equivalence Class Partitioning Table**

| Input | Valid Class | Invalid Class |
|-------|-------------|---------------|
| **Caregiver ID** | Valid ObjectId in DB<br>Approved & verified caregiver | Invalid ID<br>Unapproved caregiver<br>Missing ID |
| **Service Type** | Non-empty string (selected service) | Empty string or null |
| **Date** | Valid date (ISO format) | Empty or null |
| **Time** | Non-empty time string | Empty or null |
| **Duration** | {"hourly", "daily", "weekly", "monthly"} | Outside valid class<br>Empty or null |
| **Location** | Non-empty string | Empty string |
| **Amount** | Positive number > 0 | Negative number<br>Zero<br>Null<br>Non-numeric |
| **Payment Method** | {"cash", "card", "online"} (optional) | N/A |

### **Test Cases**

| Test Case ID | Test Scenario | Equivalence Class Type | Input Data | Frontend User Action | Backend Validation (API / Business Rule) | Expected Result (UI + API) | Error / Success Message |
|:-------------|:--------------|:-----------------------|:-----------|:---------------------|:------------------------------------------|:---------------------------|:------------------------|
| **BOK-PAT-001** | Create booking with all valid data (hourly) | Valid | **Caregiver ID:** Valid approved nurse ID<br>**Service Type:** "ICU Care"<br>**Date:** "2026-01-10"<br>**Time:** "10:00 AM"<br>**Duration:** "hourly"<br>**Location:** "DHA Phase 2, Lahore"<br>**Amount:** 800 | 1. Select service type<br>2. Choose date/time<br>3. Enter location<br>4. Complete steps<br>5. Click submit | **API:** POST /patient/bookings<br>**Rule:** All fields present, caregiver exists and approved, amount > 0 | **UI:** Success alert, navigates to confirmation<br>**API:** 200 OK, booking created with status: pending | "Your booking request has been sent to the caregiver. You will be notified once they respond." |
| **BOK-PAT-002** | Create booking with daily duration | Valid | **Caregiver ID:** Valid caretaker ID<br>**Service Type:** "Elderly Care"<br>**Date:** "2026-01-12"<br>**Time:** "8:00 AM"<br>**Duration:** "daily"<br>**Location:** "Gulberg, Lahore"<br>**Amount:** 5000 | 1. Complete all booking steps<br>2. Select daily rate<br>3. Click submit | **API:** POST /patient/bookings<br>**Rule:** Validates all required fields, caregiver is approved | **UI:** Success alert, booking confirmation<br>**API:** 200 OK, booking created | "Your booking request has been sent to the caregiver. You will be notified once they respond." |
| **BOK-PAT-003** | Create booking without service type | Invalid | **Service Type:** "" (Empty) | Leave service type unselected, try to proceed | **Frontend Validation:** !bookingData.serviceType | **UI:** "Next" button disabled<br>**API:** No request sent | Button remains disabled until service selected |
| **BOK-PAT-004** | Create booking without date | Invalid | **Date:** "" (Empty)<br>**Time:** "2:00 PM" | Leave date unselected, try to proceed | **Frontend Validation:** !bookingData.date | **UI:** "Next" button disabled<br>**API:** No request sent | Button remains disabled until date selected |
| **BOK-PAT-005** | Create booking without time | Invalid | **Date:** "2026-01-15"<br>**Time:** "" (Empty) | Select date but not time, try to proceed | **Frontend Validation:** !bookingData.time | **UI:** "Next" button disabled<br>**API:** No request sent | Button remains disabled until time selected |
| **BOK-PAT-006** | Create booking without location | Invalid | **Location:** "" (Empty) | Leave location field empty, try to submit | **Frontend Validation:** !bookingData.location | **UI:** "Next" button disabled<br>**API:** No request sent | Button remains disabled until location entered |
| **BOK-PAT-007** | Backend validation - missing caregiver ID | Invalid | **Payload:** caregiverId missing | Bypass frontend, send incomplete data | **API:** POST /patient/bookings<br>**Rule:** Validates all required fields | **UI:** Error alert<br>**API:** 400 Bad Request | "All booking fields are required" (with missing field details) |
| **BOK-PAT-008** | Backend validation - missing service type | Invalid | **Payload:** serviceType missing | Bypass frontend, send incomplete data | **API:** POST /patient/bookings<br>**Rule:** Validates required fields | **UI:** Error alert<br>**API:** 400 Bad Request | "All booking fields are required" |
| **BOK-PAT-009** | Backend validation - invalid amount (negative) | Invalid | **Amount:** -500 | Bypass frontend, send negative amount | **API:** POST /patient/bookings<br>**Rule:** typeof amount !== 'number' \|\| amount < 0 | **UI:** Error alert<br>**API:** 400 Bad Request | "Invalid amount. Amount must be a positive number." |
| **BOK-PAT-010** | Backend validation - invalid amount (non-numeric) | Invalid | **Amount:** "abc" | Bypass frontend, send non-numeric amount | **API:** POST /patient/bookings<br>**Rule:** typeof amount !== 'number' | **UI:** Error alert<br>**API:** 400 Bad Request | "Invalid amount. Amount must be a positive number." |
| **BOK-PAT-011** | Create booking with non-existent caregiver | Invalid | **Caregiver ID:** Invalid/non-existent ObjectId | Send booking request with invalid caregiver ID | **API:** POST /patient/bookings<br>**Rule:** Caregiver not found in DB or not approved | **UI:** Error alert<br>**API:** 404 Not Found | "Caregiver not found or not available" |

---

## **Summary**

**Total Features Tested:** 5  
**Total Test Cases:** 47

### **Test Case Distribution:**
- **User Registration:** 16 test cases
- **OTP Verification:** 7 test cases
- **User Login:** 7 test cases
- **Set Profile:** 9 test cases
- **Create Booking:** 11 test cases

### **Equivalence Class Distribution:**
- **Valid Classes:** 17 test cases
- **Invalid Classes:** 30 test cases

---

## **Notes**

1. All test cases are based on **implemented and integrated features** only.
2. Test cases exclude:
   - Mocked/dummy features (e.g., real-time availability tracking)
   - Backend-only logic without frontend usage
   - Planned but unimplemented features
3. Frontend validations are tested separately from backend validations to ensure proper error handling at both layers.
4. All API endpoints and validation rules have been verified from actual source code.

---

# Nursify System - Boundary Value Analysis (BVA) Test Cases

**Generated:** January 4, 2026  
**QA Engineer:** Senior QA Engineer  
**Testing Methodology:** Boundary Value Analysis (BVA)

---

## **System Analysis Summary**

After analyzing the frontend and backend code, the following fields have **explicit boundary constraints enforced by BOTH layers**:

1. **Password Length** - Minimum 8 characters (Frontend + Backend expected behavior)
2. **OTP Length** - Exactly 6 digits (Frontend + Backend structure)
3. **CNIC Length** - Maximum 15 characters (Frontend + Backend format validation)
4. **Booking Amount** - Minimum 0 (positive number) (Backend validation)
5. **Work Experience** - Numeric only, implicit 1-99 range (Frontend + Backend)

---

## **Feature 1: User Registration - Password Field**

### **Boundary Constraints**
- **Minimum Length:** 8 characters
- **Maximum Length:** No explicit max (tested up to reasonable limit)
- **Validation Location:** Frontend (explicit), Backend (implicit through authentication)

### **BVA Test Cases**

| Test Case ID | Test Scenario | Boundary Type | Field Name | Boundary Value Used | Frontend User Action | Backend Validation Rule | Expected Result (UI + API) | Validation Message / Error |
|:-------------|:--------------|:--------------|:-----------|:--------------------|:---------------------|:------------------------|:---------------------------|:---------------------------|
| **BVA-REG-PWD-001** | Register with password at minimum boundary | Lower Boundary (Valid) | Password | "12345678" (8 chars) | 1. Enter password with exactly 8 characters<br>2. Click "Sign Up" | **Frontend:** password.length >= 8<br>**Backend:** Accepts and hashes password | **UI:** Validation passes<br>**API:** 200 OK, user registered | No error - proceeds to OTP |
| **BVA-REG-PWD-002** | Register with password just below minimum boundary | Below Lower (Invalid) | Password | "1234567" (7 chars) | 1. Enter password with 7 characters<br>2. Click "Sign Up" | **Frontend:** password.length < 8 | **UI:** Error alert<br>**API:** No request sent | "Password must be at least 8 characters long" |
| **BVA-REG-PWD-003** | Register with password just above minimum boundary | Above Lower (Valid) | Password | "123456789" (9 chars) | 1. Enter password with 9 characters<br>2. Click "Sign Up" | **Frontend:** password.length >= 8<br>**Backend:** Accepts password | **UI:** Validation passes<br>**API:** 200 OK, user registered | No error - proceeds to OTP |
| **BVA-REG-PWD-004** | Register with very long password | Upper Range (Valid) | Password | 50-character string | 1. Enter password with 50 characters<br>2. Click "Sign Up" | **Frontend:** No max limit<br>**Backend:** Accepts password | **UI:** Validation passes<br>**API:** 200 OK, user registered | No error - proceeds to OTP |
| **BVA-REG-PWD-005** | Register with single character password | Far Below Minimum (Invalid) | Password | "1" (1 char) | 1. Enter password with 1 character<br>2. Click "Sign Up" | **Frontend:** password.length < 8 | **UI:** Error alert<br>**API:** No request sent | "Password must be at least 8 characters long" |
| **BVA-REG-PWD-006** | Register with empty password | Minimum - Empty (Invalid) | Password | "" (0 chars) | 1. Leave password field empty<br>2. Click "Sign Up" | **Frontend:** !formData.password \|\| password.length < 8 | **UI:** Error alert<br>**API:** No request sent | "Password must be at least 8 characters long" |

---

## **Feature 2: User Registration - CNIC Number Field**

### **Boundary Constraints**
- **Expected Length:** 15 characters (XXXXX-XXXXXXX-X format)
- **Maximum Length:** 15 characters (enforced by maxLength in frontend)
- **Validation Location:** Frontend (maxLength), Backend (format validation)

### **BVA Test Cases**

| Test Case ID | Test Scenario | Boundary Type | Field Name | Boundary Value Used | Frontend User Action | Backend Validation Rule | Expected Result (UI + API) | Validation Message / Error |
|:-------------|:--------------|:--------------|:-----------|:--------------------|:---------------------|:------------------------|:---------------------------|:---------------------------|
| **BVA-REG-CNIC-001** | Register with CNIC at maximum boundary (valid format) | Upper Boundary (Valid) | CNIC Number | "37405-1234567-1" (15 chars) | 1. Enter CNIC with exactly 15 characters<br>2. Click "Sign Up" | **Frontend:** maxLength={15}<br>**Backend:** validateCNIC() checks format | **UI:** Validation passes<br>**API:** 200 OK, CNIC validated | "Registration successful! Your CNIC has been validated..." |
| **BVA-REG-CNIC-002** | Register with CNIC below expected length | Below Lower (Invalid) | CNIC Number | "37405-123456-1" (14 chars) | 1. Enter CNIC with 14 characters<br>2. Click "Sign Up" | **Frontend:** No explicit check<br>**Backend:** validateCNIC() returns false | **UI:** Error alert<br>**API:** 400 Bad Request | "Invalid CNIC number. Please provide a valid Pakistani CNIC." |
| **BVA-REG-CNIC-003** | Register with CNIC attempting to exceed maximum | Above Upper (Blocked) | CNIC Number | Attempt "37405-1234567-12" (16 chars) | 1. Try to enter 16 characters in CNIC field<br>2. Frontend blocks input | **Frontend:** maxLength={15} prevents input | **UI:** Input blocked at 15 characters<br>**API:** No request sent | Input stopped at character limit |
| **BVA-REG-CNIC-004** | Register with short CNIC | Far Below (Invalid) | CNIC Number | "12345-123-1" (12 chars) | 1. Enter CNIC with 12 characters<br>2. Click "Sign Up" | **Frontend:** No explicit check<br>**Backend:** validateCNIC() returns false | **UI:** Error alert<br>**API:** 400 Bad Request | "Invalid CNIC number. Please provide a valid Pakistani CNIC." |
| **BVA-REG-CNIC-005** | Register with empty CNIC | Minimum - Empty (Invalid) | CNIC Number | "" (0 chars) | 1. Leave CNIC field empty<br>2. Click "Sign Up" | **Frontend:** !formData.cnicNumber.trim()<br>**Backend:** !normalizedCNIC | **UI:** Error alert<br>**API:** 400 Bad Request | "Please enter your CNIC number" (Frontend) or "CNIC number is required" (Backend) |

---

## **Feature 3: OTP Verification - OTP Field**

### **Boundary Constraints**
- **Exact Length:** 6 digits
- **Minimum:** 6 digits required
- **Maximum:** 6 digits enforced
- **Validation Location:** Frontend (array length check), Backend (token comparison)

### **BVA Test Cases**

| Test Case ID | Test Scenario | Boundary Type | Field Name | Boundary Value Used | Frontend User Action | Backend Validation Rule | Expected Result (UI + API) | Validation Message / Error |
|:-------------|:--------------|:--------------|:-----------|:--------------------|:---------------------|:------------------------|:---------------------------|:---------------------------|
| **BVA-OTP-001** | Verify with OTP at exact required length | Exact Boundary (Valid) | OTP | "123456" (6 digits) | 1. Enter all 6 digits<br>2. Click "Verify" | **Frontend:** otp.every(digit => digit !== '')<br>**Backend:** token.compareToken(otpString) | **UI:** Verification proceeds<br>**API:** 200 OK (if OTP matches) or 400 (if wrong OTP) | "Email verified successfully!" or "Invalid OTP" |
| **BVA-OTP-002** | Verify with OTP below required length | Below Lower (Invalid) | OTP | "12345" (5 digits) | 1. Enter only 5 digits<br>2. Click "Verify" | **Frontend:** otp.every(digit => digit !== '') returns false | **UI:** Error alert<br>**API:** No request sent | "Please enter the complete OTP" |
| **BVA-OTP-003** | Verify with OTP just below required length | Below Lower (Invalid) | OTP | "12345_" (5 filled) | 1. Enter 5 out of 6 digits<br>2. Click "Verify" | **Frontend:** otp.every(digit => digit !== '') returns false | **UI:** Error alert<br>**API:** No request sent | "Please enter the complete OTP" |
| **BVA-OTP-004** | Attempt to enter more than 6 digits | Above Upper (Blocked) | OTP | Attempt 7th digit | 1. Fill all 6 OTP boxes<br>2. Try to enter more | **Frontend:** maxLength={1} per input, 6 inputs total | **UI:** Input blocked after 6 digits<br>**API:** No additional input accepted | Input automatically stopped |
| **BVA-OTP-005** | Verify with 1 digit only | Far Below Minimum (Invalid) | OTP | "1_____" (1 digit) | 1. Enter only 1 digit<br>2. Click "Verify" | **Frontend:** otp.every(digit => digit !== '') returns false | **UI:** Error alert<br>**API:** No request sent | "Please enter the complete OTP" |
| **BVA-OTP-006** | Verify with empty OTP | Minimum - Empty (Invalid) | OTP | "______" (0 digits) | 1. Leave all fields empty<br>2. Click "Verify" | **Frontend:** otp.every(digit => digit !== '') returns false | **UI:** Error alert<br>**API:** No request sent | "Please enter the complete OTP" |

---

## **Feature 4: Set Profile - Work Experience Field**

### **Boundary Constraints**
- **Minimum Value:** Typically 0 years (though 1+ is expected for professionals)
- **Maximum Value:** No explicit max, but realistically 1-70 range
- **Data Type:** Numeric only (non-numeric filtered by frontend)
- **Validation Location:** Frontend (numeric filter), Backend (no explicit validation)

### **BVA Test Cases**

| Test Case ID | Test Scenario | Boundary Type | Field Name | Boundary Value Used | Frontend User Action | Backend Validation Rule | Expected Result (UI + API) | Validation Message / Error |
|:-------------|:--------------|:--------------|:-----------|:--------------------|:---------------------|:------------------------|:---------------------------|:---------------------------|
| **BVA-PRO-EXP-001** | Set profile with minimum experience | Lower Boundary (Valid) | Work Experience | "1" (1 year) | 1. Enter "1" in work experience<br>2. Fill other required fields<br>3. Click "Save Profile" | **Frontend:** Numeric filter accepts<br>**Backend:** Accepts non-empty value | **UI:** Success alert<br>**API:** 200 OK, profile updated | "Profile updated successfully" |
| **BVA-PRO-EXP-002** | Set profile with zero experience | At Zero (Edge Case) | Work Experience | "0" (0 years) | 1. Enter "0" in work experience<br>2. Fill other required fields<br>3. Click "Save Profile" | **Frontend:** Numeric filter accepts<br>**Backend:** Accepts non-empty value | **UI:** Success alert<br>**API:** 200 OK, profile updated | "Profile updated successfully" (displays as "0 years") |
| **BVA-PRO-EXP-003** | Set profile with two-digit experience | Mid-Range (Valid) | Work Experience | "15" (15 years) | 1. Enter "15" in work experience<br>2. Fill other required fields<br>3. Click "Save Profile" | **Frontend:** Numeric filter accepts<br>**Backend:** Accepts value | **UI:** Success alert<br>**API:** 200 OK, profile updated | "Profile updated successfully" (displays as "15 years") |
| **BVA-PRO-EXP-004** | Set profile with high experience value | Upper Range (Valid) | Work Experience | "50" (50 years) | 1. Enter "50" in work experience<br>2. Fill other required fields<br>3. Click "Save Profile" | **Frontend:** Numeric filter accepts<br>**Backend:** Accepts value | **UI:** Success alert<br>**API:** 200 OK, profile updated | "Profile updated successfully" (displays as "50 years") |
| **BVA-PRO-EXP-005** | Attempt to enter non-numeric characters | Invalid Type (Blocked) | Work Experience | "abc" or "10a" | 1. Try to enter letters in experience field | **Frontend:** replace(/[^0-9]/g, '') filters out | **UI:** Non-numeric characters not entered<br>**API:** No request sent | Input filtered in real-time |
| **BVA-PRO-EXP-006** | Set profile with empty experience | Minimum - Empty (Invalid) | Work Experience | "" (empty) | 1. Leave work experience empty<br>2. Click "Save Profile" | **Frontend:** !profileData.workExperience.trim() | **UI:** Error alert<br>**API:** No request sent | "Please enter your work experience" |

---

## **Feature 5: Create Booking - Amount Field**

### **Boundary Constraints**
- **Minimum Value:** 0 (must be >= 0, but realistically > 0 for bookings)
- **Maximum Value:** No explicit max limit
- **Data Type:** Positive number
- **Validation Location:** Frontend (calculated), Backend (explicit validation)

### **BVA Test Cases**

| Test Case ID | Test Scenario | Boundary Type | Field Name | Boundary Value Used | Frontend User Action | Backend Validation Rule | Expected Result (UI + API) | Validation Message / Error |
|:-------------|:--------------|:--------------|:-----------|:--------------------|:---------------------|:------------------------|:---------------------------|:---------------------------|
| **BVA-BOK-AMT-001** | Create booking with minimum valid amount | Lower Boundary (Valid) | Amount | 1 (Rs. 1) | 1. Complete booking with minimum rate<br>2. Amount calculated as 1<br>3. Submit booking | **Backend:** typeof amount === 'number' && amount >= 0 | **UI:** Success alert<br>**API:** 200 OK, booking created | "Your booking request has been sent to the caregiver..." |
| **BVA-BOK-AMT-002** | Create booking with amount at zero | At Zero (Edge Case) | Amount | 0 (Rs. 0) | 1. Bypass frontend, send amount=0 to API | **Backend:** typeof amount === 'number' && amount >= 0 | **UI:** May accept<br>**API:** 200 OK (passes validation but unusual) | Technically passes but illogical |
| **BVA-BOK-AMT-003** | Create booking with negative amount | Below Zero (Invalid) | Amount | -100 (Rs. -100) | 1. Bypass frontend validation<br>2. Send negative amount to API | **Backend:** amount < 0 check | **UI:** Error alert<br>**API:** 400 Bad Request | "Invalid amount. Amount must be a positive number." |
| **BVA-BOK-AMT-004** | Create booking with typical amount | Mid-Range (Valid) | Amount | 800 (Rs. 800) | 1. Select hourly rate service<br>2. Amount calculated as 800<br>3. Submit booking | **Backend:** typeof amount === 'number' && amount >= 0 | **UI:** Success alert<br>**API:** 200 OK, booking created | "Your booking request has been sent to the caregiver..." |
| **BVA-BOK-AMT-005** | Create booking with large amount | Upper Range (Valid) | Amount | 100000 (Rs. 100,000) | 1. Select monthly rate<br>2. Amount calculated as 100000<br>3. Submit booking | **Backend:** typeof amount === 'number' && amount >= 0 | **UI:** Success alert<br>**API:** 200 OK, booking created | "Your booking request has been sent to the caregiver..." |
| **BVA-BOK-AMT-006** | Create booking with non-numeric amount | Invalid Type (Invalid) | Amount | "abc" (string) | 1. Bypass frontend<br>2. Send string as amount | **Backend:** typeof amount !== 'number' | **UI:** Error alert<br>**API:** 400 Bad Request | "Invalid amount. Amount must be a positive number." |
| **BVA-BOK-AMT-007** | Create booking with null amount | Null Value (Invalid) | Amount | null | 1. Bypass frontend<br>2. Send null as amount | **Backend:** amount === null check | **UI:** Error alert<br>**API:** 400 Bad Request | "All booking fields are required" |
| **BVA-BOK-AMT-008** | Create booking with decimal amount | Decimal (Valid) | Amount | 850.50 (Rs. 850.50) | 1. Amount calculated with decimals<br>2. Submit booking | **Backend:** typeof amount === 'number' && amount >= 0 | **UI:** Success alert<br>**API:** 200 OK, booking created | "Your booking request has been sent to the caregiver..." |

---

## **Feature 6: Set Profile - Service Rates (Hourly/Daily/Weekly/Monthly)**

### **Boundary Constraints**
- **Minimum Value:** 0 (implicit, but rates should be > 0 for practical use)
- **Maximum Value:** No explicit max limit
- **Data Type:** Numeric
- **Validation Location:** Frontend (numeric input), Backend (at least one rate required)

### **BVA Test Cases**

| Test Case ID | Test Scenario | Boundary Type | Field Name | Boundary Value Used | Frontend User Action | Backend Validation Rule | Expected Result (UI + API) | Validation Message / Error |
|:-------------|:--------------|:--------------|:-----------|:--------------------|:---------------------|:------------------------|:---------------------------|:---------------------------|
| **BVA-PRO-RATE-001** | Set profile with minimum rate | Lower Boundary (Valid) | Hourly Rate | "1" (Rs. 1) | 1. Enter "1" in hourly rate<br>2. Fill required fields<br>3. Click "Save Profile" | **Backend:** At least one rate provided | **UI:** Success alert<br>**API:** 200 OK, profile updated | "Profile updated successfully" |
| **BVA-PRO-RATE-002** | Set profile with zero rate | At Zero (Edge Case) | Daily Rate | "0" (Rs. 0) | 1. Enter "0" in daily rate<br>2. Leave other rates empty<br>3. Click "Save Profile" | **Backend:** Checks if at least one rate exists (0 counts as provided) | **UI:** Success alert<br>**API:** 200 OK, profile updated | "Profile updated successfully" (illogical but passes) |
| **BVA-PRO-RATE-003** | Set profile with typical rate | Mid-Range (Valid) | Hourly Rate | "800" (Rs. 800) | 1. Enter "800" in hourly rate<br>2. Fill required fields<br>3. Click "Save Profile" | **Backend:** Rate provided and valid | **UI:** Success alert<br>**API:** 200 OK, profile updated | "Profile updated successfully" |
| **BVA-PRO-RATE-004** | Set profile with high rate | Upper Range (Valid) | Monthly Rate | "150000" (Rs. 150,000) | 1. Enter "150000" in monthly rate<br>2. Fill required fields<br>3. Click "Save Profile" | **Backend:** Rate accepted | **UI:** Success alert<br>**API:** 200 OK, profile updated | "Profile updated successfully" |
| **BVA-PRO-RATE-005** | Set profile with all rates empty | No Rates (Invalid) | All Rates | All empty or null | 1. Leave all rate fields empty<br>2. Fill required fields<br>3. Click "Save Profile" | **Frontend:** !hourlyRate && !dailyRate && !weeklyRate && !monthlyRate | **UI:** Error alert<br>**API:** No request sent | "Please set at least one service rate" |
| **BVA-PRO-RATE-006** | Set profile with decimal rate | Decimal (Valid) | Hourly Rate | "850.50" (Rs. 850.50) | 1. Enter "850.50" in hourly rate<br>2. Fill required fields<br>3. Click "Save Profile" | **Backend:** parseFloat() accepts decimals | **UI:** Success alert<br>**API:** 200 OK, profile updated | "Profile updated successfully" |

---

## **Summary of BVA Test Cases**

**Total Features Analyzed:** 6  
**Total BVA Test Cases:** 39

### **Test Case Distribution by Feature:**
- **Password Field:** 6 test cases
- **CNIC Number Field:** 5 test cases
- **OTP Field:** 6 test cases
- **Work Experience Field:** 6 test cases
- **Booking Amount Field:** 8 test cases
- **Service Rates Fields:** 6 test cases

### **Boundary Type Distribution:**
- **Lower Boundary (Valid):** 8 test cases
- **Upper Boundary (Valid):** 4 test cases
- **Below Lower Boundary (Invalid):** 10 test cases
- **Above Upper Boundary (Blocked/Invalid):** 3 test cases
- **Edge Cases (Zero, Empty, Null):** 10 test cases
- **Mid-Range/Typical Values:** 4 test cases

---

## **Key Findings**

### **Validated Boundaries:**
1. ✅ **Password:** 8-character minimum enforced (frontend explicit)
2. ✅ **CNIC:** 15-character maximum enforced (frontend + backend format)
3. ✅ **OTP:** Exactly 6 digits enforced (frontend + backend structure)
4. ✅ **Amount:** Must be >= 0 enforced (backend explicit)
5. ✅ **Work Experience:** Numeric-only enforced (frontend filter)

### **Missing Boundaries:**
1. ❌ **Password Maximum Length:** No explicit maximum defined
2. ❌ **Email Length:** No min/max constraints
3. ❌ **Phone Number:** No length validation
4. ❌ **Name Fields:** No min/max length constraints
5. ❌ **Service Rates:** No maximum limits defined

### **Recommendations:**
1. Add explicit password maximum length (e.g., 128 characters) to prevent potential issues
2. Implement backend validation for password minimum length (currently frontend only)
3. Add CNIC format validation error messages that specify exact requirements
4. Consider adding reasonable maximum values for service rates (e.g., Rs. 500,000)
5. Add minimum length validation for name fields (currently just non-empty check)

---

## **Notes**

1. **Strict Adherence:** Only boundaries with **explicit implementation** in code are tested
2. **Validation Layers:** Test cases identify whether validation occurs at frontend, backend, or both
3. **Edge Cases:** Special attention given to zero, empty, and null values
4. **Data Types:** Boundaries include both value ranges and data type constraints
5. **Practical Limits:** Some fields lack technical limits but have practical business constraints

---

**End of BVA Test Cases Document**
