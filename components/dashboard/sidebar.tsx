'use client'

import { Shield, Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Incident = {
  id: string
  title: string
  severity: 'P1' | 'P2' | 'P3' | 'P4'
  status: 'active' | 'investigating' | 'resolved'
  service: string
  timestamp: string
}

const mockIncidents: Incident[] = [
  {
    id: 'INC-001',
    title: 'Redis connection pool exhausted',
    severity: 'P1',
    status: 'active',
    service: 'auth-service',
    timestamp: '2 min ago',
  },
  {
    id: 'INC-002',
    title: 'Elevated error rate on /api/payments',
    severity: 'P2',
    status: 'investigating',
    service: 'payment-service',
    timestamp: '15 min ago',
  },
  {
    id: 'INC-003',
    title: 'Memory leak in worker pods',
    severity: 'P3',
    status: 'resolved',
    service: 'worker-service',
    timestamp: '1h ago',
  },
]

const severityColors: Record<string, string> = {
  P1: 'bg-red-500/20 text-red-400 border-red-500/30',
  P2: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  P3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  P4: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const statusIcons: Record<string, React.ReactNode> = {
  active: <AlertTriangle className="h-3 w-3 text-red-400" />,
  investigating: <Clock className="h-3 w-3 text-orange-400" />,
  resolved: <CheckCircle className="h-3 w-3 text-green-400" />,
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-sm font-semibold tracking-tight">Aegis SRE</h1>
      </div>

      {/* Service Health Summary */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          System Health
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <HealthCard label="Services" value="12/14" status="warning" />
          <HealthCard label="Uptime" value="99.2%" status="warning" />
          <HealthCard label="Incidents" value="2" status="critical" />
          <HealthCard label="Alerts" value="5" status="warning" />
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <h2 className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Active Incidents
        </h2>
        <div className="space-y-1">
          {mockIncidents.map((incident) => (
            <button
              key={incident.id}
              className="w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">
                  {incident.id}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${severityColors[incident.severity]}`}
                >
                  {incident.severity}
                </Badge>
              </div>
              <p className="mt-1 text-sm font-medium leading-tight truncate">
                {incident.title}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {statusIcons[incident.status]}
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {incident.status}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground">
                  {incident.timestamp}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-green-400" />
          <span className="text-xs text-muted-foreground">Agent Online</span>
        </div>
      </div>
    </aside>
  )
}

function HealthCard({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status: 'healthy' | 'warning' | 'critical'
}) {
  const statusColor = {
    healthy: 'text-green-400',
    warning: 'text-orange-400',
    critical: 'text-red-400',
  }

  return (
    <div className="rounded-md border border-border bg-background px-2.5 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${statusColor[status]}`}>{value}</p>
    </div>
  )
}
