/**
 * IPLD CAR (Content Addressed Archive) utilities
 */

import { LVG } from '../lvg/types'
import * as crypto from 'crypto'

/**
 * Create a CAR file from LVG
 * Simplified implementation - in production would use @ipld/car
 */
export async function createCAR(lvg: LVG): Promise<Buffer> {
  // Serialize LVG to CBOR-like format
  const serialized = JSON.stringify(lvg, replacer, 2)

  // Create CID
  const hash = crypto.createHash('blake3')
    .update(serialized)
    .digest()

  const cid = `bafk${hash.toString('hex').slice(0, 32)}`

  // Create simple CAR structure
  const car = {
    version: 1,
    roots: [cid],
    blocks: [
      {
        cid,
        data: Buffer.from(serialized)
      }
    ]
  }

  // Serialize CAR (simplified)
  return Buffer.from(JSON.stringify(car))
}

// Handle Map serialization
function replacer(key: string, value: any): any {
  if (value instanceof Map) {
    return {
      _type: 'Map',
      entries: Array.from(value.entries())
    }
  }
  return value
}