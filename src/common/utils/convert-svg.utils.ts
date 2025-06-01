import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const sizes = [16, 32, 48];

// FIXME: This does not seem to work
export const svgToIcoBuffer = async (svgBuffer: Buffer): Promise<Buffer> => {
  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(svgBuffer).resize(size, size, { fit: 'contain' }).png().toBuffer()
    )
  );

  const icoBuffer = await pngToIco(pngBuffers);
  return icoBuffer;
};
