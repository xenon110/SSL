'use client'

import React, { Component, ReactNode, Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'

const Spline = lazy(() => import('@splinetool/react-spline'))

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class SplineErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_error: any): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn("Spline scene failed to load:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

function SplineFallback() {
  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950">
      {/* Subtle grid pattern background */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" 
      />
      {/* Soft radial glow elements representing engineering/industrial tech */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse duration-[8000ms] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[150px] animate-pulse duration-[12000ms] pointer-events-none" />
      
      {/* Subtle lines or circles animating like a Blueprint/Engineering interface */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-[500px] h-[500px] border border-blue-500/20 rounded-full animate-[spin_120s_linear_infinite]" />
        <div className="absolute w-[300px] h-[300px] border border-dashed border-indigo-500/15 rounded-full animate-[spin_60s_linear_infinite_reverse]" />
        <div className="absolute w-[150px] h-[150px] border border-blue-500/10 rounded-full" />
      </div>
    </div>
  )
}

interface SplineSceneProps {
  scene: string
  className?: string
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <div className={className}>
      <SplineErrorBoundary fallback={<SplineFallback />}>
        <Suspense 
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-slate-950">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          }
        >
          <Spline
            scene={scene}
            className="w-full h-full"
          />
        </Suspense>
      </SplineErrorBoundary>
    </div>
  )
}

