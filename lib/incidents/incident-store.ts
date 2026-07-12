import { Incident } from "./incident";
console.log("IncidentStore initialized");
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
        console.log("INCIDENTS: ",this.incidents);
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

  clear() {
    this.incidents = [];
    console.log("IncidentStore cleared");
  }
}
declare global {
  // eslint-disable-next-line no-var
  var incidentStore: IncidentStore | undefined;
}

export const incidentStore =
  globalThis.incidentStore ??
  new IncidentStore();

if (process.env.NODE_ENV !== "production") {
  globalThis.incidentStore = incidentStore;
}