"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [mode, setMode] = useState<"idle" | "camera" | "manual">("idle");
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<InstanceType<typeof import("html5-qrcode")["Html5QrcodeScanner"]> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startCamera = async () => {
    setError(null);
    setMode("camera");
    setScanning(true);
  };

  useEffect(() => {
    if (mode !== "camera" || !scanning) return;

    let scanner: InstanceType<typeof import("html5-qrcode")["Html5QrcodeScanner"]>;

    (async () => {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        scanner = new Html5QrcodeScanner(
          "barcode-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            supportedScanTypes: [0], // SCAN_TYPE_CAMERA
          },
          false
        );

        scanner.render(
          (decodedText) => {
            scanner.clear().catch(() => {});
            scannerRef.current = null;
            onScan(decodedText);
          },
          (errorMessage) => {
            // Scan error — ignore individual frame errors
            void errorMessage;
          }
        );

        scannerRef.current = scanner;
      } catch {
        setError("No se pudo iniciar la cámara. Verifica los permisos.");
        setScanning(false);
        setMode("idle");
      }
    })();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [mode, scanning, onScan]);

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
    setMode("idle");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (trimmed) {
      onScan(trimmed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full bg-secondary rounded-t-2xl md:rounded-lg md:max-w-md md:mx-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-base text-primary">Escanear código de barras</h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded hover:bg-gray-light text-gray-mid hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <p className="text-sm text-error mb-3 bg-error/10 px-3 py-2 rounded">{error}</p>
        )}

        {/* Camera mode */}
        {mode === "camera" && (
          <div>
            <div ref={containerRef} id="barcode-reader" className="w-full rounded overflow-hidden" />
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              onClick={stopCamera}
            >
              Detener cámara
            </Button>
          </div>
        )}

        {/* Manual mode */}
        {mode === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <Input
              label="Código de barras"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ingresa o escanea el código"
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="flex-1">
                Usar código
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setMode("idle")}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {/* Idle — choose mode */}
        {mode === "idle" && (
          <div className="flex flex-col gap-3">
            <Button
              onClick={startCamera}
              className="w-full justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Escanear con cámara
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-center gap-2"
              onClick={() => setMode("manual")}
            >
              <Keyboard className="w-4 h-4" />
              Ingresar manualmente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
