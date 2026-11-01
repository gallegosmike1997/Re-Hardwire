/**
 * Epic & Cerner EHR SMART-on-FHIR Connector Interface (Week 31)
 *
 * Provides OAuth2 launch endpoints and FHIR client configuration for
 * healthcare health record interoperability.
 */

export interface EhrServerConfig {
  vendor: 'epic' | 'cerner' | 'generic_fhir';
  clientId: string;
  fhirBaseUrl: string;
}

export function generateSmartOnFhirAuthUrl(config: EhrServerConfig, redirectUri: string): string {
  const scope = encodeURIComponent('launch/patient patient/Observation.read patient/Observation.write openid fhirUser');
  return `${config.fhirBaseUrl}/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(config.clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
}
