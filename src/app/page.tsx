export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ScrollLater
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Capture and schedule your ideas
        </p>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Connection Test</h2>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Testing Supabase connection...</span>
          </div>
        </div>
      </div>
    </main>
  )
} 