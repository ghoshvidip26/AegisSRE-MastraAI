import { Incident } from "./incident";

class IncidentStore{
    private incidents: Incident[] = [];

    create(incident: Omit<Incident,"id" | "createdAt">){
        const newIncident: Incident = {
            ...incident,
            id: `INC-${Date.now()}`,
            createdAt: new Date(),
        };
        this.incidents.unshift(newIncident);
        return newIncident;
    }

    getAll(){
        return this.incidents;
    }

     get(id: string) {
        return this.incidents.find(i => i.id === id);
    }

  update(id: string, data: Partial<Incident>) {
    const incident = this.get(id);

    if (!incident) return;

    Object.assign(incident, data);

    return incident;
  }
}
export const incidentStore = new IncidentStore();