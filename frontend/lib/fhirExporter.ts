/**
 * Clinical EHR HL7 FHIR Exporter (Week 23)
 *
 * Formats local support plans and self-reported coping metrics into
 * standardized HL7 FHIR Observation JSON bundles for healthcare systems.
 */
import { getStorage } from './storage';
import { config } from './config';

export interface FhirObservationBundle {
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;
  entry: Array<{
    resource: {
      resourceType: 'Observation';
      status: 'final';
      code: { coding: Array<{ system: string; code: string; display: string }> };
      valueString?: string;
      valueQuantity?: { value: number; unit: string };
    };
  }>;
}

export function generateFhirJsonBundle(): FhirObservationBundle {
  const wins = getStorage<Array<unknown>>(config.storage.winsKey) ?? [];
  const supportPlan = getStorage<{ answers?: Record<string, string> }>(config.storage.supportPlanKey);

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: [
      {
        resource: {
          resourceType: 'Observation',
          status: 'final',
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '71802-3',
                display: 'Self-reported coping and resilience score',
              },
            ],
          },
          valueQuantity: { value: wins.length, unit: 'micro-wins' },
        },
      },
      {
        resource: {
          resourceType: 'Observation',
          status: 'final',
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '8684-2',
                display: 'Personal Support Plan Worksheet Summary',
              },
            ],
          },
          valueString: JSON.stringify(supportPlan?.answers ?? {}),
        },
      },
    ],
  };
}
