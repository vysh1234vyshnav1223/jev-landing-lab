'use client'

import { App } from '@/components/App'
import { InkLanding } from '@/components/landing/InkLanding'

export default function Page() {
  return <App Landing={InkLanding} holdRun />
}
