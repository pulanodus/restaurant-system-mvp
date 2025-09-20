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

  console.log('🏗️ DynamicLayout - pathname:', pathname)
  console.log('🏗️ DynamicLayout - searchParams:', searchParams.toString())
  console.log('🏗️ DynamicLayout - sessionId:', sessionId)
  console.log('🏗️ DynamicLayout - sessionId length:', sessionId.length)
  console.log('🏗️ DynamicLayout - sessionId type:', typeof sessionId)
  console.log('🏗️ DynamicLayout - isStaffRoute:', isStaffRoute)

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
