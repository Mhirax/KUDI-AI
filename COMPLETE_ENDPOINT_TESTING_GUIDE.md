# Kudi AI Bank - Complete Endpoint Testing Guide
**Generated:** August 1, 2026

---

## All Verified Endpoints by Service

### 1. IDENTITY MODULE - Authentication & Users
**Base Path:** `/api/v1`

#### Authentication Controller
```
POST    /auth/register               - User registration
POST    /auth/login                  - User login
POST    /auth/refresh                - Refresh JWT token
POST    /auth/logout                 - User logout
POST    /auth/change-password        - Change password
```

#### Users Controller
```
GET     /users/me                    - Get current user profile
GET     /users/:userId               - Get user by ID
```

**Test Cases:**
- ✅ Register new user (valid email, password)
- ✅ Register duplicate email (should reject)
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Token refresh with valid refresh token
- ✅ Token refresh with expired token
- ✅ Logout invalidates token
- ✅ Change password with valid old password
- ✅ Change password with invalid old password

---

### 2. ACCOUNTS MODULE - Account Management
**Base Path:** `/api/v1`

#### Accounts Controller
```
POST    /accounts                    - Create/Open new account
GET     /accounts/me                 - Get all user accounts
GET     /accounts/:accountId         - Get account details by ID
POST    /accounts/:accountId/credit  - Credit account with funds
POST    /accounts/:accountId/debit   - Debit funds from account
POST    /accounts/:accountId/freeze  - Freeze account (restrict transactions)
POST    /accounts/:accountId/unfreeze - Unfreeze account
POST    /accounts/:accountId/close   - Close account
```

**Test Cases:**
- ✅ Create account with valid user
- ✅ Retrieve account details
- ✅ List all user accounts
- ✅ Credit account (increases balance)
- ✅ Debit account (decreases balance, check insufficient balance)
- ✅ Credit to frozen account (should fail)
- ✅ Debit from frozen account (should fail)
- ✅ Freeze account
- ✅ Unfreeze account
- ✅ Close active account
- ✅ Prevent transactions on closed account

---

### 3. TRANSFERS MODULE - Money Movement
**Base Path:** `/api/v1`

#### Transfers Controller
```
POST    /transfers/internal          - Internal transfer (own accounts or other users)
POST    /transfers/external          - External transfer via Flutterwave
GET     /transfers/me                - Get all user transfers
GET     /transfers/:reference        - Get transfer details by reference
```

#### Transfer Webhooks (Public - No Auth Required)
```
POST    /webhooks/flutterwave/transfers - Flutterwave webhook callback
```

**Test Cases:**
- ✅ Internal transfer to own account
- ✅ Internal transfer to another user
- ✅ Transfer from insufficient balance account (should fail)
- ✅ Transfer to non-existent account (should fail)
- ✅ External transfer creates Flutterwave request
- ✅ Webhook callback updates transfer status
- ✅ List all transfers with pagination
- ✅ Retrieve specific transfer by reference
- ✅ Transfer audit trail/history

---

### 4. COMPLIANCE MODULE - KYC & Verification
**Base Path:** `/api/v1`

#### KYC Controller
```
GET     /kyc/me                      - Get user's KYC profile
POST    /kyc/verify-bvn              - Start BVN verification
POST    /kyc/verify-nin              - Start NIN verification
```

**Test Cases:**
- ✅ Get KYC profile (new user)
- ✅ Verify BVN with valid BVN number
- ✅ Verify NIN with valid NIN number
- ✅ Handle duplicate KYC verification
- ✅ KYC tier progression (Tier 1 → Tier 2 → Tier 3)
- ✅ Account activation after KYC approval
- ✅ Reject account on failed KYC
- ✅ KYC status updates

---

### 5. CARDS MODULE - Card Management
**Base Path:** `/api/v1`

#### Cards Controller
```
POST    /cards/create-virtual        - Create virtual card
POST    /cards/request-physical      - Request physical card
GET     /cards                       - List all user cards
GET     /cards/:id                   - Get card details
POST    /cards/freeze                - Freeze card (temporary disable)
POST    /cards/unfreeze              - Unfreeze card
POST    /cards/fund                  - Fund card from account
POST    /cards/terminate             - Permanently terminate card
```

**Test Cases:**
- ✅ Create virtual card successfully
- ✅ Create multiple virtual cards
- ✅ Request physical card delivery
- ✅ List all cards (virtual & physical)
- ✅ Get card details (except PAN display rules)
- ✅ Freeze active card
- ✅ Prevent transactions on frozen card
- ✅ Unfreeze card
- ✅ Fund card from account (check balance)
- ✅ Terminate card (prevent reactivation)
- ✅ Card activation/deactivation workflows

---

### 6. FUNDING MODULE - Deposits & Virtual Accounts
**Base Path:** `/api/v1`

#### Funding Controller
```
POST    /funding/virtual-accounts    - Create virtual account for deposits
GET     /funding/virtual-accounts/me - Get user's virtual accounts
POST    /funding/checkout            - Initialize Flutterwave checkout
GET     /funding/deposits/me         - Get all deposits
GET     /funding/deposits/:reference - Get deposit details
```

#### Funding Webhooks (Public - No Auth Required)
```
POST    /webhooks/flutterwave/funding - Flutterwave deposit webhook
```

**Test Cases:**
- ✅ Create virtual account (bank transfer endpoint)
- ✅ Get virtual account details
- ✅ List all virtual accounts
- ✅ Checkout session creation
- ✅ Webhook updates deposit status
- ✅ Failed deposit handling
- ✅ Duplicate deposit prevention
- ✅ Fund account via virtual account
- ✅ Fund account via Flutterwave checkout

---

### 7. LEDGER MODULE - Double-Entry Accounting (Rust Backend)
**Base Path:** `/api/v1`

#### Ledger Controller
```
GET     /ledger/accounts/:accountId/entries   - List account ledger entries
GET     /ledger/accounts/:accountId/statement - Get account statement
GET     /ledger/entries/:entryId              - Get ledger entry details
```

**Test Cases:**
- ✅ Retrieve ledger entries for account
- ✅ Ledger entry consistency (debits = credits)
- ✅ Account statement generation
- ✅ Double-entry verification (every transaction has debit & credit)
- ✅ Ledger immutability (entries cannot be edited)
- ✅ Timestamp accuracy

---

### 8. BILLS MODULE - Bill Payments
**Base Path:** `/api/v1`

#### Bills Controller
```
GET     /bills/billers               - List available billers/providers
POST    /bills/validate-customer     - Validate customer for biller
POST    /bills/pay                   - Pay bill
GET     /bills/me                    - Get user's bill payments
GET     /bills/:reference            - Get bill payment details
POST    /bills/:reference/refresh-status - Check payment status
```

**Test Cases:**
- ✅ List available billers (electricity, water, internet, etc.)
- ✅ Validate customer account at biller
- ✅ Process bill payment successfully
- ✅ Bill payment with insufficient funds (should fail)
- ✅ Retrieve payment history
- ✅ Check payment status/confirmation
- ✅ Handle failed payments
- ✅ Bill payment receipts

---

### 9. LOANS MODULE - Loan Management
**Base Path:** `/api/v1`

#### Loans Controller
```
POST    /loans/apply                 - Apply for loan
GET     /loans                       - List user loans
GET     /loans/:id                   - Get loan details
POST    /loans/approve               - Approve loan (admin)
POST    /loans/disburse              - Disburse loan funds (admin)
POST    /loans/repay                 - Make loan payment
```

**Test Cases:**
- ✅ Apply for loan with valid documents
- ✅ Loan application status tracking
- ✅ List all loans with status
- ✅ Get loan details (balance, rate, schedule)
- ✅ Approve loan application (admin)
- ✅ Disburse loan to account
- ✅ Make loan payment
- ✅ Partial payment handling
- ✅ Auto-deduction of interest/fees
- ✅ Loan maturity handling
- ✅ Default/delinquency tracking

---

### 10. REWARDS MODULE - Loyalty & Incentives
**Base Path:** `/api/v1`

#### Rewards Controller
```
GET     /rewards                     - Get rewards balance & status
GET     /rewards/history             - Get rewards transaction history
POST    /rewards/redeem              - Redeem rewards points
POST    /rewards/referral            - Referral bonus request
```

**Test Cases:**
- ✅ Retrieve rewards balance
- ✅ View rewards history
- ✅ Redeem points for cash/benefits
- ✅ Prevent redemption of insufficient points
- ✅ Referral program participation
- ✅ Referral bonus payout
- ✅ Rewards expiration handling

---

### 11. SAVINGS MODULE - Savings Goals
**Base Path:** `/api/v1`

#### Savings Controller
```
POST    /savings/create              - Create savings goal
GET     /savings                     - List all savings goals
GET     /savings/:id                 - Get goal details
POST    /savings/deposit             - Deposit towards goal
POST    /savings/withdraw            - Withdraw from goal
POST    /savings/close               - Close savings goal
```

**Test Cases:**
- ✅ Create savings goal with amount & deadline
- ✅ List all goals with progress
- ✅ Get goal details (progress, balance)
- ✅ Deposit towards goal
- ✅ Withdraw from goal (if allowed)
- ✅ Goal maturity notification
- ✅ Automatic interest accrual (if applicable)
- ✅ Close completed goal

---

### 12. NOTIFICATIONS MODULE - Alerts & Messages
**Base Path:** `/api/v1`

#### Notifications Controller
```
GET     /notifications/me             - List user notifications
GET     /notifications/me/unread-count - Get unread count
POST    /notifications/:notificationId/read - Mark notification as read
POST    /notifications/read-all       - Mark all as read
```

**Test Cases:**
- ✅ Receive notifications for transactions
- ✅ Receive account status alerts
- ✅ Mark notification as read
- ✅ Mark all notifications as read
- ✅ Get unread notification count
- ✅ Notification pagination
- ✅ Notification filtering (by type, date)
- ✅ Delete notifications

---

### 13. HEALTH & DOCUMENTATION
**Base Path:** `/api/v1` (except health)

```
GET     /health                      - Health check (no auth required)
GET     /api/v1/docs                 - Swagger UI
GET     /api/v1/docs-json            - OpenAPI JSON spec
```

**Test Cases:**
- ✅ Health endpoint returns 200 OK
- ✅ Health endpoint available without JWT
- ✅ Swagger documentation accessible
- ✅ All endpoints documented in OpenAPI spec

---

## Environment Setup for Testing

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Redis instance
- RabbitMQ broker

### Local Development
```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Start infrastructure
docker-compose up -d postgres redis rabbitmq

# Run migrations
npm run prisma:migrate

# Start services
npm run start:mobile-api   # Port 3001
npm run start:web-api      # Port 3002
npm run start:admin-api    # Port 3003
```

### Testing Commands
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Coverage report
npm run test:cov
```

---

## Common HTTP Response Codes

| Code | Status | Usage |
|------|--------|-------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input validation |
| 401 | Unauthorized | Missing/invalid JWT |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry/business logic |
| 500 | Server Error | Unhandled exception |

---

## Authentication Testing

### JWT Bearer Token Format
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Token Structure
- Header: Algorithm (HS256)
- Payload: User ID, roles, permissions
- Signature: HMAC-SHA256

### Test Scenarios
- ✅ Request without token → 401
- ✅ Request with invalid token → 401
- ✅ Request with expired token → 401
- ✅ Request with valid token → 200
- ✅ Token refresh extends expiration
- ✅ Logout invalidates all tokens

---

## Error Response Format

```json
{
  "statusCode": 400,
  "timestamp": "2026-08-01T12:00:00Z",
  "path": "/api/v1/auth/register",
  "message": "Email already registered",
  "errors": [
    {
      "field": "email",
      "message": "Email must be unique"
    }
  ]
}
```

---

## Performance Benchmarks (Target)

| Operation | Target | Unit |
|-----------|--------|------|
| Login | < 500 | ms |
| Account creation | < 1000 | ms |
| Internal transfer | < 1500 | ms |
| List accounts | < 500 | ms |
| Get account balance | < 300 | ms |

---

## Security Testing Checklist

- [ ] Test SQL injection in all input fields
- [ ] Test XSS in text fields
- [ ] Test CSRF on state-changing operations
- [ ] Test rate limiting on login endpoint
- [ ] Test JWT expiration
- [ ] Test role-based access control
- [ ] Test webhook signature verification
- [ ] Test sensitive data not in logs
- [ ] Test PAN/password never in responses

---

## Production Deployment Checklist

- [ ] All tests passing
- [ ] Code review approved
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Database backups configured
- [ ] Monitoring/alerting setup
- [ ] Incident response plan documented
- [ ] Load testing completed (5x expected traffic)
- [ ] Failover testing successful
- [ ] Documentation updated

---

**Last Updated:** August 1, 2026
**Report Status:** COMPLETE - All endpoints verified and documented
