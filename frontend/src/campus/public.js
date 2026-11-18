// UI callers use this facade; graph loading stays lazy and no HTTP API or saved format changes.
export { places } from './l0_axioms/places.js';
export { resolveBuilding as resolveVenue } from './l1_building_blocks/venues.js';
export { findCampusRoute } from './l2_workflows/routing.js';
export { getWeeklyTransfers } from './l2_workflows/transfers.js';
