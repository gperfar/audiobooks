import { useCallback, useEffect, useRef, useState } from 'react'

// Shared audio playback for the player and the editor. currentTime is updated
// every animation frame while playing so sentence highlighting stays in sync.
export function useStoryAudio(audioUrl) {
  const audioRef = useRef(null)
  const animationFrameRef = useRef(null)

  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasEnded, setHasEnded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!audioUrl) {
      return undefined
    }

    const audio = new Audio(audioUrl)
    audio.preload = 'auto'
    audioRef.current = audio

    function handleLoadedMetadata() {
      setDuration(Number(audio.duration) || 0)
      setIsReady(true)
    }

    function handlePlay() {
      setIsPlaying(true)
      setHasEnded(false)
    }

    function handlePause() {
      setIsPlaying(false)
      setCurrentTime(audio.currentTime)
    }

    function handleEnded() {
      setIsPlaying(false)
      setHasEnded(true)
      setCurrentTime(audio.duration)
    }

    function handleError() {
      setErrorMessage('No se pudo cargar el audio del cuento.')
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
      setIsReady(false)
      setIsPlaying(false)
    }
  }, [audioUrl])

  useEffect(() => {
    if (!isPlaying) {
      return undefined
    }

    function updateTime() {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime)
      }

      animationFrameRef.current = requestAnimationFrame(updateTime)
    }

    animationFrameRef.current = requestAnimationFrame(updateTime)

    return () => cancelAnimationFrame(animationFrameRef.current)
  }, [isPlaying])

  const play = useCallback(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    if (audio.ended) {
      audio.currentTime = 0
    }

    audio.play().catch(() => {
      setErrorMessage('No se pudo reproducir el audio.')
    })
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const toggle = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      pause()
    } else {
      play()
    }
  }, [pause, play])

  const seek = useCallback((time) => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    const maxTime = Number(audio.duration) || 0
    const nextTime = Math.min(Math.max(time, 0), maxTime)

    audio.currentTime = nextTime
    setCurrentTime(nextTime)
    setHasEnded(false)
  }, [])

  const getTime = useCallback(() => audioRef.current?.currentTime ?? 0, [])

  return {
    isReady,
    isPlaying,
    hasEnded,
    currentTime,
    duration,
    errorMessage,
    play,
    pause,
    toggle,
    seek,
    getTime,
  }
}
