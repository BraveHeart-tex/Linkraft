import pngToIco from 'png-to-ico';
import sharp from 'sharp';

export const svgToIcoBuffer = async (svgBuffer: Buffer): Promise<Buffer> => {
  const sizes = [16, 32];

  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(svgBuffer)
        .resize(size, size, { fit: 'contain' }) // preserve aspect ratio with padding
        .png()
        .toBuffer()
    )
  );

  const icoBuffer = await pngToIco(pngBuffers);

  return icoBuffer;
};
