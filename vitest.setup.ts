// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

// Repli pour que les tests soient autonomes même sans .env (ex. CI) :
// la validation d'env (src/env.ts) exige PAYLOAD_SECRET.
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'test-only-secret'
