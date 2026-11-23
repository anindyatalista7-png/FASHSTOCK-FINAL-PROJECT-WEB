// Generator barcode Code 128 (subset B) dalam bentuk SVG, tanpa library tambahan.
// Subset B mendukung karakter ASCII 32–127 (huruf besar/kecil, angka, tanda baca).

// Lebar bar/spasi untuk nilai 0..106 (104 = Start B, 106 = Stop)
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];
const START_B = 104;
const STOP = 106;

/** Ubah teks menjadi deretan nilai Code 128 (start, data, checksum, stop). */
export function encodeCode128(text) {
  const values = [START_B];
  for (const ch of String(text)) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 127) throw new Error(`Karakter "${ch}" tidak didukung Code 128-B`);
    values.push(code - 32);
  }
  const checksum = values.reduce((sum, v, i) => sum + v * (i === 0 ? 1 : i), 0) % 103;
  values.push(checksum, STOP);
  return values;
}

/**
 * Hasilkan SVG barcode.
 * @param {string} text   isi barcode (SKU)
 * @param {object} opt    { module: lebar 1 modul (px), height, showText }
 */
export function code128Svg(text, { module = 2, height = 70, showText = true } = {}) {
  const values = encodeCode128(text);
  const quiet = 10 * module;
  let x = quiet;
  const bars = [];
  for (const v of values) {
    const widths = PATTERNS[v];
    for (let i = 0; i < widths.length; i++) {
      const w = Number(widths[i]) * module;
      if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${w}" height="${height}"/>`);
      x += w;
    }
  }
  const width = x + quiet;
  const textH = showText ? 18 : 0;
  const escaped = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height + textH}" width="${width}" height="${height + textH}">` +
    `<rect width="100%" height="100%" fill="#ffffff"/>` +
    `<g fill="#1c1917">${bars.join("")}</g>` +
    (showText
      ? `<text x="${width / 2}" y="${height + 14}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="13" font-weight="600" fill="#1c1917">${escaped}</text>`
      : "") +
    `</svg>`
  );
}
