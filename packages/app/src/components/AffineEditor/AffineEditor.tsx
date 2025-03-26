import { AutoCanvas } from '@/lib/AutoCanvas'
import { Root } from '@/lib/Root'
import { WheelZoomCamera2D } from '@/lib/WheelZoomCamera2D'
import ui from './AffineEditor.module.css'
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
import { reconcile, SetStoreFunction } from 'solid-js/store'
import { AffineParams } from '@/flame/variations/types'

const { sqrt } = Math

function vec2Normalize(a: v2f) {
  // vec2.normalize has inexplicable 1e-5 check so we implement our own
  const len = sqrt(a.x * a.x + a.y * a.y) || 1
  return vec2f(a.x / len, a.y / len)
}

function Grid() {
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

      fn triangle(x: f32) -> f32 {
        return abs(fract(x - 0.5) - 0.5);
      }

      fn lines(x: f32, pxWidth: f32) -> f32 {
        return saturate(2 * (2 * pxWidth - x) / pxWidth);
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
        let pxWidth = dpdx(worldPos.x);

        let minorV = lines(triangle(10 * worldPos.x), 10 * pxWidth);
        let minorH = lines(triangle(10 * worldPos.y), 10 * pxWidth);
        let minor = max(minorH, minorV);

        let majorV = lines(triangle(worldPos.x), pxWidth);
        let majorH = lines(triangle(worldPos.y), pxWidth);
        let major = max(majorH, majorV);

        let axisV = lines(abs(worldPos.x), pxWidth);
        let axisH = lines(abs(worldPos.y), pxWidth);
        let axis = max(axisH, axisV);

        let gray = max(0.3 * axis, max(0.05 * max(borderAA, minor), 0.15 * major));
        return vec4f(0.02 + vec3f(gray), 1);
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

function AffineHandle(props: {
  transform: AffineParams
  color: v2f
  setTransform: (pos: AffineParams) => void
}) {
  const { canvas, canvasSize } = useCanvas()
  const {
    js: { worldToClip, clipToWorld },
  } = useCamera()

  const aspect = createMemo(() => canvasSize().width / canvasSize().height)
  const position = createMemo(() => vec2f(props.transform.c, props.transform.f))
  const clipPosition = createMemo(() => worldToClip(position()))
  const clipTransform = createMemo(() => {
    // prettier-ignore
    const { a, b, c, d, e, f } = props.transform
    const zero = worldToClip(vec2f(0, 0))
    const x = vec2.sub(worldToClip(vec2f(a, d)), zero, vec2f())
    const y = vec2.sub(worldToClip(vec2f(b, e)), zero, vec2f())
    const t = worldToClip(vec2f(c, f))
    const s = aspect()
    return [x.x * s, y.x * s, x.y, y.y, t.x * s, t.y]
  })
  const startDragging = createDragHandler((initEvent) => {
    const initialTransform = { ...props.transform }
    const grabPosition = clipToWorld(eventToClip(initEvent, canvas))
    return {
      onPointerMove(ev) {
        const evPosition = clipToWorld(eventToClip(ev, canvas))
        const diff = vec2.sub(evPosition, grabPosition, vec2f())
        const position = vec2.add(
          vec2f(initialTransform.c, initialTransform.f),
          diff,
          vec2f(),
        )
        props.setTransform({
          ...initialTransform,
          c: position.x,
          f: position.y,
        })
      },
    }
  })
  const startScalingRotating = (xFactor: -1 | 0 | 1, yFactor: -1 | 0 | 1) =>
    createDragHandler((initEvent) => {
      const { a, b, d, e, ...rest } = props.transform
      const grabPosition = clipToWorld(eventToClip(initEvent, canvas))
      const center = position()

      function onPointerMove(ev: PointerEvent) {
        const evPosition = clipToWorld(eventToClip(ev, canvas))
        const grabDiff = vec2.sub(grabPosition, center, vec2f())
        const evDiff = vec2.sub(evPosition, center, vec2f())
        const ratio = vec2.length(evDiff) / vec2.length(grabDiff)
        const grabNorm = vec2Normalize(grabDiff)
        const evNorm = vec2Normalize(evDiff)
        const cos = ev.ctrlKey || ev.metaKey ? 1 : vec2.dot(evNorm, grabNorm)
        const sin =
          ev.ctrlKey || ev.metaKey ? 0 : vec2.cross(evNorm, grabNorm)[2]!
        props.setTransform({
          ...rest,
          a: xFactor === 0 ? a : (a * cos + b * sin) * ratio * xFactor,
          b: xFactor === 0 ? b : (-a * sin + b * cos) * ratio * xFactor,
          d: yFactor === 0 ? d : (d * cos + e * sin) * ratio * yFactor,
          e: yFactor === 0 ? e : (-d * sin + e * cos) * ratio * yFactor,
        })
      }

      // immediately respond, as -1 factors are used for flipping axes
      // when clicking on dashed lines
      onPointerMove(initEvent)

      return {
        onPointerMove,
      }
    })
  const p = (v: number) => `${v}%`
  const x = () => 50 * (clipPosition().x + 1)
  const y = () => 50 * (1 - clipPosition().y)
  const corners = `
    M -1,-1 m 0.25,0 L -1,-1 v 0.25
    M 1,-1 m -0.25,0 L 1,-1 v 0.25
    M -1,1 m 0.25,0 L -1,1 v -0.25
    M 1,1 m -0.25,0 L 1,1 v -0.25
  `

  const scaleBoth = startScalingRotating(1, 1)
  const scaleX = startScalingRotating(1, 0)
  const scaleY = startScalingRotating(0, 1)
  const scaleNegX = startScalingRotating(-1, 0)
  const scaleNegY = startScalingRotating(0, -1)
  return (
    <>
      <svg viewBox={`-${aspect()} -1 ${2 * aspect()} 2`}>
        <g transform={`scale(1, -1) matrix(${clipTransform()})`}>
          <path class={ui.handleBox} d={corners} />
          <path
            classList={{ [ui.handleBox]: true, [ui.handleBoxGrabArea]: true }}
            d={corners}
            // TODO: temporarily using on:pointerdown and not onPointerDown
            // because otherwise WheelZoomCamera2D steals the event
            // due to solidjs event delegation.
            on:pointerdown={scaleBoth}
          />
          <path class={ui.handleBox} d="M 0,0 V 1" marker-end="url(#arrow)" />
          <path
            classList={{ [ui.handleBox]: true, [ui.handleBoxGrabArea]: true }}
            d="M 0,0 V 1"
            on:pointerdown={scaleY}
          />
          <path class={ui.handleBox} d="M 0,0 L 1,0" marker-end="url(#arrow)" />
          <path
            classList={{ [ui.handleBox]: true, [ui.handleBoxGrabArea]: true }}
            d="M 0,0 L 1,0"
            on:pointerdown={scaleX}
          />
          <path
            classList={{ [ui.handleBox]: true, [ui.dashed]: true }}
            d="M 0,0 V -1 M 0,0 L -1,0"
          />
          <path
            classList={{ [ui.handleBox]: true, [ui.handleBoxGrabArea]: true }}
            d="M 0,0 V -1"
            on:pointerdown={scaleNegY}
          />
          <path
            classList={{ [ui.handleBox]: true, [ui.handleBoxGrabArea]: true }}
            d="M 0,0 L -1,0"
            on:pointerdown={scaleNegX}
          />
        </g>
      </svg>
      <g
        class={ui.handle}
        // TODO: temporarily using on:pointerdown and not onPointerDown
        // because otherwise WheelZoomCamera2D steals the event
        // due to solidjs event delegation.
        on:pointerdown={startDragging}
        style={{ '--a': props.color.x, '--b': props.color.y }}
      >
        <circle class={ui.handleCircle} cx={p(x())} cy={p(y())} />
        <circle class={ui.handleCircleGrabArea} cx={p(x())} cy={p(y())} />
      </g>
    </>
  )
}

export function AffineEditor(props: {
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
            initZoom={0.9}
            zoomRange={[0.5, 20]}
          >
            <Grid />
            <svg class={ui.svg}>
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                  fill="white"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
              </defs>
              <For each={props.flameFunctions}>
                {(flameFunction, i) => (
                  <AffineHandle
                    transform={flameFunction.preAffine}
                    color={vec2f(flameFunction.color.x, flameFunction.color.y)}
                    setTransform={(affine) => {
                      props.setFlameFunctions(
                        i(),
                        'preAffine',
                        reconcile(affine),
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
