import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from 'solid-js'
import { vec2f } from 'typegpu/data'
import { clamp } from 'typegpu/std'
import { vec2 } from 'wgpu-matrix'
import { Camera2D } from '@/lib/Camera2D'
import { useCamera } from '@/lib/CameraContext'
import { useCanvas } from '@/lib/CanvasContext'
import { createDragHandler } from '@/utils/createDragHandler'
import { eventToClip } from '@/utils/eventToClip'
import type { ParentProps, Setter, Signal } from 'solid-js'
import type { v2f } from 'typegpu/data'

type WheelZoomCamera2DProps = {
  zoom: Signal<number>
  eventTarget?: HTMLElement
}

export function createZoom(
  initZoom: number,
  zoomRange: [number, number],
): Signal<number> {
  const [min, max] = zoomRange
  const [zoom, _setZoom] = createSignal(initZoom)

  const setZoom: Setter<number> = (value) => {
    if (typeof value === 'function') {
      _setZoom((prev) => {
        return clamp(value(prev), min, max)
      })
    } else {
      _setZoom(clamp(value, min, max))
    }
    return zoom()
  }

  return [zoom, setZoom]
}

export function WheelZoomCamera2D(props: ParentProps<WheelZoomCamera2DProps>) {
  const { canvas } = useCanvas()
  const [zoom, setZoom] = props.zoom
  const el = createMemo(() => props.eventTarget ?? canvas)

  const [position, setPosition] = createSignal(vec2f())
  let clipToWorld: (clip: v2f) => v2f | undefined

  const pan = createDragHandler((initEvent) => {
    const grabPosition = clipToWorld(eventToClip(initEvent, el()))
    if (!grabPosition) {
      return
    }
    return {
      onPointerMove(event) {
        const pos = clipToWorld(eventToClip(event, el()))
        if (!pos) {
          return
        }
        setPosition((p) => vec2.sub(p, vec2.sub(pos, grabPosition), vec2f()))
      },
    }
  })

  function onWheel(ev: WheelEvent) {
    ev.preventDefault()
    const clip = eventToClip(ev, el())
    const world = clipToWorld(clip)
    if (!world) {
      return
    }
    const oldZoom = zoom()
    batch(() => {
      const newZoom = setZoom(oldZoom * (1 - ev.deltaY * 0.001))
      const ratio = oldZoom / newZoom
      setPosition(({ x, y }) =>
        vec2f(x + (world.x - x) * (1 - ratio), y + (world.y - y) * (1 - ratio)),
      )
    })
  }

  createEffect(() => {
    const eventTarget = el()
    eventTarget.addEventListener('pointerdown', pan)
    eventTarget.addEventListener('wheel', onWheel, { passive: false })
    onCleanup(() => {
      eventTarget.removeEventListener('pointerdown', pan)
      eventTarget.removeEventListener('wheel', onWheel)
    })
  })

  return (
    <Camera2D position={position()} fovy={1 / zoom()}>
      {(() => {
        const { js } = useCamera()
        // steal clipToWorld from the camera
        clipToWorld = js.clipToWorld
        return null
      })()}
      {props.children}
    </Camera2D>
  )
}
