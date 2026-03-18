export const GET_MAG_REPORTS = `
  query GetMagReports($sensorIds: [bigint!]!, $since: timestamptz!, $until: timestamptz!) {
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
      band_energy_10s
      band_energy_60s
      band_energy_5m
      dominant_freq_hz
      vibration_rpm
    }
  }
`
