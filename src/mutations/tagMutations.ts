export const CREATE_TAG = `
  mutation CreateTag(
    $sensor_id: bigint
    $tagged_at: timestamptz!
    $title: String!
    $description: String
  ) {
    insert_tag_one(
      object: {
        sensor_id: $sensor_id
        tagged_at: $tagged_at
        title: $title
        description: $description
      }
    ) {
      id
      created_at
      sensor_id
      tagged_at
      title
      description
    }
  }
`

export const UPDATE_TAG = `
  mutation UpdateTag(
    $id: bigint!
    $title: String!
    $description: String
  ) {
    update_tag_by_pk(
      pk_columns: { id: $id }
      _set: {
        title: $title
        description: $description
      }
    ) {
      id
      created_at
      sensor_id
      tagged_at
      title
      description
    }
  }
`

export const DELETE_TAG = `
  mutation DeleteTag($id: bigint!) {
    delete_tag_by_pk(id: $id) {
      id
    }
  }
`
