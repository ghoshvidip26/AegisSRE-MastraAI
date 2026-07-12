'use client'
import { Shield, Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useIncidentContext } from './incident-context'
import { useState, useEffect } from 'react'

type Incident = {
  id: string
  title: string
  severity: 'P1' | 'P2' | 'P3' | 'P4'
  status: 'active' | 'investigating' | 'resolved'
  service: string
  timestamp: string
}

const severityColors: Record<string, string> = {
  P1: 'bg-destructive/10 text-destructive border-destructive/20',
  P2: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  P3: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  P4: 'bg-primary/10 text-primary border-primary/20',
  Investigating: 'bg-primary/10 text-primary border-primary/20',
}

const statusIcons: Record<string, React.ReactNode> = {
  active: <AlertTriangle className="h-3 w-3 text-destructive" />,
  investigating: <Clock className="h-3 w-3 text-amber-500" />,
  resolved: <CheckCircle className="h-3 w-3 text-secondary" />,
}

export function Sidebar() {
  const { metrics, workflowState, activeIncident } = useIncidentContext()
  const [incident, setIncident] = useState<Incident[]>();

  useEffect(() => {
    const fetchIncident = async () => {
      const res = await fetch('/api/incidents')
      const data = await res.json()
      setIncident(data.incident);
    }
    fetchIncident();
  }, [setIncident]);

  console.log("Incident: ", incident);

  // Derive system health from real metrics when available
  const healthData = metrics
    ? {
      services: metrics.errorRate > 10 ? '12/14' : '14/14',
      uptime: metrics.errorRate > 5 ? '99.2%' : '99.9%',
      incidents: activeIncident ? '1' : '0',
      alerts: String(
        (metrics.cpu > 80 ? 1 : 0) +
        (metrics.memory > 85 ? 1 : 0) +
        (metrics.errorRate > 5 ? 1 : 0) +
        (metrics.latency > 1000 ? 1 : 0)
      ),
    }
    : { services: '--', uptime: '--', incidents: '0', alerts: '0' }

  // Determine which incidents to show
  const hasActiveWorkflow = workflowState.diagnose !== 'pending'

  return (
    <aside className="flex h-full w-72 flex-col glass-panel rounded-2xl overflow-hidden shadow-2xl z-10 transition-all duration-300 bg-card/10 border-border/40">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border/40 px-6 py-5 bg-card/20">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-sm font-semibold tracking-tight text-foreground">Aegis SRE</h1>
      </div>

      {/* Service Health Summary */}
      <div className="border-b border-border/40 px-6 py-4">
        <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          System Health
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <HealthCard
            label="Services"
            value={healthData.services}
            status={metrics ? (metrics.errorRate > 10 ? 'critical' : 'warning') : 'healthy'}
          />
          <HealthCard
            label="Uptime"
            value={healthData.uptime}
            status={metrics ? (metrics.errorRate > 5 ? 'warning' : 'healthy') : 'healthy'}
          />
          <HealthCard
            label="Incidents"
            value={healthData.incidents}
            status={activeIncident ? 'critical' : 'healthy'}
          />
          <HealthCard
            label="Alerts"
            value={healthData.alerts}
            status={Number(healthData.alerts) > 2 ? 'critical' : Number(healthData.alerts) > 0 ? 'warning' : 'healthy'}
          />
        </div>
      </div>

      {/* Active Incident from Context */}
      {activeIncident && (
        <div className="border-b border-border/40 px-6 py-4 bg-destructive/5">
          <h2 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Current Investigation
          </h2>
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 shadow-md shadow-destructive/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground font-semibold">{activeIncident.id}</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 rounded-md font-semibold border ${severityColors[activeIncident.severity] || severityColors.P2}`}
              >
                {activeIncident.severity}
              </Badge>
            </div>
            <p className="mt-2 text-xs font-bold leading-tight text-foreground">
              {activeIncident.title}
            </p>
            {hasActiveWorkflow && (
              <div className="mt-2.5 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
                <span className="text-[10px] text-primary font-semibold">Agent working...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h2 className="mb-2.5 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Recent Incidents
        </h2>
        <div className="space-y-2.5">
          {(incident || []).map((incident) => {
            const isActive = activeIncident?.id === incident.id
            return (
              <button
                key={incident.id}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${isActive
                    ? 'border-primary bg-primary/10 shadow-md shadow-primary/5'
                    : 'border-border/40 bg-card/30 hover:bg-muted hover:border-border/60'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground font-medium">
                    {incident.id}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold px-1.5 py-0 rounded-md border ${severityColors[incident.severity]}`}
                  >
                    {incident.severity}
                  </Badge>
                </div>
                <p className="mt-2 text-xs font-semibold leading-tight text-foreground truncate">
                  {incident.title}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {statusIcons[incident.status]}
                    <span className="text-[10px] text-muted-foreground capitalize font-medium">
                      {incident.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {incident.timestamp}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/40 px-6 py-4 bg-card/20">
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-secondary animate-pulse" />
          <span className="text-xs font-semibold text-muted-foreground">Agent Online</span>
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
    healthy: 'text-secondary',
    warning: 'text-amber-600 dark:text-amber-400',
    critical: 'text-destructive',
  }

  return (
    <div className="glass-card rounded-xl px-3 py-2.5 hover:scale-[1.03] transition-all duration-200 border-border/30 bg-card/10">
      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${statusColor[status]}`}>{value}</p>
    </div>
  )
}
