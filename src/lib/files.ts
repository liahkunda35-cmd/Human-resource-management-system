const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png']
const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
const MAX_BYTES = 1_800_000

export function validateUploadFile(file: File): string | null {
  const name = file.name.toLowerCase()
  const okExt = ALLOWED_EXTS.some((ext) => name.endsWith(ext))
  const okMime = !file.type || ALLOWED_MIMES.includes(file.type) || file.type === 'image/jpg'
  if (!okExt && !okMime) return 'Upload a PDF, JPG, JPEG, or PNG file.'
  if (file.size > MAX_BYTES) return 'File is too large. Keep uploads under about 1.5 MB.'
  return null
}

export function readFileAsDataURL(file: File): Promise<{ name: string; data: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const err = validateUploadFile(file)
    if (err) {
      reject(new Error(err))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        name: file.name,
        data: String(reader.result),
        mime: file.type || guessMime(file.name),
      })
    }
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

function guessMime(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.png')) return 'image/png'
  return 'image/jpeg'
}

export function openDataUrl(data: string, name: string) {
  const a = document.createElement('a')
  a.href = data
  a.download = name
  a.target = '_blank'
  a.rel = 'noopener'
  a.click()
}
