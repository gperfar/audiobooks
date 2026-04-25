import { audioBucketName, coverBucketName, requireSupabase } from './supabase.js'

function buildFilePath(file) {
  const safeName = file.name.replace(/\s+/g, '-').toLowerCase()
  return `${crypto.randomUUID()}-${safeName}`
}

async function uploadPublicFile(bucketName, file) {
  const supabase = requireSupabase()
  const filePath = buildFilePath(file)

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath)

  return data.publicUrl
}

export async function uploadAudioFile(file) {
  return uploadPublicFile(audioBucketName, file)
}

export async function uploadCoverImage(file) {
  return uploadPublicFile(coverBucketName, file)
}

export async function createStory({ title, audioUrl, coverImageUrl = null }) {
  const supabase = requireSupabase()

  const { data, error } = await supabase
    .from('stories')
    .insert({
      title,
      audio_url: audioUrl,
      cover_image_url: coverImageUrl,
      listen_count: 0,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateStoryCoverImage(storyId, coverImageUrl) {
  const supabase = requireSupabase()

  const { data, error } = await supabase
    .from('stories')
    .update({
      cover_image_url: coverImageUrl,
    })
    .eq('id', storyId)
    .select('id, cover_image_url')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'No se pudo guardar la portada. Agrega una política UPDATE para la tabla stories para que el rol anon pueda actualizar cover_image_url.',
    )
  }

  return data
}

export async function updateStoryTitle(storyId, title) {
  const supabase = requireSupabase()

  const { data, error } = await supabase
    .from('stories')
    .update({
      title,
    })
    .eq('id', storyId)
    .select('id, title')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'No se pudo guardar el título. Agrega una política UPDATE para la tabla stories para que el rol anon pueda actualizar title.',
    )
  }

  return data
}

export async function incrementStoryListenCount(storyId, currentCount = 0) {
  const supabase = requireSupabase()
  const nextCount = currentCount + 1

  const { data, error } = await supabase
    .from('stories')
    .update({
      listen_count: nextCount,
    })
    .eq('id', storyId)
    .select('id, listen_count')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'No se pudo guardar el contador de escuchas. Agrega una política UPDATE para la tabla stories para que el rol anon pueda actualizar listen_count.',
    )
  }

  return data
}

export async function deleteStory(storyId) {
  const supabase = requireSupabase()

  const { error } = await supabase.from('stories').delete().eq('id', storyId)

  if (error) {
    throw error
  }
}

export async function createSegments(storyId, sentences) {
  const supabase = requireSupabase()

  const payload = sentences.map((sentence, index) => ({
    story_id: storyId,
    text: sentence,
    start_time: null,
    end_time: null,
    order: index,
  }))

  const { data, error } = await supabase
    .from('segments')
    .insert(payload)
    .select()
    .order('order', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

export async function fetchStoryWithSegments(storyId) {
  const supabase = requireSupabase()

  const { data, error } = await supabase
    .from('stories')
    .select(
      `
        id,
        title,
        audio_url,
        cover_image_url,
        listen_count,
        created_at,
        segments (
          id,
          story_id,
          text,
          start_time,
          end_time,
          order
        )
      `,
    )
    .eq('id', storyId)
    .single()

  if (error) {
    throw error
  }

  return {
    ...data,
    segments: [...(data.segments ?? [])].sort((a, b) => a.order - b.order),
  }
}

export async function getAllStoriesWithSegmentStats() {
  const supabase = requireSupabase()

  const [{ data: stories, error: storiesError }, { data: segments, error: segmentsError }] =
    await Promise.all([
      supabase
        .from('stories')
        .select('id, title, audio_url, cover_image_url, listen_count, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('segments').select('story_id, start_time'),
    ])

  if (storiesError) {
    throw storiesError
  }

  if (segmentsError) {
    throw segmentsError
  }

  const segmentStatsByStoryId = (segments ?? []).reduce((statsMap, segment) => {
    const currentStats = statsMap.get(segment.story_id) ?? {
      totalSegments: 0,
      syncedSegments: 0,
    }

    currentStats.totalSegments += 1

    if (typeof segment.start_time === 'number') {
      currentStats.syncedSegments += 1
    }

    statsMap.set(segment.story_id, currentStats)
    return statsMap
  }, new Map())

  return (stories ?? []).map((story) => {
    const stats = segmentStatsByStoryId.get(story.id) ?? {
      totalSegments: 0,
      syncedSegments: 0,
    }

    return {
      ...story,
      ...stats,
      isSynced: stats.totalSegments > 0 && stats.syncedSegments === stats.totalSegments,
    }
  })
}

export async function saveSegmentsTiming(segments) {
  const supabase = requireSupabase()

  for (const segment of segments) {
    const { error } = await supabase
      .from('segments')
      .update({
        start_time: segment.start_time,
        end_time: segment.end_time,
      })
      .eq('id', segment.id)

    if (error) {
      throw error
    }
  }
}

export async function updateSegmentText(segmentId, text) {
  const supabase = requireSupabase()

  const { data, error } = await supabase
    .from('segments')
    .update({
      text,
    })
    .eq('id', segmentId)
    .select('id, text')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'No se pudo guardar el texto de la frase. Agrega una política UPDATE para la tabla segments para que el rol anon pueda actualizar text.',
    )
  }

  return data
}
