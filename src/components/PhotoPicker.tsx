import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Images,
  ArrowUpFromLine,
  ImagePlus,
  AlertTriangle,
  X,
  Video,
  Check,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isNativeApp } from "@/lib/native-runtime";
import { haptic, nativeCapturePhoto, nativePickPhotos } from "@/lib/native-bridge";
import { MEDIA_ACCEPT, VIDEO_ACCEPT, prepareMedia, type PreparedMedia } from "@/lib/media-capture";

export type PhotoPickerProps = {
  onPick: (file: File, dataUrl: string) => void;
  /** Optional richer callback: every still frame from photos and/or videos. */
  onPickMedia?: (media: PreparedMedia, files: File[]) => void;
  compact?: boolean;
  label?: string;
};

/**
 * Best-practice mobile photo capture with robust fallbacks:
 * - capture="environment" for rear camera on Android Chrome & iPhone Safari
 * - accept="image/*" is broad enough for Samsung Internet
 * - accept="image/jpeg,image/png,image/webp" as a fallback attempt
 * - on permission failure, show manual guidance toast
 * - supports drag & drop and gallery upload
 */
export function PhotoPicker({ onPick, onPickMedia, compact = false, label }: PhotoPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoCaptureRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  // The photo the user just took, held for confirmation. Nothing is sent for
  // scanning until they tap "Use this photo".
  const [pending, setPending] = useState<{ media: PreparedMedia; files: File[] } | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const cameraUnavailableMessage = "Camera not available on this device. Please choose a photo instead.";

  useEffect(() => {
    if (pending || captureError) {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [pending, captureError]);

  const prefersCaptureInput = () => {
    const ua = navigator.userAgent;
    return /Android|iPhone|iPad|iPod/i.test(ua) && !/CrOS|Macintosh|Windows/i.test(ua);
  };

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  useEffect(() => () => stopCamera(), []);

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    setProcessing(true);
    setCaptureError(null);
    try {
      const kept = files.slice(0, 5);
      const media = await prepareMedia(kept);
      // Hold the photo for confirmation — never scan or discard it yet.
      setPending({ media, files: kept });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "We couldn't use that file. Please try another photo or video.";
      setPending(null);
      setCaptureError(message);
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  }

  function confirmPending() {
    if (!pending) return;
    const { media, files } = pending;
    setPending(null);
    onPickMedia?.(media, files);
    onPick(files[0], media.primaryDataUrl);
  }

  function retake() {
    setPending(null);
    setCaptureError(null);
    void tryOpenCamera();
  }

  function handleFile(file: File) {
    void handleFiles([file]);
  }

  async function tryOpenCamera() {
    setCameraBlocked(false);

    // Inside the iOS / Android app use the real device camera.
    if (isNativeApp()) {
      try {
        const shot = await nativeCapturePhoto();
        if (shot) {
          void haptic("light");
          await handleFiles([shot]);
        }
        return;
      } catch {
        setCaptureError("We couldn't open the camera. Try again, or choose a photo instead.");
        toast.error(cameraUnavailableMessage);
        return;
      }
    }

    if (prefersCaptureInput()) {
      cameraRef.current?.click();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraBlocked(true);
      toast.error(cameraUnavailableMessage);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setCameraBlocked(true);
      toast.error(cameraUnavailableMessage);
    }
  }

  function captureDesktopPhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      toast.error(cameraUnavailableMessage);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCaptureError("That picture didn't save. Please take it again.");
        return;
      }
      const file = new File([blob], `fridge-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      // Show it and wait for "Use this photo" — never scan straight away.
      setCaptureError(null);
      setPending({
        media: { primaryDataUrl: dataUrl, dataUrls: [dataUrl], kind: "photo" },
        files: [file],
      });
      stopCamera();
    }, "image/jpeg", 0.92);
  }

  function handleCameraChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      void handleFiles([file]);
    } else {
      setCameraBlocked(true);
      toast.error(cameraUnavailableMessage);
    }
    // Reset so the same file can be selected again
    if (cameraRef.current) cameraRef.current.value = "";
  }

  return (
    <Card className={cn("ring-paper border-border/60 bg-card", compact ? "p-3 sm:p-4" : "p-5")}>
      {label && (
        <h3 className={cn("font-display text-lg tracking-tight", compact ? "mb-3" : "mb-4")}>
          {label}
        </h3>
      )}
      <div className={cn("grid gap-2.5 sm:gap-3", compact ? "grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4")}>
        {/* Take Photo — large thumb-friendly tap target */}
        <button
          type="button"
          onClick={tryOpenCamera}
          className={cn("group flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.04] active:scale-[0.98]", compact ? "py-4" : "py-6")}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
            <Camera className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Take Photo</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Open camera</div>
          </div>
        </button>

        {/* Choose from Photos */}
        <button
          type="button"
          onClick={async () => {
            if (!isNativeApp()) {
              fileRef.current?.click();
              return;
            }
            try {
              const photos = await nativePickPhotos();
              if (photos.length) await handleFiles(photos);
            } catch {
              setCaptureError("We couldn't open Photos. Try again.");
              toast.error("We couldn't open Photos. Try again.");
            }
          }}
          className={cn("group flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 text-center transition-colors hover:border-success/40 hover:bg-success/[0.04] active:scale-[0.98]", compact ? "py-4" : "py-6")}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-success/10 text-success transition-transform group-hover:scale-105">
            <Images className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Choose from Photos</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Photos or videos — pick several</div>
          </div>
        </button>

        {/* Record a short video */}
        <button
          type="button"
          onClick={() => videoCaptureRef.current?.click()}
          className={cn("group flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 text-center transition-colors hover:border-accent/40 hover:bg-accent/[0.04] active:scale-[0.98]", compact ? "py-4" : "py-6")}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent transition-transform group-hover:scale-105">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Record Video</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Pan across your shelves</div>
          </div>
        </button>

        {/* Drag & drop area */}
        <label
          className={cn(
            "group flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 text-center transition-colors active:scale-[0.98]",
            compact ? "py-4" : "py-6",
            dragOver
              ? "border-primary/50 bg-primary/[0.05]"
              : "border-border/60 bg-secondary/40 hover:border-primary/40 hover:bg-primary/[0.04]",
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const dropped = Array.from(e.dataTransfer.files ?? []);
            if (dropped.length) void handleFiles(dropped);
          }}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent transition-transform group-hover:scale-105">
            <ArrowUpFromLine className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Drag & Drop</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Drop images or a video</div>
          </div>
        </label>
      </div>

      {/* Confirm the exact photo before anything is scanned */}
      <div ref={previewRef}>
        {pending && (
          <div className="mt-4 rounded-lg border border-border/60 bg-secondary/30 p-3">
            <img
              src={pending.media.primaryDataUrl}
              alt="The photo you just took"
              className="max-h-[46vh] w-full rounded-md object-contain"
            />
            {pending.media.dataUrls.length > 1 && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {pending.media.kind === "video"
                  ? `Using ${pending.media.dataUrls.length} frames from your video`
                  : `${pending.media.dataUrls.length} pictures selected`}
              </p>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={confirmPending}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
              >
                <Check className="h-4 w-4" /> Use this photo
              </button>
              <button
                type="button"
                onClick={retake}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border/60 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" /> Retake photo
              </button>
            </div>
          </div>
        )}

        {captureError && !pending && (
          <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3">
            <div className="flex items-start gap-2 text-sm text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="font-medium">{captureError}</p>
            </div>
            <button
              type="button"
              onClick={retake}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" /> Retake photo
            </button>
          </div>
        )}
      </div>

      {/* Camera blocked helper */}
      {cameraBlocked && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{cameraUnavailableMessage}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Use Choose from Photos to upload an image manually.
            </p>
          </div>
        </div>

      )}

      {cameraOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-lg border border-border bg-card p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-display text-lg text-foreground">Take Photo</p>
              <button
                type="button"
                onClick={stopCamera}
                className="grid h-9 w-9 place-items-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close camera"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <video ref={videoRef} playsInline muted autoPlay className="aspect-[4/3] w-full rounded-md bg-secondary object-cover" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={stopCamera} className="rounded-md border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                Cancel
              </button>
              <button type="button" onClick={captureDesktopPhoto} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      {/* Gallery picker */}
      <input
        ref={fileRef}
        type="file"
        accept={MEDIA_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          if (picked.length) void handleFiles(picked);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
      {/* Video capture */}
      <input
        ref={videoCaptureRef}
        type="file"
        accept={VIDEO_ACCEPT}
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFiles([file]);
          if (videoCaptureRef.current) videoCaptureRef.current.value = "";
        }}
      />
      {/* Camera capture — primary attempt */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleCameraChange}
      />
      {processing && (
        <p className="mt-3 text-center text-xs font-medium text-muted-foreground">Getting your photos and video ready…</p>
      )}
      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        Photos and short videos both work. Works on Android Chrome, Samsung Internet, iPhone Safari, and iPhone Chrome.
        If the camera doesn't open, try "Choose from Photos" — it works everywhere.
      </p>
    </Card>
  );
}

export function InlinePhotoPicker({ onPick }: { onPick: (file: File, dataUrl: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pending, setPending] = useState<{ file: File; dataUrl: string } | null>(null);
  const cameraUnavailableMessage = "Camera not available on this device. Please choose a photo instead.";

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  useEffect(() => () => stopCamera(), []);

  async function handleFile(file: File) {
    try {
      const media = await prepareMedia([file]);
      setPending({ file, dataUrl: media.primaryDataUrl });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't use that file. Please try another photo or video.");
    }
  }

  async function tryOpenCamera() {
    const ua = navigator.userAgent;
    if (/Android|iPhone|iPad|iPod/i.test(ua) && !/CrOS|Macintosh|Windows/i.test(ua)) {
      cameraRef.current?.click();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(cameraUnavailableMessage);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      toast.error(cameraUnavailableMessage);
    }
  }

  function captureDesktopPhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      toast.error(cameraUnavailableMessage);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error(cameraUnavailableMessage);
        return;
      }
      const file = new File([blob], `fridge-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      setPending({ file, dataUrl: canvas.toDataURL("image/jpeg", 0.92) });
      stopCamera();
    }, "image/jpeg", 0.92);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={tryOpenCamera}
        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/40 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <Camera className="h-4 w-4" /> Take
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/40 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <ImagePlus className="h-4 w-4" /> Upload
      </button>
      <input ref={fileRef} type="file" accept={MEDIA_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); if (fileRef.current) fileRef.current.value = ""; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); if (cameraRef.current) cameraRef.current.value = ""; }} />
      {cameraOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-lg border border-border bg-card p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-display text-lg text-foreground">Take Photo</p>
              <button type="button" onClick={stopCamera} className="grid h-9 w-9 place-items-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Close camera">
                <X className="h-4 w-4" />
              </button>
            </div>
            <video ref={videoRef} playsInline muted autoPlay className="aspect-[4/3] w-full rounded-md bg-secondary object-cover" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={stopCamera} className="rounded-md border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">Cancel</button>
              <button type="button" onClick={captureDesktopPhoto} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">Capture</button>
            </div>
          </div>
        </div>
      )}
      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-lg border border-border bg-card p-4 shadow-lg">
            <p className="mb-3 font-display text-lg text-foreground">Your photo</p>
            <img src={pending.dataUrl} alt="The photo you just took" className="max-h-[55vh] w-full rounded-md object-contain" />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  const p = pending;
                  setPending(null);
                  onPick(p.file, p.dataUrl);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
              >
                <Check className="h-4 w-4" /> Use this photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setPending(null);
                  void tryOpenCamera();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border/60 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" /> Retake photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
