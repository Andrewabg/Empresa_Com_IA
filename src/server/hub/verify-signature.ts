

















import { verify as edVerify, createPublicKey, type KeyObject } from 'node:crypto'


const PUBLIC_KEYS_PEM: string[] = [
  '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAbFxSZSVYOstxOh4YLM6YvDJNFwWrRz3S1u6XpoTSTB8=\n-----END PUBLIC KEY-----',
]


const PUBLIC_KEYS: KeyObject[] = PUBLIC_KEYS_PEM.flatMap((pem) => {
  try {
    return [createPublicKey(pem)]
  } catch {
    return []
  }
})


export function canonicalActivePayload(f: {
  status: string
  entitled: boolean
  instanceId: string | null | undefined
  iat: number
}): string {
  return `v1|${f.status}|${f.entitled ? 1 : 0}|${f.instanceId ?? ''}|${f.iat}`
}


export function verifyActiveSignature(
  f: {
    status: string
    entitled: boolean
    instanceId: string | null | undefined
    sig: string | undefined
    sigIat: number | undefined
  },
  publicKeys: KeyObject[] = PUBLIC_KEYS,
): boolean {
  if (!f.sig || typeof f.sigIat !== 'number' || publicKeys.length === 0) return false
  try {
    const msg = Buffer.from(
      canonicalActivePayload({ status: f.status, entitled: f.entitled, instanceId: f.instanceId, iat: f.sigIat }),
      'utf8',
    )
    const sig = Buffer.from(f.sig, 'base64')
    return publicKeys.some((k) => {
      try {
        return edVerify(null, msg, k, sig)
      } catch {
        return false
      }
    })
  } catch {
    return false
  }
}
