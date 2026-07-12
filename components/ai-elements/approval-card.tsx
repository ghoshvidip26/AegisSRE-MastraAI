'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, ShieldAlert, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react'

interface RemediationStep {
  stepNumber: number
  description: string
  command: string
}

interface ApprovalPlan {
  planSummary: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  requiresApproval: boolean
  steps: RemediationStep[]
  commands: string[]
}

interface ApprovalCardProps {
  plan: ApprovalPlan
  onApprove: () => void
  onReject: () => void
  isPending?: boolean
}

const riskConfig = {
  LOW: {
    label: 'Low Risk',
    icon: ShieldCheck,
    classes: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300',
  },
  MEDIUM: {
    label: 'Medium Risk',
    icon: AlertTriangle,
    classes: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    badge: 'bg-amber-500/15 text-amber-300',
  },
  HIGH: {
    label: 'High Risk',
    icon: ShieldAlert,
    classes: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    badge: 'bg-rose-500/15 text-rose-300',
  },
}

export function ApprovalCard({ plan, onApprove, onReject, isPending = false }: ApprovalCardProps) {
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null)
  const risk = riskConfig[plan.riskLevel] ?? riskConfig.MEDIUM
  const RiskIcon = risk.icon

  const handleApprove = () => {
    setDecision('approved')
    onApprove()
  }

  const handleReject = () => {
    setDecision('rejected')
    onReject()
  }

  const isDecided = decision !== null

  return (
    <div
      className={`rounded-xl border p-4 mb-3 backdrop-blur-sm transition-all duration-300 ${
        isDecided
          ? decision === 'approved'
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-rose-500/40 bg-rose-500/5 opacity-70'
          : `border ${risk.classes}`
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${risk.badge}`}>
            <RiskIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              Remediation Plan — Awaiting Approval
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Sandbox execution requires human sign-off
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${risk.badge}`}>
          {risk.label}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-foreground/90 mb-3 leading-relaxed">{plan.planSummary}</p>

      {/* Steps */}
      <div className="space-y-1.5 mb-4">
        {plan.steps.map((step) => (
          <div
            key={step.stepNumber}
            className="flex items-start gap-2.5 rounded-lg bg-card/30 border border-border/30 px-3 py-2"
          >
            <span className="shrink-0 mt-0.5 h-4 w-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
              {step.stepNumber}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-foreground/80">{step.description}</p>
              <code className="text-[11px] text-primary/80 font-mono mt-0.5 block truncate">
                {step.command}
              </code>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons or Decision Banner */}
      {!isDecided ? (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
              bg-emerald-500/15 border border-emerald-500/40 text-emerald-300
              hover:bg-emerald-500/25 hover:border-emerald-500/60
              active:scale-98 transition-all duration-150
              text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed
              cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve & Execute
          </button>
          <button
            onClick={handleReject}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
              bg-rose-500/15 border border-rose-500/40 text-rose-300
              hover:bg-rose-500/25 hover:border-rose-500/60
              active:scale-98 transition-all duration-150
              text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed
              cursor-pointer"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </div>
      ) : (
        <div
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold ${
            decision === 'approved'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          {decision === 'approved' ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Approved — executing in sandbox...
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" />
              Rejected — remediation cancelled
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Parse a raw plan JSON string into a typed ApprovalPlan.
 * Returns null if the string is not a valid approval plan.
 */
export function parsePlanForApproval(text: string): ApprovalPlan | null {
  try {
    // Extract JSON from the text (it may be wrapped in backticks or prose)
    const jsonMatch = text.match(/\{[\s\S]*"requiresApproval"[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    if (
      parsed.requiresApproval === true &&
      parsed.planSummary &&
      Array.isArray(parsed.steps) &&
      Array.isArray(parsed.commands)
    ) {
      return parsed as ApprovalPlan
    }
    return null
  } catch {
    return null
  }
}
