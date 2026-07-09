import { useEffect, useRef, useState } from "react";
import { Camera, Images, ArrowUpFromLine, ImagePlus, AlertTriangle, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type PhotoPickerProps = {
  onPick: (file: File, dataUrl: string) => void;
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
export function PhotoPicker({ onPick, compact = false, label }: PhotoPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const cameraUnavailableMessage = "Camera not available on this device. Please choose a photo instead.";

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

  function handleFile(file: File) {
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Photo too large. Use one under 12MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onPick(file, String(reader.result));
    reader.readAsDataURL(file);
  }

  async function tryOpenCamera() {
    setCameraBlocked(false);

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
        toast.error(cameraUnavailableMessage);
        return;
      }
      const file = new File([blob], `fridge-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onPick(file, dataUrl);
      stopCamera();
    }, "image/jpeg", 0.92);
  }

  function handleCameraChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    } else {
      setCameraBlocked(true);
      toast.error(cameraUnavailableMessage);
    }
    // Reset so the same file can be selected again
    if (cameraRef.current) cameraRef.current.value = "";
  }

  return (
    <Card className="ring-paper border-border/60 bg-card p-5">
      {label && (
        <h3 className="mb-4 font-display text-lg tracking-tight">{label}</h3>
      )}
      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-3")}>
        {/* Take Photo — large thumb-friendly tap target */}
        <button
          type="button"
          onClick={tryOpenCamera}
          className="group flex flex-col items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/40 px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
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
          onClick={() => fileRef.current?.click()}
          className="group flex flex-col items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/40 px-4 py-6 text-center transition-colors hover:border-success/40 hover:bg-success/[0.04]"
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-success/10 text-success transition-transform group-hover:scale-105">
            <Images className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Choose from Photos</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Gallery or Google Photos</div>
          </div>
        </button>

        {/* Drag & drop area */}
        <label
          className={cn(
            "group flex flex-col items-center gap-2.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragOver
              ? "border-primary/50 bg-primary/[0.05]"
              : "border-border/60 bg-secondary/40 hover:border-primary/40 hover:bg-primary/[0.04]",
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent transition-transform group-hover:scale-105">
            <ArrowUpFromLine className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Drag & Drop</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Drop an image here</div>
          </div>
        </label>
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
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          if (fileRef.current) fileRef.current.value = "";
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
      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        Works on Android Chrome, Samsung Internet, iPhone Safari, and iPhone Chrome.
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
  const cameraUnavailableMessage = "Camera not available on this device. Please choose a photo instead.";

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  useEffect(() => () => stopCamera(), []);

  function handleFile(file: File) {
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Photo too large. Use one under 12MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onPick(file, String(reader.result));
    reader.readAsDataURL(file);
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
      onPick(file, canvas.toDataURL("image/jpeg", 0.92));
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
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
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
    </div>
  );
}
