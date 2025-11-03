// src/data/exerciseVideos.ts
export interface ExerciseVideo {
  id: string
  title: string
  description: string
  youtubeId: string
  category: string
  duration?: string
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced'
}

export const exerciseVideos: ExerciseVideo[] = [
  {
    id: '1',
    title: 'Hand Rehabilitation Exercise Video 1',
    description: 'Arm & Hand Stretches for Spasticity After Stroke',
    youtubeId: '_ELCjpovYTk',
    category: 'Arm & Hand',
    duration: '10 mins',
    difficulty: 'Beginner'
  },
  {
    id: '2',
    title: 'Hand Rehabilitation Exercise Video 2',
    description: 'Stroke Hand Exercises: For every stage of recovery',
    youtubeId: 'gDxyQGyOx_0',
    category: 'Hand Exercises',
    duration: '12 mins',
    difficulty: 'Beginner'
  },
  {
    id: '3',
    title: 'Leg Rehabilitation Exercise Video 1',
    description: 'Easy Leg Exercises for Stroke Patients (Guided by a Physical Therapist)',
    youtubeId: '-rwby0zA6Vs',
    category: 'Leg Exercises',
    duration: '8 mins',
    difficulty: 'Beginner'
  },
  {
    id: '4',
    title: 'Leg Rehabilitation Exercise Video 2',
    description: 'Leg Exercises For Each Stage Of Stroke Recovery',
    youtubeId: 'KV-wCJRioRw',
    category: 'Leg Exercises',
    duration: '5 mins',
    difficulty: 'Beginner'
  }
]

// Helper function to extract YouTube ID from various URL formats
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct ID
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  return null
}