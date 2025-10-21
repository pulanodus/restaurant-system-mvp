'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { CartProvider } from '@/contexts/CartContext'
import BottomNavBar from './BottomNavBar'

interface DynamicLayoutProps {
  children: React.ReactNode
}

export default function DynamicLayout({ children }: DynamicLayoutProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Force rebuild to clear any caching issues
  
  // Extract sessionId from pathname or search params
  let sessionId = ''
  if (pathname.includes('/session/')) {
    sessionId = pathname.split('/session/')[1]?.split('/')[0] || ''
  } else {
    sessionId = searchParams.get('sessionId') || ''
  }

  // Check if this is a staff route synchronously to avoid hydration mismatch
  const isStaffRoute = pathname.startsWith('/staff/')

  // DEBUG: Log all the values

  // Static className to prevent hydration mismatch
  const containerClassName = "min-h-screen bg-gray-50"
  
  return (
    <CartProvider sessionId={sessionId}>
      <div className={containerClassName}>
        {children}
      </div>
      {!isStaffRoute && <BottomNavBar sessionId={sessionId} />}
    </CartProvider>
  )
}
