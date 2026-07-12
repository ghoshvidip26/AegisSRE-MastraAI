'use client'

import { Activity, Cpu, HardDrive, Zap, TrendingUp, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIncidentContext, type WorkflowStepStatus } from './incident-context'

type WorkflowStep = {
  id: string
  label: string
  status: WorkflowStepStatus
}

const levelColors: Record<string, string> = {
  ERROR: 'text-red-400',
  WARN: 'text-orange-400',
  INFO: 'text-blue-400',
  DEBUG: 'text-muted-foreground',
}

export function ContextPanel() {
  const { metrics, logs, workflowState } = useIncidentContext()

  const displayMetrics = metrics ?? {
    cpu: 0,
    memory: 0,
    errorRate: 0,
    latency: 0,
  }

  const workflowSteps: WorkflowStep[] = [
    { id: 'diagnose', label: 'Diagnose', status: workflowState.diagnose },
    { id: 'plan', label: 'Plan', status: workflowState.plan },
    { id: 'execute', label: 'Execute', status: workflowState.execute },
    { id: 'verify', label: 'Verify', status: workflowState.verify },
  ]

  const hasData = metrics !== null || logs.length > 0

  return (
    <aside className="flex h-full w-80 flex-col border-l border-border bg-card">
      <Tabs defaultValue="metrics" className="flex h-full flex-col">
        <TabsList className="mx-3 mt-3 grid w-auto grid-cols-3">
          <TabsTrigger value="metrics" className="text-xs">Metrics</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">
            Logs
            {logs.length > 0 && (
              <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500/20 text-[9px] text-red-400">
                {logs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="workflow" className="text-xs">Workflow</TabsTrigger>
        </TabsList>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="flex-1 overflow-y-auto px-4 py-3">
          {!hasData && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No metrics yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Metrics will appear when the agent queries infrastructure
              </p>
            </div>
          )}
          {hasData && (
            <div className="space-y-4">
              <MetricCard
                icon={<Cpu className="h-4 w-4" />}
                label="CPU Usage"
                value={`${displayMetrics.cpu}%`}
                progress={displayMetrics.cpu}
                status={displayMetrics.cpu > 80 ? 'critical' : displayMetrics.cpu > 60 ? 'warning' : 'healthy'}
              />
              <MetricCard
                icon={<HardDrive className="h-4 w-4" />}
                label="Memory"
                value={`${displayMetrics.memory}%`}
                progress={displayMetrics.memory}
                status={displayMetrics.memory > 85 ? 'critical' : displayMetrics.memory > 70 ? 'warning' : 'healthy'}
              />
              <MetricCard
                icon={<Zap className="h-4 w-4" />}
                label="Error Rate"
                value={`${displayMetrics.errorRate}%`}
                progress={displayMetrics.errorRate * 5}
                status={displayMetrics.errorRate > 10 ? 'critical' : displayMetrics.errorRate > 5 ? 'warning' : 'healthy'}
              />
              <MetricCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="P99 Latency"
                value={`${displayMetrics.latency}ms`}
                progress={Math.min((displayMetrics.latency / 2000) * 100, 100)}
                status={displayMetrics.latency > 1000 ? 'critical' : displayMetrics.latency > 500 ? 'warning' : 'healthy'}
              />
            </div>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="flex-1 overflow-y-auto px-4 py-3">
          {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No logs yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Logs will stream when the agent pulls incident data
              </p>
            </div>
          )}
          {logs.length > 0 && (
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="rounded px-2 py-1.5 font-mono text-[11px] hover:bg-accent">
                  <span className="text-muted-foreground">{log.timestamp}</span>{' '}
                  <span className={levelColors[log.level]}>[{log.level}]</span>{' '}
                  <span className="text-foreground">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Workflow Tab */}
        <TabsContent value="workflow" className="flex-1 overflow-y-auto px-4 py-3">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Incident Response Pipeline
          </h3>
          <div className="space-y-1">
            {workflowSteps.map((step) => (
              <WorkflowStepItem key={step.id} step={step} />
            ))}
          </div>

          {/* Show overall status */}
          <div className="mt-6 rounded-md border border-border bg-background p-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Pipeline Status</h4>
            <PipelineStatus steps={workflowSteps} />
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  )
}

function MetricCard({
  icon,
  label,
  value,
  progress,
  status,
}: {
  icon: React.ReactNode
  label: string
  value: string
  progress: number
  status: 'healthy' | 'warning' | 'critical'
}) {
  const progressColor = {
    healthy: '[&>div]:bg-green-500',
    warning: '[&>div]:bg-orange-500',
    critical: '[&>div]:bg-red-500',
  }

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <span className="text-sm font-semibold">{value}</span>
      </div>
      <Progress value={progress} className={`mt-2 h-1.5 ${progressColor[status]}`} />
    </div>
  )
}

function WorkflowStepItem({ step }: { step: WorkflowStep }) {
  const iconMap = {
    pending: <Circle className="h-4 w-4 text-muted-foreground" />,
    running: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-400" />,
    failed: <Activity className="h-4 w-4 text-red-400" />,
  }

  const borderColor = {
    pending: 'border-border',
    running: 'border-blue-500/30',
    completed: 'border-green-500/30',
    failed: 'border-red-500/30',
  }

  return (
    <div className={`flex items-center gap-3 rounded-md px-3 py-2.5 border bg-background ${borderColor[step.status]}`}>
      {iconMap[step.status]}
      <span className="text-sm font-medium flex-1">{step.label}</span>
      <span className="text-[11px] text-muted-foreground capitalize">{step.status}</span>
    </div>
  )
}

function PipelineStatus({ steps }: { steps: WorkflowStep[] }) {
  const completed = steps.filter(s => s.status === 'completed').length
  const running = steps.find(s => s.status === 'running')
  const allDone = completed === steps.length

  if (allDone) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-400" />
        <span className="text-sm text-green-400 font-medium">Incident Resolved</span>
      </div>
    )
  }

  if (running) {
    return (
      <div className="text-xs text-muted-foreground">
        Step {completed + 1}/4 in progress: <span className="text-foreground font-medium">{running.label}</span>
      </div>
    )
  }

  if (completed === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        Waiting for incident input to begin analysis...
      </div>
    )
  }

  return (
    <div className="text-xs text-muted-foreground">
      {completed}/4 steps completed
    </div>
  )
}
