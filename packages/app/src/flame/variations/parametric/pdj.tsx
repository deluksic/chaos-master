import { f32, struct } from 'typegpu/data'
import { RangeEditor } from '@/components/variationParamEditors/RangeEditor'
import { editorProps } from '@/components/variationParamEditors/types'
import { parametricVariation } from '../types'
import type { Infer } from 'typegpu/data'
import type { EditorFor } from '@/components/variationParamEditors/types'

export const PdjParams = struct({
  a: f32,
  b: f32,
  c: f32,
  d: f32,
})

export const PdjParamsDefaults: Infer<typeof PdjParams> = {
  a: 1,
  b: 2,
  c: 3,
  d: 4,
}

export const PdjParamsEditor: EditorFor<Infer<typeof PdjParams>> = (props) => (
  <>
    <RangeEditor
      {...editorProps(props, 'a', 'a')}
      min={1}
      max={15}
      step={0.1}
    />
    <RangeEditor
      {...editorProps(props, 'b', 'b')}
      min={1}
      max={15}
      step={0.1}
    />
    <RangeEditor
      {...editorProps(props, 'c', 'c')}
      min={1}
      max={15}
      step={0.1}
    />
    <RangeEditor
      {...editorProps(props, 'd', 'd')}
      min={1}
      max={15}
      step={0.1}
    />
  </>
)

export const pdjVar = parametricVariation(
  PdjParams,
  PdjParamsDefaults,
  PdjParamsEditor,
  /* wgsl */ `(pos: vec2f, _varInfo: VariationInfo, P: PdjParams) -> vec2f {
    let p1 = P.a;
    let p2 = P.b;
    let p3 = P.c;
    let p4 = P.d;
    return vec2f(
      sin(p1 * pos.y) - cos(p2 * pos.x),
      sin(p3 * pos.x) - cos(p4 * pos.y)
    );
  }`,
)
