import { ImageResponse } from 'next/og'

export const alt = 'Miami-Dade Budget Explorer'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
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
            fontSize: 64,
            fontWeight: 700,
            color: '#111827',
            textAlign: 'center',
            maxWidth: '80%',
          }}
        >
          Miami-Dade Budget Explorer
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#6B7280',
            marginTop: 16,
          }}
        >
          See where your tax dollars go
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 18,
            color: '#9CA3AF',
          }}
        >
          budgetexplorer.miami
        </div>
      </div>
    ),
    { ...size }
  )
}
