import { AutoCanvas } from '@/lib/AutoCanvas'
import { Root } from '@/lib/Root'
import { WheelZoomCamera2D } from '@/lib/WheelZoomCamera2D'
import ui from './FlameColorEditor.module.css'
import { useCamera } from '@/lib/CameraContext'
import { useRootContext } from '@/lib/RootContext'
import { createEffect, createMemo, createSignal, For } from 'solid-js'
import { createAnimationFrame } from '@/utils/createAnimationFrame'
import { gamutClipPreserveChroma } from '@/flame/oklab'
import { wgsl } from '@/utils/wgsl'
import { useCanvas } from '@/lib/CanvasContext'
import { PI } from '@/flame/constants'
import { v2f, vec2f } from 'typegpu/data'
import { createDragHandler } from '@/utils/createDragHandler'
import { eventToClip } from '@/utils/eventToClip'
import { vec2 } from 'wgpu-matrix'
import { FlameFunction } from '@/flame/flameFunction'
import { produce, SetStoreFunction } from 'solid-js/store'
import { maxLength2 } from '@/utils/maxLength'

function Gradient() {
  const camera = useCamera()
  const { device, root } = useRootContext()
  const { context, canvasFormat } = useCanvas()

  createEffect(() => {
    const renderShaderCode = wgsl/* wgsl */ `
      ${{
        clipToWorld: camera.wgsl.clipToWorld,
        resolution: camera.wgsl.resolution,
        pixelRatio: camera.wgsl.pixelRatio,
        gamutClipPreserveChroma,
        PI,
      }}

      const pos = array(
        vec2f(-1, -1),
        vec2f(3, -1),
        vec2f(-1, 3)
      );

      struct VertexOutput {
        @builtin(position) pos: vec4f,
        @location(0) clip: vec2f
      }

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> VertexOutput {
        return VertexOutput(
          vec4f(pos[vertexIndex], 0.0, 1.0), 
          pos[vertexIndex]
        );
      }

      fn clampLength(v: vec2f, maxLength: f32) -> vec2f {
        const eps = 0.0001;
        let l = length(v);
        return min(l, maxLength) * v / max(eps, l);
      }

      fn sdBox(p: vec2f, size: vec2f) -> f32{
          let d = abs(p) - size;
          return length(max(d, vec2f(0))) + min(max(d.x, d.y), 0);
      }

      fn sdBoxRound(p: vec2f, size: vec2f, r: f32) -> f32{
        return sdBox(p, size - r) - r;
      }

      @fragment fn fs(in: VertexOutput) -> @location(0) vec4f {
        let halfRes = 0.5 * resolution();
        let pxRatio = pixelRatio();
        let border = sdBoxRound(in.pos.xy - halfRes, halfRes - 3 * pxRatio, 13 * pxRatio);
        let borderAA = saturate(border);
        let worldPos = clipToWorld(in.clip);
        let pxWidth = fwidth(worldPos.y);
        let r = length(worldPos);
        let gridCircle = abs(sin(30 * PI * clamp(r, 0, 0.2 + 0.01)));
        let gridCircleW = fwidth(gridCircle);
        let gridCircleLineAA = saturate(2 * (150 * pxWidth - gridCircle) / gridCircleW);
        let gridRadial = abs(sin(6 * atan2(worldPos.y, worldPos.x)));
        let gridRadialW = fwidth(gridRadial);
        let gridRadialLineAA = saturate(2 * (min(0.5, 10 * pxWidth / r) - gridRadial) / gridRadialW);
        let fadeToCenter = smoothstep(0.005, 0.05, r);
        let gridAA = max(gridCircleLineAA, gridRadialLineAA * fadeToCenter) + borderAA;
        return vec4f(gamutClipPreserveChroma(vec3f(0.7 - 0.05 * gridAA, clampLength(worldPos, 0.2))), 1);
      }
    `

    const renderModule = device.createShaderModule({
      code: renderShaderCode,
    })

    const renderPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [root.unwrap(camera.BindGroupLayout)],
      }),
      vertex: {
        module: renderModule,
      },
      fragment: {
        module: renderModule,
        targets: [
          {
            format: canvasFormat,
          },
        ],
      },
    })

    createAnimationFrame(() => {
      camera.update()

      const encoder = device.createCommandEncoder()
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      })
      pass.setBindGroup(0, root.unwrap(camera.bindGroup))
      pass.setPipeline(renderPipeline)
      pass.draw(3)
      pass.end()
      device.queue.submit([encoder.finish()])
    })
  })
  return null
}

function FlameColorHandle(props: {
  color: v2f
  setColor: (color: v2f) => void
}) {
  const { canvas } = useCanvas()
  const {
    js: { worldToClip, clipToWorld },
  } = useCamera()
  const clip = createMemo(() => worldToClip(props.color))
  const startDragging = createDragHandler((initEvent) => {
    const initialColor = props.color
    const grabPosition = clipToWorld(eventToClip(initEvent, canvas))
    return {
      onPointerMove(ev) {
        const position = clipToWorld(eventToClip(ev, canvas))
        const diff = vec2.sub(position, grabPosition, vec2f())
        const color = vec2.add(initialColor, diff, vec2f())
        const clampedColor = maxLength2(color, 0.3)
        props.setColor(clampedColor)
      },
    }
  })
  return (
    <g
      class={ui.handle}
      // TODO: temporarily using on:pointerdown and not onPointerDown
      // because otherwise WheelZoomCamera2D steals the event
      // due to solidjs event delegation.
      on:pointerdown={startDragging}
      style={{ '--a': props.color.x, '--b': props.color.y }}
    >
      <circle
        class={ui.handleCircle}
        cx={`${(50 * (clip().x + 1)).toFixed(4)}%`}
        cy={`${(50 * (1 - clip().y)).toFixed(4)}%`}
      />
      <circle
        class={ui.handleCircleGrabArea}
        cx={`${(50 * (clip().x + 1)).toFixed(4)}%`}
        cy={`${(50 * (1 - clip().y)).toFixed(4)}%`}
      />
    </g>
  )
}

export function FlameColorEditor(props: {
  flameFunctions: FlameFunction[]
  setFlameFunctions: SetStoreFunction<FlameFunction[]>
}) {
  const [div, setDiv] = createSignal<HTMLDivElement>()
  return (
    <div ref={setDiv} class={ui.editorCard}>
      <Root adapterOptions={{ powerPreference: 'high-performance' }}>
        <AutoCanvas class={ui.canvas} pixelRatio={1}>
          <WheelZoomCamera2D
            eventTarget={div()}
            initZoom={4}
            zoomRange={[2, 20]}
          >
            <Gradient />
            <svg class={ui.svg}>
              <For each={props.flameFunctions}>
                {(flameFunction, i) => (
                  <FlameColorHandle
                    color={vec2f(flameFunction.color.x, flameFunction.color.y)}
                    setColor={(color) => {
                      props.setFlameFunctions(
                        i(),
                        produce((flameFunction) => {
                          flameFunction.color = {
                            x: color.x,
                            y: color.y,
                          }
                        }),
                      )
                    }}
                  />
                )}
              </For>
            </svg>
          </WheelZoomCamera2D>
        </AutoCanvas>
      </Root>
    </div>
  )
}
