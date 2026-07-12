import { NextRequest, NextResponse} from "next/server";
import { incidentStore } from "@/lib/incidents/incident-store";

/**
 * Infer severity from incident content when not explicitly provided.
 * Uses keyword matching on the title and message to assign a priority level.
 */
function inferSeverity(incident: { title?: string; message?: string; service?: string }): "P1" | "P2" | "P3" | "P4" {
    const text = `${incident.title ?? ''} ${incident.message ?? ''}`.toLowerCase();

    // P1: Complete outage / connection failures / data loss
    if (
        text.includes('connection refused') ||
        text.includes('connection failed') ||
        text.includes('outage') ||
        text.includes('down') ||
        text.includes('unreachable') ||
        text.includes('data loss') ||
        text.includes('crash')
    ) {
        return 'P1';
    }

    // P2: Degraded performance / elevated errors
    if (
        text.includes('timeout') ||
        text.includes('error rate') ||
        text.includes('degraded') ||
        text.includes('high latency') ||
        text.includes('memory leak') ||
        text.includes('pool exhausted')
    ) {
        return 'P2';
    }

    // P3: Warnings / non-critical issues
    if (
        text.includes('warning') ||
        text.includes('retry') ||
        text.includes('slow') ||
        text.includes('disk space')
    ) {
        return 'P3';
    }

    // P4: Informational / low impact
    return 'P4';
}

export async function POST(req: NextRequest) {
    const incident = await req.json();
    console.log("New incident received");
    const createdIncident = incidentStore.create({
        service: incident.service,
        severity: incident.severity ?? inferSeverity(incident),
        title: incident.title,
        message: incident.message,
        status: "OPEN",
    });
    console.log("CREATED INCIDENT: ",createdIncident)

    return NextResponse.json({
        success: true,
        incident: createdIncident
    })
}

export async function GET(){
    return NextResponse.json({
        incident: incidentStore.getAll()
    })
}