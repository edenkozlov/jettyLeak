export const LATEST_REPORT_SUBSCRIPTION = `
  subscription LatestReport($sensorId: bigint!) {
    report(
      where: { sensor_id: { _eq: $sensorId } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      id
      created_at
      flow_value
      temp_value
    }
  }
`
