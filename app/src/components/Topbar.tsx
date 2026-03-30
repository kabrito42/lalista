import { useAuth } from '../contexts/AuthContext'

interface TopbarProps {
  onMenuToggle: () => void
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, signOut } = useAuth()

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-4 md:px-7">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-1.5 text-text-mid hover:bg-surface-alt md:hidden"
        aria-label="Toggle menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1" />

      {/* User info + logout */}
      <span className="text-xs text-text-light">{user?.email}</span>
      <button
        onClick={signOut}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-mid transition-colors hover:bg-surface-alt"
      >
        Sign out
      </button>
    </header>
  )
}
