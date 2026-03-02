export const LATEST_MAG_REPORT_SUBSCRIPTION = `
  subscription LatestMagReport($sensorIds: [bigint!]!) {
    mag_report(
      where: { sensor_id: { _in: $sensorIds } }
      order_by: { created_at: desc }
      limit: 1
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
