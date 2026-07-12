'use client'

import { useMemo } from 'react'
import { Canvas } from '@/components/ai-elements/canvas'
import { Handle, Position, type Node, type Edge, MarkerType } from '@xyflow/react'
import { Zap, Cpu, Activity, Shield, TrendingUp, CheckCircle2 } from 'lucide-react'
import { useIncidentContext } from './incident-context'

// Define the custom node component
function WorkflowNode({
  data,
}: {
  data: {
    label: string
    description: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    icon: React.ReactNode
  }
}) {
  const borderClass = {
    pending: 'border-border/40 bg-card/30 opacity-60 text-muted-foreground',
    running: 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(79,70,229,0.25)] ring-2 ring-primary/30 animate-pulse text-primary',
    completed: 'border-secondary bg-secondary/10 shadow-[0_0_10px_rgba(16,185,129,0.15)] text-secondary',
    failed: 'border-destructive bg-destructive/10 text-destructive',
  }[data.status] || 'border-border/40 bg-card/30'

  const badgeColor = {
    pending: 'bg-muted/50 text-muted-foreground',
    running: 'bg-primary text-primary-foreground font-bold',
    completed: 'bg-secondary text-secondary-foreground font-bold',
    failed: 'bg-destructive text-destructive-foreground font-bold',
  }[data.status] || 'bg-muted text-muted-foreground'

  return (
    <div className={`p-3 rounded-xl border backdrop-blur-md transition-all duration-300 w-48 flex flex-col gap-1.5 ${borderClass}`}>
      <Handle type="target" position={Position.Left} className="w-1.5 h-1.5 !bg-primary/60 border-none" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-card/50 border border-border/20">
          {data.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-foreground truncate">{data.label}</p>
          <p className="text-[9px] text-muted-foreground truncate">{data.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${badgeColor}`}>
          {data.status}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="w-1.5 h-1.5 !bg-primary/60 border-none" />
    </div>
  )
}

const nodeTypes = {
  workflowNode: WorkflowNode,
}

export function WorkflowCanvas() {
  const { workflowState, activeIncident } = useIncidentContext()

  // Derive nodes and edges based on dynamic state
  const { nodes, edges } = useMemo(() => {
    // Determine status for coordinator step
    const coordinatorStatus = activeIncident ? 'completed' : 'pending'

    // Diagnose status
    const diagnoseStatus = workflowState.diagnose

    // Plan status
    const planStatus = workflowState.plan

    // Safety check status (runs alongside planning once diagnose is completed)
    let safetyStatus: 'pending' | 'running' | 'completed' = 'pending'
    if (diagnoseStatus === 'completed') {
      safetyStatus = planStatus === 'completed' ? 'completed' : 'running'
    }

    // Execute status
    const executeStatus = workflowState.execute

    // Verify status
    const verifyStatus = workflowState.verify

    const nodesList: Node[] = [
      {
        id: 'coordinator',
        type: 'workflowNode',
        position: { x: 50, y: 100 },
        data: {
          label: 'Coordinator Ingest',
          description: 'Initialize incident response',
          status: coordinatorStatus,
          icon: <Zap className="h-3.5 w-3.5" />,
        },
      },
      {
        id: 'diagnose',
        type: 'workflowNode',
        position: { x: 280, y: 100 },
        data: {
          label: 'AI Diagnosis',
          description: 'Analyze telemetry & logs',
          status: diagnoseStatus,
          icon: <Cpu className="h-3.5 w-3.5" />,
        },
      },
      {
        id: 'plan',
        type: 'workflowNode',
        position: { x: 510, y: 30 },
        data: {
          label: 'Remediation Plan',
          description: 'Generate remediation steps',
          status: planStatus,
          icon: <Activity className="h-3.5 w-3.5" />,
        },
      },
      {
        id: 'safety',
        type: 'workflowNode',
        position: { x: 510, y: 170 },
        data: {
          label: 'Safety Verification',
          description: 'Enkrypt Guardrails Validation',
          status: safetyStatus,
          icon: <Shield className="h-3.5 w-3.5" />,
        },
      },
      {
        id: 'execute',
        type: 'workflowNode',
        position: { x: 740, y: 100 },
        data: {
          label: 'Execute Remediation',
          description: 'Run approved recovery plans',
          status: executeStatus,
          icon: <TrendingUp className="h-3.5 w-3.5" />,
        },
      },
      {
        id: 'verify',
        type: 'workflowNode',
        position: { x: 970, y: 100 },
        data: {
          label: 'Confirm Restoral',
          description: 'Verify system restabilization',
          status: verifyStatus,
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        },
      },
    ]

    const getEdgeStyle = (sourceStatus: string, targetStatus: string) => {
      const isPassed = sourceStatus === 'completed' && targetStatus !== 'pending'
      const isRunning = targetStatus === 'running'
      return {
        stroke: isPassed ? '#10b981' : isRunning ? '#6366f1' : 'rgba(148, 163, 184, 0.2)',
        strokeWidth: isPassed || isRunning ? 2 : 1.5,
        strokeDasharray: isRunning ? '5,5' : undefined,
      }
    }

    const edgesList: Edge[] = [
      {
        id: 'e-coord-diag',
        source: 'coordinator',
        target: 'diagnose',
        animated: diagnoseStatus === 'running',
        style: getEdgeStyle(coordinatorStatus, diagnoseStatus),
        markerEnd: { type: MarkerType.ArrowClosed, color: diagnoseStatus === 'running' ? '#6366f1' : coordinatorStatus === 'completed' ? '#10b981' : 'rgba(148, 163, 184, 0.2)' },
      },
      {
        id: 'e-diag-plan',
        source: 'diagnose',
        target: 'plan',
        animated: planStatus === 'running',
        style: getEdgeStyle(diagnoseStatus, planStatus),
        markerEnd: { type: MarkerType.ArrowClosed, color: planStatus === 'running' ? '#6366f1' : diagnoseStatus === 'completed' ? '#10b981' : 'rgba(148, 163, 184, 0.2)' },
      },
      {
        id: 'e-diag-safe',
        source: 'diagnose',
        target: 'safety',
        animated: safetyStatus === 'running',
        style: getEdgeStyle(diagnoseStatus, safetyStatus),
        markerEnd: { type: MarkerType.ArrowClosed, color: safetyStatus === 'running' ? '#6366f1' : diagnoseStatus === 'completed' ? '#10b981' : 'rgba(148, 163, 184, 0.2)' },
      },
      {
        id: 'e-plan-exec',
        source: 'plan',
        target: 'execute',
        animated: executeStatus === 'running',
        style: getEdgeStyle(planStatus, executeStatus),
        markerEnd: { type: MarkerType.ArrowClosed, color: executeStatus === 'running' ? '#6366f1' : planStatus === 'completed' ? '#10b981' : 'rgba(148, 163, 184, 0.2)' },
      },
      {
        id: 'e-safe-exec',
        source: 'safety',
        target: 'execute',
        animated: executeStatus === 'running',
        style: getEdgeStyle(safetyStatus, executeStatus),
        markerEnd: { type: MarkerType.ArrowClosed, color: executeStatus === 'running' ? '#6366f1' : safetyStatus === 'completed' ? '#10b981' : 'rgba(148, 163, 184, 0.2)' },
      },
      {
        id: 'e-exec-ver',
        source: 'execute',
        target: 'verify',
        animated: verifyStatus === 'running',
        style: getEdgeStyle(executeStatus, verifyStatus),
        markerEnd: { type: MarkerType.ArrowClosed, color: verifyStatus === 'running' ? '#6366f1' : executeStatus === 'completed' ? '#10b981' : 'rgba(148, 163, 184, 0.2)' },
      },
    ]

    return { nodes: nodesList, edges: edgesList }
  }, [workflowState, activeIncident])

  return (
    <div className="h-full w-full relative">
      <Canvas nodes={nodes} edges={edges} nodeTypes={nodeTypes} minZoom={0.5} maxZoom={1.5} />
    </div>
  )
}
