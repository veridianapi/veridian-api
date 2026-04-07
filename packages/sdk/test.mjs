import VeridianClient from './dist/index.js'

const client = new VeridianClient('vrd_test_key_123', {
  baseUrl: 'http://localhost:3001'
})

// Test createVerification
const result = await client.createVerification({
  documentFront: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  selfie: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  documentType: 'passport'
})

console.log('createVerification:', result)

// Test getVerification
const verification = await client.getVerification(result.verificationId)
console.log('getVerification:', verification)

// Test createCheckout
const checkout = await client.createCheckout('starter')
console.log('createCheckout:', checkout)
