export function findActiveSegment(segments, time) {
  return (
    segments.find((segment) => {
      if (typeof segment.start_time !== 'number') {
        return false
      }

      const endTime =
        typeof segment.end_time === 'number'
          ? segment.end_time
          : Number.POSITIVE_INFINITY

      return segment.start_time <= time && time < endTime
    }) ?? null
  )
}

export function updateSegmentTiming(segments, index, time) {
  return segments.map((segment, currentIndex) => {
    if (currentIndex === index) {
      return { ...segment, start_time: time }
    }

    if (currentIndex === index - 1) {
      return { ...segment, end_time: time }
    }

    return segment
  })
}
