export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="max-w-2xl mx-auto text-center px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Hará Match
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Performance-based lead marketplace for wellness professionals
        </p>
        <a
          href="/admin/leads"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Admin Portal →
        </a>
      </div>
    </div>
  )
}
