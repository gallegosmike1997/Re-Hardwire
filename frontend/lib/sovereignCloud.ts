/**
 * Sovereign Cloud & On-Premise Hospital Deployment Configuration (Week 50)
 *
 * Containerized, air-gapped hospital deployment configurations for strict data sovereignty.
 */

export interface HospitalOnPremConfig {
  hospitalName: string;
  onPremFhirEndpoint: string;
  dataSovereigntyVerified: boolean;
}

export function getHospitalOnPremConfig(): HospitalOnPremConfig {
  return {
    hospitalName: 'St. Jude Health System On-Premise',
    onPremFhirEndpoint: 'https://fhir.stjude-onprem.internal/r4',
    dataSovereigntyVerified: true,
  };
}
