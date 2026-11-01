function Icon({ children, className = 'h-6 w-6', strokeWidth = 2 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export function PlayIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  )
}

export function PauseIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="6" y="5" width="4.5" height="14" rx="1.5" fill="currentColor" />
      <rect x="13.5" y="5" width="4.5" height="14" rx="1.5" fill="currentColor" />
    </svg>
  )
}

export function ReplayIcon({ className }) {
  return (
    <Icon className={className} strokeWidth={2.5}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
    </Icon>
  )
}

export function HomeIcon({ className }) {
  return (
    <Icon className={className} strokeWidth={2.5}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5h13V10" />
    </Icon>
  )
}

export function LockIcon({ className }) {
  return (
    <Icon className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Icon>
  )
}

export function BackIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M11 7 6 12l5 5" />
      <path d="M18 7l-5 5 5 5" />
    </Icon>
  )
}

export function NextIcon({ className }) {
  return (
    <Icon className={className} strokeWidth={2.5}>
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  )
}

export function PlusIcon({ className }) {
  return (
    <Icon className={className} strokeWidth={2.5}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function FileIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </Icon>
  )
}

export function DownloadIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </Icon>
  )
}

export function TrashIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </Icon>
  )
}

export function PencilIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
    </Icon>
  )
}

export function CheckIcon({ className }) {
  return (
    <Icon className={className} strokeWidth={2.5}>
      <path d="m5 12 5 5 9-10" />
    </Icon>
  )
}

export function ImageIcon({ className }) {
  return (
    <Icon className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </Icon>
  )
}

export function MusicIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </Icon>
  )
}
