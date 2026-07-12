import { NextRequest, NextResponse} from "next/server";
import { incidentStore } from "@/lib/incidents/incident-store";

export async function POST(req: NextRequest) {
    const incident = await req.json();
    console.log("New incident received");
    const createdIncident = incidentStore.create({
        service: incident.service,
        severity: undefined,
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