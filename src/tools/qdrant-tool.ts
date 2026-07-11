import { QdrantClient } from '@qdrant/js-client-rest'

export const qdrantClient = new QdrantClient({
    url: "https://225df41e-49fa-47e1-803d-38e8914d57d9.us-west-2-0.aws.cloud.qdrant.io",
    apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6YjIzMjdhOWUtZTA2My00MzRmLWExZjctZDNiMGQxM2E4ZGIzIn0.MeeBMPzDWdfTi8xhrSs6ftelGSWLcHyTjmimsPk-Mx0",
});