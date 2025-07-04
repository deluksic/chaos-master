import { validateFlame } from '@/flame/schema/flameSchema'
import { decodeBase64, encodeBase64 } from './base64'
import { sum } from './sum'

const format: CompressionFormat = 'deflate'

export function concatBuffers(buffers: Uint8Array[]): Uint8Array {
  const totalLength = sum(buffers.map((b) => b.length))
  const result = new Uint8Array(totalLength)
  let i = 0
  for (const buffer of buffers) {
    result.set(buffer, i)
    i += buffer.length
  }
  return result
}

export async function compressJsonQueryParam(obj: unknown) {
  const encoder = new TextEncoderStream()
  const compress = new CompressionStream(format)
  const writer = encoder.writable.getWriter()

  encoder.readable.pipeTo(compress.writable).catch(console.error)
  await writer.write(JSON.stringify(obj))
  await writer.close()

  const chunks = []
  for await (const chunk of compress.readable) {
    chunks.push(chunk)
  }
  return concatBuffers(chunks)
}

export async function encodeJsonQueryParam(obj: unknown) {
  const compressedQuery = await compressJsonQueryParam(obj)
  return encodeBase64(compressedQuery, { pad: '' })
}

export async function decompressJsonQuery(compressedBytes: Uint8Array) {
  const decompress = new DecompressionStream(format)
  const decoder = new TextDecoderStream()
  const writer = decompress.writable.getWriter()

  decompress.readable.pipeTo(decoder.writable).catch(console.error)
  await writer.write(compressedBytes)
  await writer.close()

  const chunks = []
  for await (const chunk of decoder.readable) {
    chunks.push(chunk)
  }

  return validateFlame(JSON.parse(chunks.join()))
}

export async function decodeJsonQueryParam(param: string) {
  return decompressJsonQuery(decodeBase64(param))
}
