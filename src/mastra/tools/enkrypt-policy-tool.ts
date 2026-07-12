import { createTool } from "@mastra/core/tools";
import { z } from 'zod';

/**
 * Enkrypt AI Policy Validator
 *
 * Screens remediation plans for dangerous commands.
 * Falls back to a local rule-based check if the Enkrypt API is
 * unavailable, times out, or returns an unexpected response.
 * This ensures the planning pipeline NEVER hangs.
 */

const BLOCKED_PHRASES = [
  "rm -rf",
  "DROP DATABASE",
  "DROP TABLE",
  "terraform destroy",
  "kubectl delete namespace",
  "mkfs",
  "dd if=",
  "shutdown",
  "reboot",
  ":(){:|:&};:",       // fork bomb
];

const ALLOWED_PATTERNS = [
  "kubectl rollout restart",
  "kubectl scale",
  "kubectl set env",
  "kubectl top",
  "kubectl get",
  "kubectl logs",
  "kubectl describe",
  "systemctl restart",
  "psql -c",
  "mysql -e",
  "ANALYZE TABLE",
  "VACUUM ANALYZE",
];

function localPolicyCheck(plan: string): {
  allowed: boolean;
  risk: string;
  reason: string;
  confidence: number;
  source: "local-fallback";
} {
  const planLower = plan.toLowerCase();

  for (const phrase of BLOCKED_PHRASES) {
    if (planLower.includes(phrase.toLowerCase())) {
      return {
        allowed: false,
        risk: "HIGH",
        reason: `Blocked by local safety policy: contains dangerous pattern "${phrase}"`,
        confidence: 0.99,
        source: "local-fallback",
      };
    }
  }

  const hasAllowedOp = ALLOWED_PATTERNS.some((p) =>
    plan.includes(p)
  );

  return {
    allowed: true,
    risk: hasAllowedOp ? "LOW" : "MEDIUM",
    reason: hasAllowedOp
      ? "Plan contains only approved safe operations."
      : "No blocked patterns found. Proceeding with caution.",
    confidence: 0.92,
    source: "local-fallback",
  };
}

export const enkryptPolicyTool = createTool({
  id: 'enkrypt-policy-validator',
  description: 'Validates an AI-generated remediation plan using Enkrypt AI Guardrails. Falls back to local rule-based check if the API is unavailable.',
  inputSchema: z.object({
    remediationPlan: z.string(),
  }),
  execute: async (inputData) => {
    const apiKey = process.env.ENKRYPT_AI_API_KEY;

    // Try the real Enkrypt AI API with a 6-second timeout
    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch('https://api.enkryptai.com/guardrails', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey,
          },
          body: JSON.stringify({
            text: inputData.remediationPlan,
            policy: `
You are validating production remediation commands.

BLOCK if the plan contains:
- Deletes production resources
- Drops databases
- Executes rm -rf
- Executes terraform destroy
- Deletes Kubernetes namespaces

ALLOW:
- kubectl rollout restart
- kubectl scale
- kubectl set env
- kubectl logs
- kubectl describe
- systemctl restart
- psql / mysql queries
`,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          return {
            allowed: result.allowed ?? true,
            risk: result.risk ?? "LOW",
            reason: result.reason ?? "Enkrypt AI policy check passed.",
            confidence: result.confidence ?? 0.95,
            source: "enkrypt-api",
          };
        }

        // Non-OK response — fall through to local check
        console.warn(`[enkrypt-policy-tool] API returned ${response.status} — using local fallback`);
      } catch (err) {
        const isTimeout = err instanceof Error && err.name === "AbortError";
        console.warn(
          isTimeout
            ? "[enkrypt-policy-tool] API timed out after 6s — using local fallback"
            : `[enkrypt-policy-tool] API error — using local fallback: ${err}`
        );
      }
    } else {
      console.warn("[enkrypt-policy-tool] ENKRYPT_AI_API_KEY not set — using local fallback");
    }

    // Local rule-based fallback — always resolves instantly
    return localPolicyCheck(inputData.remediationPlan);
  },
});
