export const GET_DASHBOARD_STATS = `
  query GetDashboardStats {
    client_aggregate {
      aggregate {
        count
      }
    }
    building_aggregate {
      aggregate {
        count
      }
    }
    sensor_aggregate {
      aggregate {
        count
      }
    }
    report_aggregate {
      aggregate {
        count
      }
    }
  }
`
