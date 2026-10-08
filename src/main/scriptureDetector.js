import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI = null
let lastDetectionTime = 0
let lastWordCount = 0
let recentlyDetected = []

const COOLDOWN_MS = 1500 // reduce from 3000
const MIN_NEW_WORDS = 5 // reduce from 12

function getClient() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return genAI
}

export async function detectScripture(transcriptBuffer, mode = 'standard') {
  const now = Date.now()

  // Log why we might be skipping
  console.log(
    'Detection check — cooldown remaining:',
    Math.max(0, COOLDOWN_MS - (now - lastDetectionTime)),
    'ms'
  )

  if (now - lastDetectionTime < COOLDOWN_MS) {
    console.log('Skipping — cooldown active')
    return null
  }

  const wordCount = transcriptBuffer.trim().split(' ').length
  console.log('Word count:', wordCount, 'last:', lastWordCount, 'diff:', wordCount - lastWordCount)

  if (wordCount - lastWordCount < MIN_NEW_WORDS) {
    console.log('Skipping — not enough new words')
    return null
  }
  lastWordCount = wordCount
  lastDetectionTime = now

  console.log('Sending to Gemini — buffer:', transcriptBuffer.slice(-200))

  const modeInstructions = {
    conservative:
      'Only identify a Bible reference if the speaker explicitly states a book name AND chapter AND verse number together, e.g. "John chapter 3 verse 16" or "Romans 8:28".',
    standard:
      'Identify Bible references when the speaker clearly names a specific passage. "Turn to John 3:16", "as Paul wrote in Romans 8", or "Psalm 23" are all valid.',
    aggressive:
      'Identify Bible references including well-known passages even if only partially quoted. "For God so loved the world" should return John 3:16. "The Lord is my shepherd" should return Psalm 23:1.'
  }

  const prompt = `You are monitoring a live church sermon transcript. Analyze this excerpt and identify any Bible verse references.

${modeInstructions[mode] || modeInstructions.standard}

Additional rules:
- Return ONLY a JSON array, no explanation, no markdown, no code blocks
- If no reference found, return exactly: []
- IMPORTANT: Convert spoken numbers to digits. Examples:
  "three sixteen" → chapter 3 verse 16
  "chapter three verse sixteen" → chapter 3 verse 16  
  "eleven verse six" → chapter 11 verse 6
  "twenty third psalm" → Psalm 23
- For verse ranges, return only the first verse
- Format: [{"book": "John", "chapter": 3, "verse": 16}]
- Common book name variations: "the Gospel of John" → John, "First Corinthians" → 1 Corinthians

Transcript excerpt:
"${transcriptBuffer.slice(-600)}"

JSON:`

  try {
    const client = getClient()
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    console.log('Gemini raw response:', text) // ← add this line

    // Clean up response — remove any markdown backticks if present
    const cleaned = text.replace(/```json|```/g, '').trim()

    let references = []
    try {
      references = JSON.parse(cleaned)
    } catch {
      return null
    }

    if (!Array.isArray(references) || references.length === 0) return null

    // Loop through ALL detected references, newest ones are LAST
    // Reverse the array so we check the most recently mentioned first
    const reversed = [...references].reverse()

    for (const ref of reversed) {
      if (!ref.book || !ref.chapter || !ref.verse) continue

      const refKey = `${ref.book}-${ref.chapter}-${ref.verse}`

      if (recentlyDetected.includes(refKey)) {
        console.log('Skipping already shown:', refKey)
        continue
      }

      // This is a new verse — mark it and return it
      console.log('New verse found:', refKey)
      recentlyDetected.push(refKey)

      setTimeout(() => {
        recentlyDetected = recentlyDetected.filter((r) => r !== refKey)
      }, 30000)

      return ref
    }

    console.log('All references already shown:', recentlyDetected)
    return null
  } catch (err) {
    console.error('Gemini detection error:', err)
    return null
  }
}

export function resetDetector() {
  lastDetectionTime = 0
  lastWordCount = 0
  recentlyDetected = []
}
