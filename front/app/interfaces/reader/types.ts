export type PageTurnDirection = 'next' | 'previous'

export type GripRegion = 'top-corner' | 'edge-center' | 'bottom-corner'

export interface DragPoint {
  x: number
  y: number
  time: number
}
