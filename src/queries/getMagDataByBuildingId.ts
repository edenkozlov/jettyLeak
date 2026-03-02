export const GET_MAG_SENSORS_BY_BUILDING_ID = `
  query GetMagSensorsByBuildingId($buildingId: bigint!) {
    mag_to_building(where: { building_id: { _eq: $buildingId } }) {
      mag_id
    }
  }
`

export const GET_MAG_REPORTS_BY_SENSOR_IDS = `
  query GetMagReportsBySensorIds($sensorIds: [bigint!]!, $since: timestamptz!, $until: timestamptz!) {
    mag_report(
      where: {
        sensor_id: { _in: $sensorIds }
        created_at: { _gte: $since, _lte: $until }
      }
      order_by: { created_at: asc }
    ) {
      id
      created_at
      x_axis_reading
      y_axis_reading
      z_axis_reading
      total_magnitude
      sensor_id
    }
  }
`
