# Kobujoi CDF Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants

1. **Global Default Deny**: Any path not explicitly matched in `/databases/{database}/documents` is denied for both read and write.
2. **Strict PII Isolation**:
   - `/bursary_applications/{applicationId}`, `/application_documents/{docId}`, and `/users/{userId}` contain sensitive personal and household data (National ID, Birth Certificate numbers, household income, supporting documents).
   - Public (unauthenticated) users and non-owner students MUST NEVER be able to `get` or `list` another student's application, uploaded documents, or user profile.
   - Read access is strictly restricted to the owning student (`resource.data.applicantUid == request.auth.uid` or `userId == request.auth.uid`) or verified Staff/Admin (`isStaffOrAdmin()`).
3. **Self-Assigned Role Prevention**:
   - When a standard authenticated user creates `/users/{userId}`, `incoming().role` MUST equal `'student'`. Only `isAdmin()` can assign `'staff'` or `'admin'` roles.
   - Standard users updating `/users/{userId}` can ONLY modify `['fullName', 'phone', 'updatedAt']` and cannot escalate their `role`.
4. **Award & Financial Integrity**:
   - Standard students creating `/bursary_applications/{applicationId}` MUST initialize `amountAwardedKsh == 0` and `status in ['Draft', 'Submitted']`.
   - Students cannot self-approve applications or modify `amountAwardedKsh`, `paymentStatus`, or `paymentReference`.
   - Terminal/Approved applications (`status in ['Approved', 'Awarded', 'Allocated to School', 'Payment Processed', 'Completed']`) are locked from student modifications; only `isStaffOrAdmin()` can update them.
   - `/project_expenditures/{expenditureId}` can only be created, updated, or deleted by `isAdmin()`.
5. **Immutable Audit Trail**:
   - `/audit_logs/{logId}` documents can only be created with `actorUid == request.auth.uid` and `createdAt == request.time`. They can NEVER be updated or deleted (`allow update, delete: if false;`).
6. **Temporal & Schema Integrity**:
   - All `create` operations require `incoming().createdAt == request.time` (and `incoming().updatedAt == request.time` where applicable), plus `hasAll` and `hasOnly` key checks.
   - All `update` operations require `isValid[Entity](incoming())`, `incoming().createdAt == existing().createdAt`, `incoming().updatedAt == request.time`, and explicit `affectedKeys().hasOnly(...)` gates.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Privilege Escalation on Signup)**: User creates `/users/user_123` with `"role": "admin"`. -> **PERMISSION_DENIED**
2. **Payload 2 (Shadow Field Injection)**: User creates `/bursary_applications/app_1` with an extra field `"isVerifiedOverride": true`. -> **PERMISSION_DENIED**
3. **Payload 3 (Self-Awarded Bursary)**: Student creates `/bursary_applications/app_1` with `"amountAwardedKsh": 50000, "status": "Awarded"`. -> **PERMISSION_DENIED**
4. **Payload 4 (Horizontal PII Scraping)**: Student `user_A` attempts `get` or `list` on `/bursary_applications/app_B` belonging to `user_B`. -> **PERMISSION_DENIED**
5. **Payload 5 (Private Document Leak)**: Unauthenticated public user attempts `get` on `/application_documents/doc_1`. -> **PERMISSION_DENIED**
6. **Payload 6 (Terminal State Tampering)**: Student attempts to update `feeBalanceKsh` on an application whose status is already `'Awarded'`. -> **PERMISSION_DENIED**
7. **Payload 7 (ID Poisoning / Resource Exhaustion)**: Attacker attempts to create `/projects/bad$id!@#` or a string field exceeding `maxLength`. -> **PERMISSION_DENIED**
8. **Payload 8 (Spoofed Unverified Admin Email)**: Attacker with `email == 'thabitajeptoo004@gmail.com'` but `email_verified == false` attempts to approve a bursary or create a project expenditure. -> **PERMISSION_DENIED**
9. **Payload 9 (Unauthorized Financial Voucher)**: Ordinary student or unauthenticated user attempts to create `/project_expenditures/exp_99`. -> **PERMISSION_DENIED**
10. **Payload 10 (Audit Log Tampering)**: Administrator attempts to `update` or `delete` `/audit_logs/log_1` to erase an override record. -> **PERMISSION_DENIED**
11. **Payload 11 (Timestamp Forgery)**: User creates a bursary application with a backdated client timestamp `createdAt != request.time`. -> **PERMISSION_DENIED**
12. **Payload 12 (Identity Spoofing on Application)**: User `user_A` creates a bursary application with `applicantUid: "user_B"`. -> **PERMISSION_DENIED**
