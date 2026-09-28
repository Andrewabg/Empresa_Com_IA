






export type AdapterKind = 'pdf' | 'text' | 'docx' | 'spreadsheet' | 'image' | 'unsupported'


function ext(filename: string): string {
  const i = filename.lastIndexOf('.')
  if (i < 0) return ''
  return filename.slice(i + 1).toLowerCase()
}


export function adapterFor(mime: string | null, filename: string): AdapterKind {
  const m = mime?.toLowerCase() ?? ''
  const e = ext(filename)

  
  if (m === 'application/pdf') return 'pdf'
  if (e === 'pdf') return 'pdf'

  
  if (m === 'text/plain' || m === 'text/markdown') return 'text'
  if (e === 'txt' || e === 'md' || e === 'markdown') return 'text'

  
  if (m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
  if (e === 'docx') return 'docx'

  
  
  if (m === 'text/csv' || m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'spreadsheet'
  if (e === 'csv' || e === 'xlsx') return 'spreadsheet'

  
  
  if (m === 'image/png' || m === 'image/jpeg' || m === 'image/webp') return 'image'
  if (e === 'png' || e === 'jpg' || e === 'jpeg' || e === 'webp') return 'image'

  return 'unsupported'
}
