'use client'

import { Activity, Cpu, HardDrive, Zap, TrendingUp, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type WorkflowStep = {
  id: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'failed'
}

const workflowSteps: WorkflowStep[] = [
  { id: 'diagnose', label: 'Diagnose', status: 'completed' },
  { id: 'plan', label: 'Plan', status: 'running' },
  { id: 'execute', label: 'Execute', status: 'pending' },
  { id: 'verify', label: 'Verify', status: 'pending' },
]

const metrics = {
  cpu: 87,
  memory: 78,
  errorRate: 12.3,
  latency: 1450,
}

const recentLogs = [
  { timestamp: '14:32:01', level: 'ERROR', message: 'Redis connection timeout after 30s' },
  { timestamp: '14:32:01', level: 'ERROR', message: 'Connection pool exhausted (max: 50)' },
  { timestamp: '14:31:58', level: 'WARN', message: 'Retry attempt 3/3 for redis-primary' },
  { timestamp: '14:31:55', level: 'WARN', message: 'Retry attempt 2/3 for redis-primary' },
  { timestamp: '14:31:52', level: 'WARN', message: 'Retry attempt 1/3 for redis-primary' },
  { timestamp: '14:31:50', level: 'INFO', message: 'Health check failed: redis-primary' },
]

const levelColors: Record<string, string> = {
  ERROR: 'text-red-400',
  WARN: 'text-orange-400',
  INFO: 'text-blue-400',
  DEBUG: 'text-muted-foreground',
}

export function ContextPanel() {
  return (
    <aside className="flex h-full w-80 flex-col border-l border-border bg-card">
      <Tabs defaultValue="metrics" className="flex h-full flex-col">
        <TabsList className="mx-3 mt-3 grid w-auto grid-cols-3">
          <TabsTrigger value="metrics" className="text-xs">Metrics</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
          <TabsTrigger value="workflow" className="text-xs">Workflow</TabsTrigger>
        </TabsList>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-4">
            <MetricCard
              icon={<Cpu className="h-4 w-4" />}
              label="CPU Usage"
              value={`${metrics.cpu}%`}
              progress={metrics.cpu}
              status={metrics.cpu > 80 ? 'critical' : metrics.cpu > 60 ? 'warning' : 'healthy'}
            />
            <MetricCard
              icon={<HardDrive className="h-4 w-4" />}
              label="Memory"
              value={`${metrics.memory}%`}
              progress={metrics.memory}
              status={metrics.memory > 85 ? 'critical' : metrics.memory > 70 ? 'warning' : 'healthy'}
            />
            <MetricCard
              icon={<Zap className="h-4 w-4" />}
              label="Error Rate"
              value={`${metrics.errorRate}%`}
              progress={metrics.errorRate * 5}
              status={metrics.errorRate > 10 ? 'critical' : metrics.errorRate > 5 ? 'warning' : 'healthy'}
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="P99 Latency"
              value={`${metrics.latency}ms`}
              progress={Math.min((metrics.latency / 2000) * 100, 100)}
              status={metrics.latency > 1000 ? 'critical' : metrics.latency > 500 ? 'warning' : 'healthy'}
            />
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Affected Service
            </h3>
            <div className="rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">auth-service</span>
                <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                  Degraded
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Cluster: prod-us-east-1 · Replicas: 3/5 healthy
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-1">
            {recentLogs.map((log, i) => (
              <div key={i} className="rounded px-2 py-1.5 font-mono text-[11px] hover:bg-accent">
                <span className="text-muted-foreground">{log.timestamp}</span>{' '}
                <span className={levelColors[log.level]}>[{log.level}]</span>{' '}
                <span className="text-foreground">{log.message}</span>
              </div>
            ))}
          </div>
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

          <div className="mt-6 rounded-md border border-border bg-background p-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Current Step Output</h4>
            <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap">
{`{
  "rootCause": "Redis connection pool exhausted",
  "severity": "P1",
  "confidence": 0.92,
  "affectedService": "auth-service",
  "recommendation": "Restart Redis + scale pool"
}`}
            </pre>
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

  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5 border border-border bg-background">
      {iconMap[step.status]}
      <span className="text-sm font-medium flex-1">{step.label}</span>
      <span className="text-[11px] text-muted-foreground capitalize">{step.status}</span>
    </div>
  )
}
