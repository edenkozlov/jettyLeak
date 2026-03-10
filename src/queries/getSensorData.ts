export const GET_SENSOR_DATA = `
  query GetSensorData(
    $sensorId: bigint!
    $since: timestamptz!
    $until: timestamptz!
    $reportLimit: Int
    $magSensorIds: [bigint!]!
    $magLimit: Int
  ) {
    report(
      where: {
        sensor_id: { _eq: $sensorId }
        created_at: { _gte: $since, _lte: $until }
      }
      order_by: { created_at: asc }
      limit: $reportLimit
    ) {
      id
      created_at
      sensor_id
      flow_value
      temp_value
    }
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
    mag_report(
      where: {
        sensor_id: { _in: $magSensorIds }
        created_at: { _gte: $since, _lte: $until }
      }
      order_by: { created_at: asc }
      limit: $magLimit
    ) {
      id
      created_at
      x_axis_reading
      y_axis_reading
      z_axis_reading
      total_magnitude
      sensor_id
      band_energy_10s
      band_energy_60s
      band_energy_5m
      dominant_freq_hz
      vibration_rpm
    }
  }
`
