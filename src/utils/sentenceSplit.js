export function splitStoryIntoSentences(text) {
  const normalizedText = text.replace(/\s+/g, ' ').trim()

  if (!normalizedText) {
    return []
  }

  return (
    normalizedText
      .match(/[^.!?]+[.!?]?/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? []
  )
}
