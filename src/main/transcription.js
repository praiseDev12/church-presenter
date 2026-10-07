// src/main/transcription.js
import { DeepgramClient } from '@deepgram/sdk'

let deepgramConnection = null
let transcriptBuffer = ''
let audioQueue = [] // holds chunks that arrive before connection is ready
let isReady = false // true once waitForOpen() resolves

let isStarting = false // prevent duplicate connections

export async function startTranscription(onTranscript, onError) {
  audioQueue = []
  isReady = false

  if (isStarting || deepgramConnection) {
    console.log('Transcription already running — ignoring duplicate start')
    return
  }
  isStarting = true

  try {
    const client = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY })

    const connection = await client.listen.v1.connect({
      model: 'nova-2',
      language: 'en',
      punctuate: true,
      smart_format: true,
      interim_results: false
      // Do NOT set encoding or sample_rate for WebM — Deepgram detects from container
    })

    connection.on('open', () => {
      console.log('Deepgram connection opened')
    })

    connection.on('message', (data) => {
      if (data.type === 'Results') {
        const transcript = data.channel?.alternatives?.[0]?.transcript
        if (transcript && data.is_final) {
          transcriptBuffer += ' ' + transcript

          const words = transcriptBuffer.split(' ')
          if (words.length > 200) {
            transcriptBuffer = words.slice(-200).join(' ')
          }

          onTranscript(transcript, transcriptBuffer)
        }
      }
    })

    connection.on('error', (err) => {
      console.error('Deepgram error:', err)
      onError(err?.message || 'Transcription error')
    })

    connection.on('close', (event) => {
      console.log('Deepgram connection closed', event?.code, event?.reason)
      isReady = false
    })

    connection.connect()
    await connection.waitForOpen()

    deepgramConnection = connection
    isReady = true

    // Flush any chunks that arrived before connection was ready
    console.log(`Flushing ${audioQueue.length} queued audio chunks`)
    for (const chunk of audioQueue) {
      connection.socket.send(chunk)
    }
    audioQueue = []

    console.log('Deepgram ready to receive audio')
  } catch (err) {
    console.error('Failed to start Deepgram:', err)
    onError(err.message)
  } finally {
    isStarting = false
  }
}

export function sendAudioChunk(audioBuffer) {
  if (!isReady || !deepgramConnection?.socket) {
    // Queue chunk until connection is ready
    audioQueue.push(audioBuffer)
    return
  }

  try {
    deepgramConnection.socket.send(audioBuffer)
  } catch (err) {
    console.error('Error sending audio chunk:', err)
  }
}

export function stopTranscription() {
  isStarting = false
  isReady = false
  audioQueue = []
  if (deepgramConnection) {
    try {
      deepgramConnection.socket?.close()
    } catch {
      // ignore
    }
    deepgramConnection = null
  }
  transcriptBuffer = ''
}
