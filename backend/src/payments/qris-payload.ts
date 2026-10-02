export function isQrisPayload(value: string): boolean {
  return value.startsWith('000201') && value.length >= 20 && value.length <= 2048 && !value.toLowerCase().includes('.mp4');
}
