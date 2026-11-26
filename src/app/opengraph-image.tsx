import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

export const alt = 'CVForge: Free CV Builder & ATS-Style Resume Analyzer'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage() {
  const logoBuffer = await readFile(join(process.cwd(), 'public/brand/anvilary-tools-256.png'))
  const logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '68px 72px',
          color: '#ededea',
          background:
            'radial-gradient(circle at 78% 88%, rgba(217, 116, 66, 0.34), transparent 34%), radial-gradient(circle at 20% 0%, rgba(185, 87, 37, 0.16), transparent 28%), linear-gradient(135deg, #0e0e10 0%, #181316 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <img src={logoDataUri} width="46" height="46" alt="" />
          <span style={{ fontSize: '30px', fontWeight: 600 }}>CVForge</span>
          <span
            style={{
              marginLeft: '12px',
              padding: '8px 14px',
              border: '1px solid rgba(217, 116, 66, 0.38)',
              borderRadius: '999px',
              color: '#d97442',
              fontSize: '16px',
            }}
          >
            Local-first
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ maxWidth: '930px', fontSize: '66px', lineHeight: 1.04, fontWeight: 600, letterSpacing: '-2.5px' }}>
            Build and analyze your CV locally
          </div>
          <div style={{ maxWidth: '840px', color: '#b8b6b0', fontSize: '24px', lineHeight: 1.45 }}>
            Structured editing, reliable backup, PDF export, and transparent ATS-style improvement signals.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', padding: '13px 20px', border: '1px solid #2f2f36', borderRadius: '12px', background: 'rgba(22, 22, 26, 0.82)', fontSize: '18px' }}>
            Builder
          </div>
          <div style={{ color: '#85827a', fontSize: '20px' }}>+</div>
          <div style={{ display: 'flex', padding: '13px 20px', border: '1px solid rgba(217, 116, 66, 0.42)', borderRadius: '12px', background: 'rgba(22, 22, 26, 0.82)', fontSize: '18px' }}>
            Analyzer
          </div>
          <div style={{ marginLeft: 'auto', color: '#9a978f', fontSize: '17px' }}>
            No account · Browser-based · Open-source
          </div>
        </div>
      </div>
    ),
    size,
  )
}
