export const GET_SIGNALS_BY_SENSOR_ID = `
  query GetSignalsBySensorId($sensorId: bigint!, $since: timestamptz!, $until: timestamptz!) {
    signal(
      where: {
        sensor_id: { _eq: $sensorId }
        end_time: { _gte: $since }
        start_time: { _lte: $until }
      }
      order_by: { start_time: asc }
    ) {
      id
      created_at
      value
      time
      sensor_id
      start_time
      end_time
    }
  }
`
