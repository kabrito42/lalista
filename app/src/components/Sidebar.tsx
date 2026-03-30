import { NavLink } from 'react-router-dom'

const NAV_SECTIONS = [
  {
    label: 'Meal Planning',
    items: [{ to: '/recipes', label: 'Recipes', icon: '📖' }],
  },
  {
    label: 'Weekly Workflow',
    items: [
      { to: '/session', label: 'Session', icon: '📋' },
      { to: '/meals', label: 'Meals', icon: '🍽' },
      { to: '/picker', label: 'Picker', icon: '✅' },
      { to: '/review', label: 'Review', icon: '🔍' },
      { to: '/finalise', label: 'Finalise', icon: '🚀' },
    ],
  },
  {
    label: 'Maintenance',
    items: [
      { to: '/longlist', label: 'Longlist', icon: '📝' },
      { to: '/pantry', label: 'Pantry', icon: '🏠' },
      { to: '/categories', label: 'Categories', icon: '🏷' },
      { to: '/coles-preferences', label: 'Coles Prefs', icon: '🛒' },
    ],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-border bg-surface transition-transform md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="border-b border-border px-5 py-4">
          <h1 className="font-serif text-lg text-accent">LaLista</h1>
          <span className="font-mono text-xs text-text-light">Weekly shop planner</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-text-light">
                {section.label}
              </div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-accent-light font-semibold text-accent'
                        : 'text-text-mid hover:bg-surface-alt hover:text-text'
                    }`
                  }
                >
                  <span className="w-5 text-center text-sm">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}

          {/* Dashboard */}
          <div className="mb-4">
            <NavLink
              to="/"
              end
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent-light font-semibold text-accent'
                    : 'text-text-mid hover:bg-surface-alt hover:text-text'
                }`
              }
            >
              <span className="w-5 text-center text-sm">📊</span>
              Dashboard
            </NavLink>
          </div>
        </nav>
      </aside>
    </>
  )
}
