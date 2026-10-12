// 線で描く小さなアイコン（外部素材は使わない）
const PATHS: Record<string, string> = {
  home: 'M4 11 12 4l8 7M6 9.5V20h12V9.5',
  layers: 'M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  flush: 'M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11Zm-2.5 11.5a2.5 2.5 0 0 0 2.5 2.5',
  drop: 'M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11Z',
  stop: 'M7 7h10v10H7z',
  quiz: 'M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.2-1.5 2.3M12 18h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  search: 'm20 20-4.5-4.5M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z',
  close: 'M6 6l12 12M18 6 6 18',
  arrow: 'M9 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  up: 'M6 15l6-6 6 6',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  play: 'M8 5v14l11-7z',
  flame: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.3 3 2.5 3.5C11.5 9 11 6 12 3Z',
  bolt: 'M13 2 5 13h6l-1 9 8-11h-6l1-9Z',
  snow: 'M12 2v20M4.2 7l15.6 10M4.2 17 19.8 7M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5',
}

export function Icon({ name }: { name: keyof typeof PATHS | string }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
