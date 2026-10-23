import { useEffect, useRef, useState } from 'react'
import * as faceapi from '@vladmandic/face-api'

const MODEL_URL = `${import.meta.env.BASE_URL}models`

const EMOTIONS = {
  neutral: { emoji: '😐', label: 'Neutral' },
  happy: { emoji: '😄', label: 'Happy' },
  sad: { emoji: '😢', label: 'Sad' },
  angry: { emoji: '😠', label: 'Angry' },
  fearful: { emoji: '😨', label: 'Fearful' },
  disgusted: { emoji: '🤢', label: 'Disgusted' },
  surprised: { emoji: '😲', label: 'Surprised' },
}

const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.5,
})

export default function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const modelsReady = useRef(false)

  const [status, setStatus] = useState('idle') // idle | loading | running | error
  const [error, setError] = useState('')
  const [scores, setScores] = useState(null)

  const stop = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setScores(null)
    setStatus('idle')
  }

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  const start = async () => {
    setError('')
    setStatus('loading')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported (needs HTTPS or localhost).')
      }
      if (!modelsReady.current) {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ])
        modelsReady.current = true
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      video.srcObject = stream
      await video.play()
      setStatus('running')
      loop()
    } catch (e) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setError(
        e.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access and try again.'
          : e.message || String(e),
      )
      setStatus('error')
    }
  }

  const loop = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !streamRef.current) return

    if (video.readyState >= 2) {
      const result = await faceapi
        .detectSingleFace(video, DETECTOR_OPTIONS)
        .withFaceExpressions()

      const size = { width: video.videoWidth, height: video.videoHeight }
      faceapi.matchDimensions(canvas, size)
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (result) {
        const { box } = faceapi.resizeResults(result, size).detection
        ctx.strokeStyle = '#7c5cff'
        ctx.lineWidth = 3
        ctx.strokeRect(box.x, box.y, box.width, box.height)
        setScores(result.expressions)
      } else {
        setScores(null)
      }
    }
    if (streamRef.current) rafRef.current = requestAnimationFrame(loop)
  }

  const top = scores
    ? Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
    : null

  return (
    <main className="app">
      <h1>Expression Recognition</h1>
      <p className="sub">Your camera feed is processed locally in your browser — nothing is uploaded.</p>

      <div className="stage">
        <video ref={videoRef} playsInline muted className={status === 'running' ? 'on' : ''} />
        <canvas ref={canvasRef} />
        {status !== 'running' && (
          <div className="overlay">
            {status === 'loading' ? 'Loading models & camera…' : 'Camera is off'}
          </div>
        )}
      </div>

      <div className="controls">
        {status === 'running' ? (
          <button onClick={stop}>Stop camera</button>
        ) : (
          <button onClick={start} disabled={status === 'loading'}>
            Start camera
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}

      {status === 'running' && (
        <section className="result">
          {top ? (
            <>
              <div className="big">
                <span className="emoji">{EMOTIONS[top].emoji}</span>
                <span>{EMOTIONS[top].label}</span>
              </div>
              <ul className="bars">
                {Object.entries(EMOTIONS).map(([key, { emoji, label }]) => {
                  const pct = Math.round((scores[key] ?? 0) * 100)
                  return (
                    <li key={key} className={key === top ? 'top' : ''}>
                      <span className="name">{emoji} {label}</span>
                      <span className="bar"><i style={{ width: `${pct}%` }} /></span>
                      <span className="pct">{pct}%</span>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <p className="sub">No face detected — look at the camera.</p>
          )}
        </section>
      )}
    </main>
  )
}
