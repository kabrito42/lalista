import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

interface LogEntry {
  id: string
  message: string
  log_type: string
  created_at: string
}

const LOG_COLORS: Record<string, string> = {
  info: 'text-text-mid',
  success: 'text-accent',
  warning: 'text-amber',
  error: 'text-red',
}

interface Props {
  sessionId: string
}

export default function AutomationLogViewer({ sessionId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch existing logs
    supabase
      .from('automation_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at')
      .then(({ data }) => {
        if (data) setLogs(data)
      })

    // Subscribe to new logs via realtime
    const channel = supabase
      .channel(`logs:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'automation_logs',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setLogs((prev) => [...prev, payload.new as LogEntry])
        },
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-sm font-semibold text-text">Automation Log</h3>
        <span
          className={`flex items-center gap-1.5 text-xs ${connected ? 'text-accent' : 'text-text-light'}`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-accent' : 'bg-text-light'}`}
          />
          {connected ? 'Live' : 'Connecting...'}
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto p-3 font-mono text-xs">
        {logs.length === 0 ? (
          <p className="text-text-light">
            Waiting for agent activity... Make sure the agent is running locally.
          </p>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className="py-0.5">
              <span className="text-text-light">
                {new Date(entry.created_at).toLocaleTimeString()}
              </span>{' '}
              <span className={LOG_COLORS[entry.log_type] ?? 'text-text-mid'}>
                {entry.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
