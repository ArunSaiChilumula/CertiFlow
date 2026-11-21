import type { SVGProps } from 'react'

export type IconName =
  | 'dashboard' | 'batches' | 'plus' | 'certificate' | 'bell' | 'settings' | 'search'
  | 'chevronDown' | 'arrowUpRight' | 'arrowRight' | 'calendar' | 'users' | 'check'
  | 'clock' | 'fileText' | 'eye' | 'more' | 'arrowLeft' | 'sparkles' | 'upload'
  | 'circleCheck' | 'menu' | 'help' | 'filter' | 'download' | 'close' | 'chevronRight'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
    batches: <><path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" /><path d="m4 12 8 4 8-4M4 16.5l8 4 8-4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    certificate: <><path d="M7 3.5h7l4 4V15" /><path d="M14 3.5v4h4M5 7H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h9" /><circle cx="17" cy="17" r="3.5" /><path d="m15 20-1 3 3-1 3 1-1-3" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.8Z" transform="translate(-2 -1)" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    chevronDown: <><path d="m7 10 5 5 5-5" /></>,
    arrowUpRight: <><path d="M7 17 17 7M7 7h10v10" /></>,
    arrowRight: <><path d="M5 12h14m-7-7 7 7-7 7" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    fileText: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    arrowLeft: <><path d="M19 12H5m7 7-7-7 7-7" /></>,
    sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" /><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1-2.9L15 18l3-1.1L19 14Z" /></>,
    upload: <><path d="M12 16V4m-4 4 4-4 4 4" /><path d="M20 16.5v3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-3" /></>,
    circleCheck: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 4M12 17.5h.01" /></>,
    filter: <><path d="M4 7h16M7 12h10m-7 5h4" /></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4" /><path d="M5 17v3h14v-3" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    chevronRight: <><path d="m9 18 6-6-6-6" /></>,
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  )
}
