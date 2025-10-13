import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Clinical Trial Criteria Extractor',
  description: 'Upload documents to extract inclusion and exclusion criteria',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
