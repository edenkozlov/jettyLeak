import { useCallback, useEffect, useMemo, useState } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import { GET_TAGS_BY_SENSOR_ID } from '@/queries/getTagsBySensorId'
import { CREATE_TAG, DELETE_TAG, UPDATE_TAG } from '@/mutations/tagMutations'

import type { Tag } from '@/types'

interface TagsResponse {
  tag: Tag[]
}

interface CreateTagResponse {
  insert_tag_one: Tag
}

interface UpdateTagResponse {
  update_tag_by_pk: Tag
}

interface DeleteTagResponse {
  delete_tag_by_pk: { id: number }
}

export function useChartTags(sensorId: number | null) {
  const {
    data: tagsData,
    loading: tagsLoading,
    executeQuery: fetchTags,
  } = useGraphQL<TagsResponse>(GET_TAGS_BY_SENSOR_ID)

  const { executeQuery: executeCreateTag } =
    useGraphQL<CreateTagResponse>(CREATE_TAG)
  const { executeQuery: executeUpdateTag } =
    useGraphQL<UpdateTagResponse>(UPDATE_TAG)
  const { executeQuery: executeDeleteTag } =
    useGraphQL<DeleteTagResponse>(DELETE_TAG)

  const [selectedTag, setSelectedTag] = useState<Tag | null>(null)

  useEffect(() => {
    if (sensorId !== null) {
      fetchTags({ sensorId })
    }
  }, [sensorId, fetchTags])

  const tags = useMemo(() => tagsData?.tag ?? [], [tagsData])

  const createTag = useCallback(
    async (timestamp: number, title: string, description: string) => {
      if (sensorId === null) return
      await executeCreateTag({
        sensor_id: sensorId,
        tagged_at: new Date(timestamp).toISOString(),
        title,
        description: description || null,
      })
      fetchTags({ sensorId })
    },
    [sensorId, executeCreateTag, fetchTags],
  )

  const updateTag = useCallback(
    async (id: number, title: string, description: string) => {
      const result = await executeUpdateTag({
        id,
        title,
        description: description || null,
      })
      if (result?.update_tag_by_pk) {
        setSelectedTag(result.update_tag_by_pk)
      }
      if (sensorId !== null) {
        fetchTags({ sensorId })
      }
    },
    [sensorId, executeUpdateTag, fetchTags],
  )

  const deleteTag = useCallback(
    async (id: number) => {
      await executeDeleteTag({ id })
      setSelectedTag(null)
      if (sensorId !== null) {
        fetchTags({ sensorId })
      }
    },
    [sensorId, executeDeleteTag, fetchTags],
  )

  return {
    tags,
    tagsLoading,
    selectedTag,
    setSelectedTag,
    createTag,
    updateTag,
    deleteTag,
  }
}
