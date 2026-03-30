import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import type { Database } from '../types/database'

type Session = Database['public']['Tables']['weekly_sessions']['Row']

interface ListItem {
  name: string
  quantity: string | number
  unit: string
  category?: string
}

const PIE_COLORS = [
  '#2B5E3F', '#4A8A62', '#D97706', '#1D4ED8', '#C0392B',
  '#78716C', '#57534E', '#B8B0A0', '#F7F6F2', '#E8F2EC',
]

export default function DashboardPage() {
  const { householdId, loading: hhLoading } = useHousehold()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchSessions = useCallback(async () => {
    if (!householdId) return
    const { data } = await supabase
      .from('weekly_sessions')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(20)
    setSessions(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    if (!hhLoading && householdId) fetchSessions()
  }, [hhLoading, householdId, fetchSessions])

  const createSession = async () => {
    if (!householdId) return
    await supabase.from('weekly_sessions').insert({ household_id: householdId })
    navigate('/session')
  }

  // Stats
  const totalSessions = sessions.length
  const completedSessions = sessions.filter(
    (s) => s.status === 'finalised' || s.status === 'dispatched',
  )
  const allFinalItems = completedSessions.flatMap(
    (s) => (s.final_list as unknown as ListItem[]) ?? [],
  )
  const avgItems =
    completedSessions.length > 0
      ? Math.round(allFinalItems.length / completedSessions.length)
      : 0

  // Category distribution from all final lists
  const categoryCount = allFinalItems.reduce(
    (acc, item) => {
      const cat = item.category ?? 'Other'
      acc[cat] = (acc[cat] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const pieData = Object.entries(categoryCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  // Most common items
  const itemFrequency = allFinalItems.reduce(
    (acc, item) => {
      const key = item.name.toLowerCase()
      acc[key] = { name: item.name, count: (acc[key]?.count ?? 0) + 1 }
      return acc
    },
    {} as Record<string, { name: string; count: number }>,
  )
  const topItems = Object.values(itemFrequency)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  if (hhLoading || loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-mid">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        Loading dashboard...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl text-text">Dashboard</h2>
        <button
          onClick={createSession}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          + New Session
        </button>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="font-serif text-2xl text-text">{totalSessions}</div>
          <div className="text-xs text-text-light">Total sessions</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="font-serif text-2xl text-text">{completedSessions.length}</div>
          <div className="text-xs text-text-light">Completed</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="font-serif text-2xl text-text">{avgItems}</div>
          <div className="text-xs text-text-light">Avg items per shop</div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Category distribution */}
        {pieData.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-text">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="value"
                  label={(props) =>
                    `${props.name ?? ''} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Most common items */}
        {topItems.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-text">Most Common Items</h3>
            <div className="flex flex-col gap-2">
              {topItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-text">{item.name}</span>
                  <span className="rounded-full bg-accent-light px-2 py-0.5 text-xs font-medium text-accent">
                    {item.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Session history */}
      <h3 className="mb-3 text-sm font-semibold text-text">Session History</h3>
      {sessions.length === 0 ? (
        <p className="text-sm text-text-light">No sessions yet. Start your first weekly shop!</p>
      ) : (
        <div className="flex flex-col gap-1">
          {sessions.map((session) => {
            const itemCount = ((session.final_list as unknown as ListItem[]) ?? []).length
            return (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
              >
                <div>
                  <span className="text-sm font-medium text-text">{session.session_date}</span>
                  {itemCount > 0 && (
                    <span className="ml-2 text-xs text-text-light">{itemCount} items</span>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    session.status === 'finalised' || session.status === 'dispatched'
                      ? 'bg-accent text-white'
                      : session.status === 'draft'
                        ? 'bg-surface-alt text-text-mid'
                        : 'bg-blue-light text-blue'
                  }`}
                >
                  {session.status}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
