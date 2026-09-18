/**
 * Shared media intake helpers for photo + video uploads (iPhone / Android).
 *
 * Videos are converted client-side into a handful of representative still
 * frames so the existing vision pipeline (which understands images) can use
 * them without any change to how scanning works.
 */

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12MB
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB (phone clips)

export const IMAGE_ACCEPT = "image/*,image/heic,image/heif,image/jpeg,image/png,image/webp,image/avif";
export const VIDEO_ACCEPT = "video/*,video/mp4,video/quicktime,video/webm,video/x-matroska,video/3gpp";
export const MEDIA_ACCEPT = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`;

export function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|mkv|3gp|avi)$/i.test(file.name);
}

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|avif|gif|bmp)$/i.test(file.name);
}

export type MediaError = { message: string };

export function validateMediaFile(file: File): MediaError | null {
  if (isVideoFile(file)) {
    if (file.size > MAX_VIDEO_BYTES) {
      return { message: "That video is too large. Please use a clip under 200MB (about 1–2 minutes)." };
    }
    return null;
  }
  if (!isImageFile(file)) {
    return { message: "That file type isn't supported. Please choose a photo or a video." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { message: "That photo is too large. Please use one under 12MB." };
  }
  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("We couldn't read that file. Please try again."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

/**
 * Sample evenly-spaced frames from a video file. Runs entirely on-device.
 * Resolves with JPEG data URLs (max 1280px on the long edge).
 */
export async function extractVideoFrames(file: File, maxFrames = 5): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  // Needed on iOS Safari for canvas draws from a local blob.
  video.setAttribute("playsinline", "");
  video.src = url;

  const cleanup = () => {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    try {
      video.load();
    } catch {
      /* ignore */
    }
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("VIDEO_TIMEOUT")), 20000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error("VIDEO_DECODE"));
      };
    });

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const count = duration > 0 ? Math.min(maxFrames, Math.max(2, Math.round(duration / 2))) : 1;
    const times = duration > 0
      ? Array.from({ length: count }, (_, i) => Math.min(duration - 0.05, (duration * (i + 0.5)) / count))
      : [0];

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("VIDEO_CANVAS");

    const frames: string[] = [];
    for (const t of times) {
      const ok = await seek(video, t);
      if (!ok) continue;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) continue;
      const scale = Math.min(1, 1280 / Math.max(w, h));
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.82));
    }

    if (frames.length === 0) throw new Error("VIDEO_FRAMES");
    return frames;
  } finally {
    cleanup();
  }
}

function seek(video: HTMLVideoElement, time: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 8000);
    const done = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", done);
      resolve(true);
    };
    video.addEventListener("seeked", done);
    try {
      video.currentTime = time;
    } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

export type PreparedMedia = {
  /** First / best still frame — kept for existing single-image consumers. */
  primaryDataUrl: string;
  /** Every still we produced (multiple photos and/or video frames). */
  dataUrls: string[];
  kind: "photo" | "video" | "mixed";
};

/** Turn any mix of photos and videos into still frames the AI can read. */
export async function prepareMedia(files: File[]): Promise<PreparedMedia> {
  const dataUrls: string[] = [];
  let sawPhoto = false;
  let sawVideo = false;

  for (const file of files) {
    const err = validateMediaFile(file);
    if (err) throw new Error(err.message);
    if (isVideoFile(file)) {
      sawVideo = true;
      try {
        const frames = await extractVideoFrames(file);
        dataUrls.push(...frames);
      } catch {
        throw new Error("We couldn't read that video. Try a shorter clip, or take a photo instead.");
      }
    } else {
      sawPhoto = true;
      dataUrls.push(await readFileAsDataUrl(file));
    }
  }

  if (dataUrls.length === 0) throw new Error("We couldn't read that file. Please try again.");

  return {
    primaryDataUrl: dataUrls[0],
    dataUrls: dataUrls.slice(0, 8),
    kind: sawPhoto && sawVideo ? "mixed" : sawVideo ? "video" : "photo",
  };
}
