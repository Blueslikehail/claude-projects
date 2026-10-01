// Minimal WAV reader/writer on byte arrays (browser-safe). The web app will use
// decodeAudioData for other formats; this covers the CLI and tests.

/**
 * Decode a PCM (8/16/24/32-bit int) or 32/64-bit float WAV, mixed down to mono.
 * @param {Uint8Array|ArrayBuffer} input
 * @returns {{ sampleRate: number, channels: number, samples: Float32Array }}
 */
export function decodeWav(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at) => String.fromCharCode(...bytes.subarray(at, at + 4));
  if (bytes.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("Not a WAV file");

  let fmt = null;
  let data = null;
  for (let at = 12; at + 8 <= bytes.length; ) {
    const id = tag(at);
    const size = view.getUint32(at + 4, true);
    if (id === "fmt ") {
      fmt = {
        format: view.getUint16(at + 8, true),
        channels: view.getUint16(at + 10, true),
        sampleRate: view.getUint32(at + 12, true),
        bits: view.getUint16(at + 22, true),
      };
      if (fmt.format === 0xfffe && size >= 40) fmt.format = view.getUint16(at + 32, true); // extensible
    } else if (id === "data") {
      data = { at: at + 8, size: Math.min(size, bytes.length - at - 8) };
    }
    at += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error("WAV is missing fmt or data chunk");

  const { format, channels, sampleRate, bits } = fmt;
  const width = bits / 8;
  const read = {
    "1:8": (o) => (view.getUint8(o) - 128) / 128,
    "1:16": (o) => view.getInt16(o, true) / 32768,
    "1:24": (o) => ((view.getUint8(o) | (view.getUint8(o + 1) << 8) | (view.getInt8(o + 2) << 16)) / 8388608),
    "1:32": (o) => view.getInt32(o, true) / 2147483648,
    "3:32": (o) => view.getFloat32(o, true),
    "3:64": (o) => view.getFloat64(o, true),
  }[`${format}:${bits}`];
  if (!read) throw new Error(`Unsupported WAV encoding (format ${format}, ${bits} bits)`);

  const frames = Math.floor(data.size / (width * channels));
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += read(data.at + (i * channels + c) * width);
    samples[i] = sum / channels;
  }
  return { sampleRate, channels, samples };
}

/** Encode mono samples as a 16-bit PCM WAV. */
export function encodeWav(samples, sampleRate) {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const write = (at, s) => [...s].forEach((ch, i) => (bytes[at + i] = ch.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((x, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, x)) * 32767), true));
  return bytes;
}
