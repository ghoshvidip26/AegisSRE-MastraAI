export interface Incident {
  id: string;
  service: string;
  severity?: "P1" | "P2" | "P3" | "P4";
  title: string;
  message: string;
  logs: {
    timestamp: string;
    level: "INFO" | "WARN" | "ERROR";
    message: string;
  }[];
  status:
    | "OPEN"
    | "TRIAGING"
    | "PLANNING"
    | "EXECUTING"
    | "RESOLVED"
    | "DIAGNOSING"
    | "FAILED";
  failureReason?: string;
  retryCount?: number;
  createdAt: Date;
}