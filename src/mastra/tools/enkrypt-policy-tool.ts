import { createTool } from "@mastra/core/tools";
import { z } from 'zod';

export const enkryptPolicyTool = createTool({
    id: 'enkrypt-policy-validator',
    description: 'Validates an AI-generated remediation plan using Enkrypt AI Guardrails.',
    inputSchema: z.object({
        remediationPlan: z.string(),
    }),
    execute: async (inputData) => {
        const response = await fetch('https://api.enkryptai.com/guardrails', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.ENKRYPT_API_KEY}`,
            },
            body: JSON.stringify({
                text: inputData.remediationPlan,

                policy: `
You are validating production remediation commands.

BLOCK if:
- Deletes production resources
- Drops databases
- Executes rm -rf
- Executes terraform destroy
- Deletes Kubernetes namespaces

ALLOW:
- kubectl rollout restart
- kubectl logs
- kubectl describe
- restart redis
`,
            }),
        });

        if (!response.ok) {
            throw new Error(`Enkrypt policy check failed: ${response.statusText}`);
        }

        const result = await response.json();
        return {
            allowed: result.allowed,
            risk: result.risk,
            reason: result.reason,
            confidence: result.confidence,
        };
    }
})
