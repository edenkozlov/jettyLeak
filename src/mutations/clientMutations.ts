export const CREATE_CLIENT = `
  mutation CreateClient(
    $email: String
    $first_name: String
    $last_name: String
  ) {
    insert_client_one(
      object: {
        email: $email
        first_name: $first_name
        last_name: $last_name
      }
    ) {
      id
      created_at
      email
      first_name
      last_name
    }
  }
`

export const UPDATE_CLIENT = `
  mutation UpdateClient(
    $id: uuid!
    $email: String
    $first_name: String
    $last_name: String
  ) {
    update_client_by_pk(
      pk_columns: { id: $id }
      _set: {
        email: $email
        first_name: $first_name
        last_name: $last_name
      }
    ) {
      id
      created_at
      email
      first_name
      last_name
    }
  }
`

export const DELETE_CLIENT = `
  mutation DeleteClient($id: uuid!) {
    delete_client_by_pk(id: $id) {
      id
    }
  }
`
