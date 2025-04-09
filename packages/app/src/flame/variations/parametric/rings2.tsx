import { f32, struct } from 'typegpu/data'
import { RangeEditor } from '@/components/variationParamEditors/RangeEditor'
import { editorProps } from '@/components/variationParamEditors/types'
import { parametricVariation } from '../types'
import type { Infer } from 'typegpu/data'
import type { EditorFor } from '@/components/variationParamEditors/types'

export const Rings2Params = struct({
  val: f32,
})

export const Rings2ParamsDefaults: Infer<typeof Rings2Params> = {
  val: 6,
}

export const Rings2ParamsEditor: EditorFor<Infer<typeof Rings2Params>> = (
  props,
) => (
  <>
    <RangeEditor
      {...editorProps(props, 'val', 'Value')}
      min={1}
      max={20}
      step={0.01}
    />
  </>
)

export const rings2 = parametricVariation(
  Rings2Params,
  Rings2ParamsDefaults,
  Rings2ParamsEditor,
  /* wgsl */ `
  (pos: vec2f, _varInfo: VariationInfo, P: RingsParams) -> vec2f {
    let p = P.val; 
    let r = length(pos); 
    let theta = atan2(pos.y, pos.x);
    let twop = 2 * p;
    let t = r - twop * trunc((r + p) / twop) + r * (1 - p);
    return t * vec2f(sin(theta), cos(theta));
  }`,
)
