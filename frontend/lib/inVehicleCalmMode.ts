/**
 * In-Vehicle Calm Mode Module (Week 47)
 *
 * Parked-app calm practices and audio-guided breathing for Android Auto / Automotive OS.
 */

export interface InVehicleCalmState {
  isVehicleParked: boolean;
  calmModeActive: boolean;
  driverSafetyNotice: string;
}

export function getInVehicleCalmState(isParked: boolean): InVehicleCalmState {
  return {
    isVehicleParked: isParked,
    calmModeActive: isParked,
    driverSafetyNotice: isParked
      ? 'Vehicle parked. Audio-guided breathing active.'
      : 'Calm practices are restricted while driving.',
  };
}
