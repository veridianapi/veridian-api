# @veridian/sdk

Official TypeScript/JavaScript SDK for the [Veridian](https://veridian.io) Compliance-as-a-Service API.

## Installation

```bash
npm install @veridian/sdk
# or
pnpm add @veridian/sdk
```

## Quick start

```ts
import VeridianClient from '@veridian/sdk'

const veridian = new VeridianClient('your-api-key')

// Submit a verification
const result = await veridian.createVerification({
  documentFront: base64Image,
  selfie: base64Selfie,
  documentType: 'passport'
})

console.log(result.verificationId) // uuid

// Poll for result
const verification = await veridian.getVerification(result.verificationId)
console.log(verification.status)        // 'approved' | 'review' | 'rejected'
console.log(verification.riskScore)     // 0–100
console.log(verification.faceMatchScore) // 0.0–1.0
```

## Methods

### `createVerification(params)`

Submit a new identity verification request. Images are S3-uploaded and processed asynchronously.

```ts
const result = await veridian.createVerification({
  documentFront: string,      // base64 image (required)
  documentBack?: string,      // base64 image (optional)
  selfie: string,             // base64 image (required)
  documentType: 'passport' | 'driving_licence' | 'national_id',
  webhookUrl?: string,        // receives result when complete
  metadata?: Record<string, unknown>
})
// → { verificationId: string, status: 'pending' }
```

### `getVerification(id)`

Retrieve a verification by ID.

```ts
const v = await veridian.getVerification('uuid')
// → VerificationResult
```

`VerificationResult` fields:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Verification UUID |
| `status` | `'pending' \| 'approved' \| 'review' \| 'rejected'` | Current status |
| `riskScore` | `number \| null` | 0–100, higher = more risk |
| `faceMatchScore` | `number \| null` | 0.0–1.0 confidence |
| `sanctionsHit` | `boolean \| null` | OFAC SDN match found |
| `fullName` | `string \| null` | Extracted from document |
| `dateOfBirth` | `string \| null` | Extracted from document |
| `documentNumber` | `string \| null` | Extracted from document |
| `expiryDate` | `string \| null` | Extracted from document |
| `nationality` | `string \| null` | Extracted from document |
| `createdAt` | `string` | ISO timestamp |
| `processedAt` | `string \| null` | ISO timestamp, null while pending |

### `getSubscription()`

Get the current billing subscription.

```ts
const sub = await veridian.getSubscription()
// → { plan: string | null, status: string | null, nextBillingDate: string | null }
```

### `createCheckout(plan)`

Create a Paddle checkout session.

```ts
const { checkoutUrl } = await veridian.createCheckout('starter')
// Redirect user to checkoutUrl
```

Plans: `'starter' | 'growth' | 'scale'`

## Error handling

All methods throw `VeridianError` on non-2xx responses.

```ts
import VeridianClient, { VeridianError } from '@veridian/sdk'

try {
  const v = await veridian.getVerification('bad-id')
} catch (err) {
  if (err instanceof VeridianError) {
    console.log(err.statusCode) // 404
    console.log(err.message)    // 'Verification not found'
    console.log(err.code)       // status text or detail string
  }
}
```

## Custom base URL

```ts
const veridian = new VeridianClient('your-api-key', {
  baseUrl: 'http://localhost:3001'
})
```
