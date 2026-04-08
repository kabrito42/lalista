import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import type { Database } from '../types/database'

type WeeklySession = Database['public']['Tables']['weekly_sessions']['Row']

interface SessionContextType {
  session: WeeklySession | null
  loading: boolean
  error: string
  refreshSession: () => Promise<void>
  advanceSession: () => Promise<void>
  setSession: (session: WeeklySession | null) => void
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const { householdId, loading: hhLoading } = useHousehold()
  const [session, setSession] = useState<WeeklySession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshSession = useCallback(async () => {
    if (!householdId) return
    setError('')
    const { data, error } = await supabase
      .from('weekly_sessions')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) setError(error.message)
    else setSession(data)
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    if (!hhLoading && householdId) refreshSession()
  }, [hhLoading, householdId, refreshSession])

  const advanceSession = useCallback(async () => {
    if (!session) return
    setError('')
    const { data, error } = await supabase.rpc('advance_session', {
      p_session_id: session.id,
    })
    if (error) {
      setError(error.message)
      return
    }
    setSession((s) => (s ? { ...s, status: data as WeeklySession['status'] } : s))
  }, [session])

  return (
    <SessionContext.Provider
      value={{ session, loading: hhLoading || loading, error, refreshSession, advanceSession, setSession }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
