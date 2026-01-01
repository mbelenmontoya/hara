// Hará Match - Public Recommendations Page
// Purpose: Display matched professionals with contact CTAs
// Security: Fetches via controlled /api/public/recommendations endpoint

import { notFound } from 'next/navigation'
import { ContactButton } from '@/app/components/ContactButton'

interface Recommendation {
  id: string
  rank: number
  reasons: string[]
  attribution_token: string
  professional: {
    slug: string
    name: string
    specialty: string
    whatsapp: string
    bio?: string
    profile_image_url?: string
  }
}

interface RecommendationsData {
  tracking_code: string
  recommendations: Recommendation[]
}

async function getRecommendations(trackingCode: string): Promise<RecommendationsData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const url = `${baseUrl}/api/public/recommendations?tracking_code=${trackingCode}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    console.error('Failed to fetch recommendations:', error)
    return null
  }
}

export default async function RecommendationsPage({
  params,
}: {
  params: { tracking_code: string }
}) {
  const data = await getRecommendations(params.tracking_code)

  if (!data || data.recommendations.length === 0) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4" data-testid="recommendations-page">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Matched Professionals</h1>
        <p className="text-gray-600 mb-8">
          We've carefully selected these professionals based on your needs.
        </p>

        <div className="space-y-6">
          {data.recommendations.map((rec) => (
            <div
              key={rec.id}
              data-testid={`recommendation-${rec.rank}`}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                    #{rec.rank}
                  </div>
                </div>

                <div className="flex-grow">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {rec.professional.name}
                  </h2>
                  <p className="text-gray-600 mb-2">{rec.professional.specialty}</p>

                  {rec.professional.bio && (
                    <p className="text-gray-700 mb-3">{rec.professional.bio}</p>
                  )}

                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Why we recommend:</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {rec.reasons.map((reason, idx) => (
                        <li key={idx} className="text-gray-600 text-sm">
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <ContactButton
                    professionalSlug={rec.professional.slug}
                    professionalName={rec.professional.name}
                    whatsappNumber={rec.professional.whatsapp}
                    trackingCode={data.tracking_code}
                    rank={rec.rank}
                    attributionToken={rec.attribution_token}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
