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

// The sentence that "Siguiente frase" marks at this time: the one after the
// last sentence that already started. After rewinding, lockedIndex keeps the
// button on the sentence to re-mark even if the audio passes its old (too
// early) mark, until the audio reaches the following sentence's mark.
export function getNextSegmentIndex(segments, time, lockedIndex = null) {
  if (lockedIndex !== null && lockedIndex < segments.length) {
    const followingStart = segments[lockedIndex + 1]?.start_time

    if (!(typeof followingStart === 'number' && followingStart <= time)) {
      return lockedIndex
    }
  }

  let lastStartedIndex = -1

  segments.forEach((segment, index) => {
    if (typeof segment.start_time === 'number' && segment.start_time <= time) {
      lastStartedIndex = index
    }
  })

  return lastStartedIndex + 1
}
