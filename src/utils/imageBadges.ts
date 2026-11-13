/**
 * Generates a clean, small-sized PNG image badge for measurement labels
 * (e.g. "834m", "1168m") to be embedded in KMZ files for Google Earth.
 */
export function generateMeasurementBadgePng(
  text: string,
  textColorHex: string = '#ffffff',
  bgColorHex: string = '#1a202c',
  fontSize: number = 24
): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve(new Uint8Array());
      return;
    }

    ctx.font = `bold ${fontSize}px sans-serif`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const paddingX = 14;
    const paddingY = 8;

    const width = Math.ceil(textWidth + paddingX * 2);
    const height = Math.ceil(fontSize + paddingY * 2);

    canvas.width = width;
    canvas.height = height;

    // Redraw on properly sized canvas
    ctx.clearRect(0, 0, width, height);

    // Rounded rectangle badge background with dark semi-transparent fill and subtle border
    const radius = 6;
    ctx.fillStyle = bgColorHex;
    ctx.strokeStyle = textColorHex;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, height - radius);
    ctx.quadraticCurveTo(width, height, width - radius, height);
    ctx.lineTo(radius, height);
    ctx.quadraticCurveTo(0, height, 0, height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // Render crisp centered text
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = textColorHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2 + 1);

    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(new Uint8Array());
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        resolve(new Uint8Array(arrayBuffer));
      };
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  });
}
