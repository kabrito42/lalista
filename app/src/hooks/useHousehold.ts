import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useHousehold() {
  const { user } = useAuth()
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setHouseholdId(null)
      setLoading(false)
      return
    }

    supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error('Failed to fetch household:', error)
        setHouseholdId(data?.household_id ?? null)
        setLoading(false)
      })
  }, [user])

  return { householdId, loading }
}
