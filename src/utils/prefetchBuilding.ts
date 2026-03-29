import { cachedGraphqlFetch } from '@/utils/graphqlFetch'
import { GET_BUILDING_BY_ID } from '@/queries/getBuildingById'
import { GET_MAG_SENSORS_BY_BUILDING_ID } from '@/queries/getMagDataByBuildingId'
import { GET_SENSORS_BY_BUILDING_ID } from '@/queries/getSensorsByBuildingId'

/**
 * Fire-and-forget prefetch of building data + sensor metadata.
 * Call on hover / pointer-enter so data is cached by the time
 * the user navigates to the building detail page.
 */
export function prefetchBuilding(
  id: string | number,
  token: string | null,
): void {
  cachedGraphqlFetch(GET_BUILDING_BY_ID, { id: String(id) }, token).catch(
    () => {},
  )

  const numericId =
    typeof id === 'string' ? parseInt(id, 10) : id
  if (!Number.isNaN(numericId)) {
    cachedGraphqlFetch(
      GET_MAG_SENSORS_BY_BUILDING_ID,
      { buildingId: numericId },
      token,
    ).catch(() => {})
    cachedGraphqlFetch(
      GET_SENSORS_BY_BUILDING_ID,
      { buildingId: numericId },
      token,
    ).catch(() => {})
  }
}
