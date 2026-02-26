export const GET_REPORTS_BY_SENSOR_ID = `
  query GetReportsBySensorId($sensorId: bigint!, $since: timestamptz!, $until: timestamptz!) {
    report(
      where: {
        sensor_id: { _eq: $sensorId }
        created_at: { _gte: $since, _lte: $until }
      }
      order_by: { created_at: asc }
    ) {
      id
      created_at
      sensor_id
      flow_value
      temp_value
    }
  }
`
