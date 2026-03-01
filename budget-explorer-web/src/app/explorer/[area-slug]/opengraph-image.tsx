import { ImageResponse } from 'next/og'
import { getAreaWithDepartments } from '@/lib/db/queries'

export const alt = 'Strategic Area Budget'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ 'area-slug': string }>
}) {
  const { 'area-slug': areaSlug } = await params
  const data = await getAreaWithDepartments(areaSlug)
  const title = data?.area?.name ?? 'Strategic Area'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: '#6B7280',
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Strategic Area
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#111827',
            textAlign: 'center',
            maxWidth: '80%',
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 18,
            color: '#9CA3AF',
          }}
        >
          Miami-Dade Budget Explorer
        </div>
      </div>
    ),
    { ...size }
  )
}
