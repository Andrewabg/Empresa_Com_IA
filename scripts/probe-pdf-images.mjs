





















import { readFileSync, writeFileSync } from 'node:fs'
import { createCanvas, ImageData } from '@napi-rs/canvas'
import { extractImages, getDocumentProxy } from 'unpdf'


function bitmapParaPng(data, width, height, channels) {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let p = 0; p < width * height; p++) {
    if (channels === 1) {
      const g = data[p]
      rgba[p * 4] = g; rgba[p * 4 + 1] = g; rgba[p * 4 + 2] = g; rgba[p * 4 + 3] = 255
    } else if (channels === 3) {
      rgba[p * 4] = data[p * 3]; rgba[p * 4 + 1] = data[p * 3 + 1]; rgba[p * 4 + 2] = data[p * 3 + 2]; rgba[p * 4 + 3] = 255
    } else {
      rgba[p * 4] = data[p * 4]; rgba[p * 4 + 1] = data[p * 4 + 1]; rgba[p * 4 + 2] = data[p * 4 + 2]; rgba[p * 4 + 3] = data[p * 4 + 3]
    }
  }
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0)
  return canvas.toBuffer('image/png')
}


function gerarJpegTeste() {
  const canvas = createCanvas(160, 120)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#1b6'; ctx.fillRect(0, 0, 160, 120)
  ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif'
  ctx.fillText('TABELA 42', 20, 65)
  return canvas.toBuffer('image/jpeg')
}


function montarPdfComJpeg(jpeg, w, h) {
  const partes = []
  let offset = 0
  const offsets = []
  const push = (buf) => { partes.push(buf); offset += buf.length }
  const pushObj = (s) => { offsets.push(offset); push(Buffer.from(s, 'latin1')) }

  push(Buffer.from('%PDF-1.4\n%\xff\xff\xff\xff\n', 'latin1'))
  pushObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  pushObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  pushObj(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`)
  
  offsets.push(offset)
  push(Buffer.from(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, 'latin1'))
  push(jpeg)
  push(Buffer.from('\nendstream\nendobj\n', 'latin1'))
  
  const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`
  pushObj(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`)

  const xrefOffset = offset
  let xref = `xref\n0 6\n0000000000 65535 f \n`
  for (const o of offsets) xref += `${String(o).padStart(10, '0')} 00000 n \n`
  push(Buffer.from(xref, 'latin1'))
  push(Buffer.from(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`, 'latin1'))
  return Buffer.concat(partes)
}

async function varrer(pdfBytes, rotulo) {
  console.log(`\n=== ${rotulo} ===`)
  
  const doc = await getDocumentProxy(new Uint8Array(pdfBytes.slice()))
  console.log('numPages:', doc.numPages)
  let achou = 0
  for (let p = 1; p <= doc.numPages; p++) {
    const imgs = await extractImages(new Uint8Array(pdfBytes.slice()), p)
    for (const img of imgs) {
      achou++
      console.log(`  pagina ${p}: key=${img.key} ${img.width}x${img.height} channels=${img.channels} dataLen=${img.data.length}`)
      try {
        const png = bitmapParaPng(img.data, img.width, img.height, img.channels)
        const nome = `probe-out-p${p}-${img.key}.png`
        writeFileSync(nome, png)
        console.log(`    → PNG round-trip OK (${png.length} bytes) escrito em ${nome}`)
      } catch (e) {
        console.log('    → round-trip PNG FALHOU:', e.message)
      }
    }
  }
  console.log(achou ? `TOTAL: ${achou} figura(s)` : 'TOTAL: 0 figuras (PDF sem imagem raster)')
}

const arg = process.argv[2]
if (arg) {
  await varrer(readFileSync(arg), `PDF real: ${arg}`)
} else {
  const jpeg = gerarJpegTeste()
  console.log('JPEG de teste gerado:', jpeg.length, 'bytes; magic:', jpeg.slice(0, 3).toString('hex'))
  const pdf = montarPdfComJpeg(jpeg, 160, 120)
  writeFileSync('probe-synthetic.pdf', pdf)
  console.log('PDF sintetico:', pdf.length, 'bytes escrito em probe-synthetic.pdf')
  await varrer(pdf, 'PDF sintetico (1 JPEG embutido)')
}
