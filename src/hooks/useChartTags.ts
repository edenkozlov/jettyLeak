import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

  const fetchTagsRef = useRef(fetchTags)
  fetchTagsRef.current = fetchTags
  const executeCreateTagRef = useRef(executeCreateTag)
  executeCreateTagRef.current = executeCreateTag
  const executeUpdateTagRef = useRef(executeUpdateTag)
  executeUpdateTagRef.current = executeUpdateTag
  const executeDeleteTagRef = useRef(executeDeleteTag)
  executeDeleteTagRef.current = executeDeleteTag

  const [selectedTag, setSelectedTag] = useState<Tag | null>(null)

  useEffect(() => {
    if (sensorId !== null) {
      fetchTagsRef.current({ sensorId })
    }
  }, [sensorId])

  const tags = useMemo(() => tagsData?.tag ?? [], [tagsData])

  const createTag = useCallback(
    async (timestamp: number, title: string, description: string) => {
      if (sensorId === null) return
      await executeCreateTagRef.current({
        sensor_id: sensorId,
        tagged_at: new Date(timestamp).toISOString(),
        title,
        description: description || null,
      })
      fetchTagsRef.current({ sensorId })
    },
    [sensorId],
  )

  const updateTag = useCallback(
    async (id: number, title: string, description: string) => {
      const result = await executeUpdateTagRef.current({
        id,
        title,
        description: description || null,
      })
      if (result?.update_tag_by_pk) {
        setSelectedTag(result.update_tag_by_pk)
      }
      if (sensorId !== null) {
        fetchTagsRef.current({ sensorId })
      }
    },
    [sensorId],
  )

  const deleteTag = useCallback(
    async (id: number) => {
      await executeDeleteTagRef.current({ id })
      setSelectedTag(null)
      if (sensorId !== null) {
        fetchTagsRef.current({ sensorId })
      }
    },
    [sensorId],
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
