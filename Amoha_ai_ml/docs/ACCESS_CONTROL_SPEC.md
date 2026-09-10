# AMOHA Green AI Access Control Specification

## 1. Roles

Three primary roles are defined for the AMOHA system:

| Role | Description | Permissions |
|---|---|---|
| `caregiver` | Primary caregiver using the app | - View own analysis results<br>- Enter care log text<br>- View tags and suggestions<br>- Withdraw consent<br>- Access own offline payload |
| `authorized_staff` | Clinical or authorized support staff | - View analysis results for assigned users<br>- Modify caregiver defaults<br>- Access audit logs<br>- Review assistance probabilities |
| `admin` | System administrator | - User management<br>- Consent management<br>- System configuration<br>- Access all user data |

## 2. Authentication

- **Caregiver**: App-based authentication (e.g., OTP, PIN, or biometric).
- **Authorized staff**: Additional credential check (role-specific password or 2FA).
- **Admin**: Separate administrative interface with highest-level credentials.

All authentication tokens must have expiration and be refreshed periodically.

## 3. Authorization (Least Privilege)

- **Caregiver** may only view their own analysis results and offline payload.
- **Authorized staff** may view results for users in their assigned caseload, identified by opaque user IDs.
- **Admin** may view all data but must log all access events.

## 4. Tenant/User Scoping

- Each analysis result is scoped to a user/tenant identified by an opaque ID.
- Cross-tenant data access is prohibited without explicit admin authorization.
- User IDs must not contain personally identifiable information (no names, phone numbers, etc. in the ID itself).

## 5. Access Denial Behavior

- If a user does not have permission to view analysis results, return HTTP 403 Forbidden.
- Audit log entry must be created for the access denial attempt.
- The analysis function itself must not reveal information to unauthorized callers.

## 6. Test Cases

1. Caregiver can view their own analysis: **PASS**
2. Caregiver cannot view another user's analysis: **PASS** (403 Forbidden)
3. Authorized staff can view assigned user results: **PASS**
4. Admin access is logged: **PASS**
5. Unauthenticated access to /analyze returns 401 Unauthorized: **PASS**