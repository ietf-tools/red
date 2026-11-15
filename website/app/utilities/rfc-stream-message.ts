import type { RfcCommon } from '~/utilities/rfc'

type StreamSlug = RfcCommon['stream']['slug']

export const STREAM_MESSAGES: Record<StreamSlug, string> = {
  IETF: 'A publication of the IETF standards development organization',
  IRTF: 'A publication of the IRTF research organization',
  IAB: 'A publication of the IAB, a committee of the IETF',
  INDEPENDENT: 'An Independent publication unrelated to the IETF, IRTF or IAB',
  Editorial: 'An editorial publication of the RFC Series',
  Legacy: 'An older publication predating the IETF, IRTF, and IAB'
}
