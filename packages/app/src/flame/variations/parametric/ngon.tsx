import { f32, struct } from 'typegpu/data'
import { RangeEditor } from '@/components/Sliders/ParametricEditors/RangeEditor'
import { editorProps } from '@/components/Sliders/ParametricEditors/types'
import { PI } from '@/flame/constants'
import { parametricVariation } from './types'
import type { Infer } from 'typegpu/data'
import type { EditorFor } from '@/components/Sliders/ParametricEditors/types'

type NgonParams = Infer<typeof NgonParams>
const NgonParams = struct({
  power: f32,
  sides: f32,
  corners: f32,
  circle: f32,
})

const NgonParamsDefaults: NgonParams = {
  power: 2,
  sides: 3,
  corners: 4,
  circle: 4,
}

const NgonParamsEditor: EditorFor<NgonParams> = (props) => (
  <>
    <RangeEditor
      {...editorProps(props, 'power', 'Power')}
      min={0}
      max={8}
      step={1}
    />
    <RangeEditor
      {...editorProps(props, 'sides', 'Sides')}
      min={1}
      max={15}
      step={1}
    />
    <RangeEditor
      {...editorProps(props, 'corners', 'Corners')}
      min={1}
      max={15}
      step={1}
    />
    <RangeEditor
      {...editorProps(props, 'circle', 'Circle')}
      min={0}
      max={30}
      step={0.1}
    />
  </>
)

export const ngonVar = parametricVariation(
  'ngonVar',
  NgonParams,
  NgonParamsDefaults,
  NgonParamsEditor,
  /* wgsl */ `
  (pos: vec2f, varInfo: VariationInfo, P: NgonParams) -> vec2f {
    let p1 = P.power; 
    let p2 = 2 * PI / P.sides; 
    let p3 = P.corners; 
    let p4 = P.circle; 
    let phi = atan2(pos.y, pos.x);
    let r = length(pos); 
    let t3 = phi - p2 * floor(phi / p2);
    let t4 = select(t3 - p2, t3, t3 > p2 / 2);
    let kNum = p3 * (1/cos(t4) - 1) + p4;
    let kDen = pow(r, p1);
    let k = kNum / kDen;
    return  k * pos;
  }`,
  { PI },
)
