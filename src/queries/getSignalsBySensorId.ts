export const GET_SIGNALS_BY_SENSOR_ID = `
  query GetSignalsBySensorId($sensorId: bigint!, $since: timestamptz!) {
    signal(
      where: {
        sensor_id: { _eq: $sensorId }
        end_time: { _gte: $since }
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
