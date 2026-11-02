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

// Ids are list positions (that's how they map to the .cuento manifest), so
// they are renumbered after removing a sentence.
function renumber(segments) {
  return segments.map((segment, index) => ({ ...segment, id: String(index), order: index }))
}

// The previous sentence takes over the removed one's time span, so playback
// has no gap.
export function removeSegment(segments, index) {
  const removed = segments[index]

  return renumber(
    segments
      .map((segment, currentIndex) =>
        currentIndex === index - 1 ? { ...segment, end_time: removed.end_time ?? null } : segment,
      )
      .filter((_, currentIndex) => currentIndex !== index),
  )
}

export function mergeSegmentWithNext(segments, index) {
  const current = segments[index]
  const next = segments[index + 1]

  if (!next) {
    return segments
  }

  const merged = {
    ...current,
    text: `${current.text} ${next.text}`,
    start_time: current.start_time ?? next.start_time ?? null,
    end_time: next.end_time ?? null,
  }

  return renumber(
    segments
      .map((segment, currentIndex) => (currentIndex === index ? merged : segment))
      .filter((_, currentIndex) => currentIndex !== index + 1),
  )
}
