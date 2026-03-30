export const GET_CLIENTS = `
  query GetClients {
    client(order_by: { created_at: desc }) {
      id
      created_at
      email
      first_name
      last_name
      buildings_aggregate {
        aggregate {
          count
        }
      }
      buildings {
        id
        bhi
        bhi_label
        sensors_aggregate {
          aggregate {
            count
          }
        }
      }
    }
  }
`
