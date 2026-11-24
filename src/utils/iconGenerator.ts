export async function generateExtensionIconPng(
  size: 16 | 48 | 128,
  accentHex: string
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto 2D para generar el icono.');
  }

  const radius = Math.round(size * 0.22);

  // Rounded square background
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Accent inner badge
  const pad = Math.max(2, Math.round(size * 0.14));
  const innerSize = size - pad * 2;
  const innerRadius = Math.max(2, Math.round(innerSize * 0.22));
  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.moveTo(pad + innerRadius, pad);
  ctx.lineTo(pad + innerSize - innerRadius, pad);
  ctx.quadraticCurveTo(pad + innerSize, pad, pad + innerSize, pad + innerRadius);
  ctx.lineTo(pad + innerSize, pad + innerSize - innerRadius);
  ctx.quadraticCurveTo(pad + innerSize, pad + innerSize, pad + innerSize - innerRadius, pad + innerSize);
  ctx.lineTo(pad + innerRadius, pad + innerSize);
  ctx.quadraticCurveTo(pad, pad + innerSize, pad, pad + innerSize - innerRadius);
  ctx.lineTo(pad, pad + innerRadius);
  ctx.quadraticCurveTo(pad, pad, pad + innerRadius, pad);
  ctx.closePath();
  ctx.fill();

  // Crisp download arrow in white
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = '#FFFFFF';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const strokeWidth = Math.max(1.5, size * 0.09);
  ctx.lineWidth = strokeWidth;

  const cx = size / 2;
  const topY = size * 0.28;
  const tipY = size * 0.58;
  const wing = size * 0.16;
  const trayY = size * 0.72;
  const trayHalf = size * 0.22;

  // Vertical shaft
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx, tipY);
  ctx.stroke();

  // Arrow head
  ctx.beginPath();
  ctx.moveTo(cx - wing, tipY - wing * 0.85);
  ctx.lineTo(cx, tipY);
  ctx.lineTo(cx + wing, tipY - wing * 0.85);
  ctx.stroke();

  // Bottom tray line
  ctx.beginPath();
  ctx.moveTo(cx - trayHalf, trayY);
  ctx.lineTo(cx + trayHalf, trayY);
  ctx.stroke();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Error al exportar icono PNG.'));
    }, 'image/png');
  });

  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}
