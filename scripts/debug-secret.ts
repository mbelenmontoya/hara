import { config } from 'dotenv'
import { resolve } from 'path'
import { createHash } from 'crypto'

config({ path: resolve(process.cwd(), '.env.local') })

const secret = process.env.ATTRIBUTION_TOKEN_SECRET || ''
const hash = createHash('sha256').update(secret).digest('hex').substring(0, 16)

console.log('Test/Script Secret Info:')
console.log('Length:', secret.length)
console.log('First 4:', secret.substring(0, 4))
console.log('Hash prefix:', hash)
console.log('Full secret:', secret)
