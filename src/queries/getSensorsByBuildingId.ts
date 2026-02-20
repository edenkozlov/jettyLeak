export const GET_SENSORS_BY_BUILDING_ID = `
  query GetSensorsByBuildingId($buildingId: bigint!) {
    sensor(
      where: { building_id: { _eq: $buildingId } }
      order_by: { created_at: desc }
    ) {
      id
      created_at
      name
      location
      building_id
    }
  }
`
