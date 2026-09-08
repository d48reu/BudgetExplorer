import amendments from '@/data/fy-2026-27-first-hearing-amendments.json'

export function GET() {
  return Response.json(amendments, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'Content-Disposition':
        'attachment; filename="fy-2026-27-first-hearing-amendments.json"',
    },
  })
}
