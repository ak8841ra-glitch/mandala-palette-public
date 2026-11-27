import type { RoomId } from './Home'

const measurementId = 'G-68PPKPB24X'
const storageKey = 'mandala-palette:first-room-session'
let recordedSession: string | undefined

type AnalyticsWindow = Window & {
  gtag?: (command: string, ...args: unknown[]) => void
}

export function recordRoomChoice(room: RoomId) {
  const gtag = (window as AnalyticsWindow).gtag
  if (!gtag) return

  gtag('get', measurementId, 'session_id', (value: unknown) => {
    if (typeof value !== 'string' && typeof value !== 'number') return
    const session = String(value)
    if (recordedSession === session) return
    recordedSession = session

    try {
      if (localStorage.getItem(storageKey) === session) return
      localStorage.setItem(storageKey, session)
    } catch {
      // The in-memory check still works while this page is open.
    }

    gtag('event', room === 'look' ? 'entrance_look' : 'entrance_make')
  })
}
