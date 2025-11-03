// src/components/ExerciseVideos.tsx
'use client'

import { useState } from 'react'
import { exerciseVideos, type ExerciseVideo } from '@/data/exerciseVideos'

export default function ExerciseVideos() {
  const [selectedVideo, setSelectedVideo] = useState<ExerciseVideo | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // Get unique categories
  const categories = ['All', ...new Set(exerciseVideos.map(v => v.category))]

  // Filter videos by category
  const filteredVideos = selectedCategory === 'All' 
    ? exerciseVideos 
    : exerciseVideos.filter(v => v.category === selectedCategory)

  const closeModal = () => setSelectedVideo(null)

  if (exerciseVideos.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center shadow-sm">
        <div className="text-4xl mb-4">📹</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Exercise Videos</h3>
        <p className="text-gray-600 mb-4">Guided rehabilitation exercises and therapy routines</p>
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
          Coming Soon
        </button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">Exercise Videos</h2>
        <p className="text-lg text-gray-600 text-center mb-6">
          Guided rehabilitation exercises and therapy routines
        </p>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video) => (
          <div
            key={video.id}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
            onClick={() => setSelectedVideo(video)}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-200">
              <img
                src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                alt={video.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to standard quality thumbnail if maxres doesn't exist
                  e.currentTarget.src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                <div className="bg-red-600 text-white rounded-full p-4 opacity-90 hover:opacity-100 transition-opacity">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              {video.duration && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {video.category}
                </span>
                {video.difficulty && (
                  <span className={`px-2 py-1 rounded ${
                    video.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                    video.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {video.difficulty}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900">{selectedVideo.title}</h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {/* Video Details */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedVideo.category}
                </span>
                {selectedVideo.difficulty && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedVideo.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                    selectedVideo.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedVideo.difficulty}
                  </span>
                )}
                {selectedVideo.duration && (
                  <span className="text-gray-600 text-sm">⏱️ {selectedVideo.duration}</span>
                )}
              </div>
              <p className="text-gray-700 leading-relaxed">{selectedVideo.description}</p>
              
              <div className="mt-6 pt-6 border-t">
                <a
                  href={`https://www.youtube.com/watch?v=${selectedVideo.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Watch on YouTube
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}