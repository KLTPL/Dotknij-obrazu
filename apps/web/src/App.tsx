import { healthResponseSchema, type HealthResponse } from '@repo/shared'
import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; health: HealthResponse }
  | { kind: 'error'; message: string }

async function fetchHealth(): Promise<State> {
  try {
    const res = await fetch('/api/health')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { kind: 'ok', health: healthResponseSchema.parse(await res.json()) }
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : String(err) }
  }
}

function App() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  const refresh = useCallback(() => {
    setState({ kind: 'loading' })
    void fetchHealth().then(setState)
  }, [])

  useEffect(() => {
    void fetchHealth().then(setState)
  }, [])

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>BEST Hacks 2026</CardTitle>
          <CardDescription>Boilerplate: Vite + NestJS + Prisma</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {state.kind === 'loading' && <Badge variant="outline">checking…</Badge>}
            {state.kind === 'error' && <Badge variant="destructive">API: {state.message}</Badge>}
            {state.kind === 'ok' && (
              <>
                <Badge>API: {state.health.status}</Badge>
                <Badge variant={state.health.db === 'up' ? 'default' : 'destructive'}>
                  DB: {state.health.db}
                </Badge>
              </>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={refresh} aria-label="Refresh">
            <RefreshCw />
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

export default App
