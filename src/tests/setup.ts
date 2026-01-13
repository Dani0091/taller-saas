import '@testing-library/jest-dom'

// Mock de Image para tests de preprocesamiento
global.Image = class {
  onload: () => void = () => {}
  onerror: () => void = () => {}
  src: string = ''
  crossOrigin: string = ''
  width: number = 100
  height: number = 100

  constructor() {
    setTimeout(() => {
      this.onload()
    }, 10)
  }
} as any

// Mock de canvas context
const mockCanvasContext = {
  drawImage: () => {},
  getImageData: () => ({
    data: new Uint8ClampedArray(100 * 100 * 4).fill(128),
    width: 100,
    height: 100,
  }),
  putImageData: () => {},
  filter: '',
}

// Mock de createElement para canvas
const originalCreateElement = document.createElement.bind(document)
document.createElement = ((tagName: string) => {
  if (tagName === 'canvas') {
    return {
      width: 0,
      height: 0,
      getContext: () => mockCanvasContext,
      toDataURL: () => 'data:image/png;base64,mockBase64Data',
    }
  }
  return originalCreateElement(tagName)
}) as any
