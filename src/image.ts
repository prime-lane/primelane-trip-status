const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/**
 * A square, face-cropped version of a Cloudinary photo at `px` CSS pixels,
 * in the best format the browser accepts. Other URLs pass through untouched.
 */
export function avatarSrc(url: string, px: number): { src: string; srcSet?: string } {
  const match = url.match(CLOUDINARY_UPLOAD);
  if (!match) return { src: url };
  const [, base, rest] = match;
  const at = (scale: number) =>
    `${base}c_fill,g_face,w_${px * scale},h_${px * scale},f_auto,q_auto/${rest}`;
  return { src: at(2), srcSet: `${at(1)} 1x, ${at(2)} 2x, ${at(3)} 3x` };
}
