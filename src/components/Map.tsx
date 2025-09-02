'use client'

interface MapProps {
  center?: { lat: number; lng: number }
  centres?: Array<{
    name: string
    address: string
    lat: number
    lng: number
    type: string
  }>
}

export default function Map({ center, centres }: MapProps) {
  return (
    <div className="w-full h-96 bg-gradient-to-br from-blue-100 via-green-100 to-blue-200 rounded-lg border border-gray-200 relative overflow-hidden">
      {/* Map Placeholder with Malaysia-like styling */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Landmass shapes to simulate Malaysia */}
        <div className="relative w-full h-full">
          {/* Main Peninsula */}
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-32 h-48 bg-green-200 rounded-bl-3xl rounded-br-lg opacity-80"></div>
          
          {/* Borneo-like shape */}
          <div className="absolute top-16 right-12 w-24 h-32 bg-green-300 rounded-2xl opacity-70"></div>
          
          {/* Smaller islands */}
          <div className="absolute top-24 left-12 w-8 h-12 bg-green-300 rounded-full opacity-60"></div>
          <div className="absolute bottom-16 left-1/3 w-6 h-8 bg-green-200 rounded opacity-70"></div>
          
          {/* Centre markers */}
          {centres?.map((centre, index) => (
            <div 
              key={index}
              className="absolute w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors group"
              style={{
                top: `${20 + index * 15}%`,
                left: `${35 + index * 10}%`,
              }}
              title={centre.name}
            >
              <div className="w-2 h-2 bg-white rounded-full"></div>
              
              {/* Hover tooltip */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {centre.name}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          ))}
          
          {/* User location marker */}
          {center && (
            <div 
              className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"
              style={{
                top: '45%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
              title="Your Location"
            ></div>
          )}
          
          {/* Map controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <button className="w-8 h-8 bg-white border border-gray-300 rounded shadow flex items-center justify-center text-lg hover:bg-gray-50 transition-colors font-semibold">
              +
            </button>
            <button className="w-8 h-8 bg-white border border-gray-300 rounded shadow flex items-center justify-center text-lg hover:bg-gray-50 transition-colors font-semibold">
              −
            </button>
          </div>

          {/* Malaysia label */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm">
            <span className="font-semibold text-gray-800">Malaysia</span>
          </div>
        </div>
      </div>
      
      {/* Overlay message */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm text-sm text-gray-700">
        🗺️ Interactive map placeholder - Add Google Maps API key to enable
      </div>
    </div>
  )
}