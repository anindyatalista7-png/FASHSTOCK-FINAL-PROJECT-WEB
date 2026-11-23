"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { StockBadge } from "../ui";

/**
 * Quick lookup produk via barcode/QR:
 * - Scanner USB/Bluetooth (bertindak seperti keyboard + Enter) -> kolom input
 * - Kamera perangkat via BarcodeDetector API (Chrome Android / macOS / ChromeOS)
 */
export default function Scanner({ role }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [camera, setCamera] = useState(false);
  const [camSupported, setCamSupported] = useState(false);
  const [history, setHistory] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setCamSupported(typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices);
    inputRef.current?.focus();
  }, []);

  const lookup = useCallback(async (raw) => {
    const sku = String(raw || "").trim();
    if (!sku) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/products/lookup?sku=${encodeURIComponent(sku)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Produk tidak ditemukan");
      setResult(data.product);
      setHistory((h) => [data.product, ...h.filter((p) => p.id !== data.product.id)].slice(0, 5));
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setLoading(false);
      setCode("");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera(false);
  }, []);

  useEffect(() => {
    if (!camera) return;
    let active = true;
    let timer;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        // eslint-disable-next-line no-undef
        const detector = new BarcodeDetector({ formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8"] });
        const tick = async () => {
          if (!active || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              stopCamera();
              lookup(codes[0].rawValue);
              return;
            }
          } catch {}
          timer = setTimeout(tick, 300);
        };
        tick();
      } catch (err) {
        setError("Tidak dapat mengakses kamera: " + err.message);
        stopCamera();
      }
    })();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [camera, lookup, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const canTrx = role === "staff" || role === "manager";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="card p-5 sm:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(code);
          }}
          className="space-y-3"
        >
          <label className="label" htmlFor="code">SKU / hasil scan</label>
          <div className="flex gap-2">
            <input
              id="code"
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Arahkan scanner atau ketik SKU, lalu Enter"
              className="input font-mono"
              autoComplete="off"
            />
            <button className="btn btn-primary" disabled={loading}>{loading ? "..." : "Cari"}</button>
          </div>
        </form>

        <div className="mt-5">
          {camera ? (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl bg-black">
                <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
                <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-brand-400/80" />
              </div>
              <button type="button" onClick={stopCamera} className="btn btn-outline w-full">Matikan kamera</button>
            </div>
          ) : (
            <button type="button" onClick={() => setCamera(true)} disabled={!camSupported} className="btn btn-outline w-full py-3">
              <Icon name="camera" className="h-4 w-4" /> Scan dengan kamera
            </button>
          )}
          {!camSupported && (
            <p className="mt-2 text-xs text-stone-500">Browser ini belum mendukung BarcodeDetector. Gunakan scanner USB atau ketik SKU secara manual (Chrome Android direkomendasikan untuk kamera).</p>
          )}
        </div>

        {history.length > 0 && (
          <div className="mt-6">
            <p className="label">Terakhir dipindai</p>
            <div className="flex flex-wrap gap-2">
              {history.map((p) => (
                <button key={p.id} type="button" onClick={() => setResult(p)} className="rounded-lg bg-stone-100 px-2.5 py-1 font-mono text-xs font-semibold text-stone-700 hover:bg-stone-200">
                  {p.sku}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" /> {error}
          </div>
        )}
        {!error && !result && (
          <div className="grid h-full min-h-56 place-items-center text-center text-sm text-stone-400">
            <div>
              <Icon name="qr" className="mx-auto mb-3 h-12 w-12 text-stone-300" strokeWidth={1.3} />
              Hasil pencarian produk akan tampil di sini.
            </div>
          </div>
        )}
        {result && !error && (
          <div>
            <div className="flex items-start gap-4">
              {result.has_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/images/products/${result.id}`} alt={result.name} className="h-20 w-20 rounded-2xl border border-stone-200 object-cover" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-stone-100 text-stone-400"><Icon name="box" className="h-8 w-8" /></div>
              )}
              <div className="min-w-0 flex-1">
                <p className="sku">{result.sku}</p>
                <h2 className="text-lg font-bold text-ink">{result.name}</h2>
                <p className="text-sm text-stone-500">{result.category_name} · Rak <span className="sku">{result.rack_location}</span></p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-stone-50 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Stok</p>
                <p className="text-2xl font-extrabold tabular-nums text-ink">{result.stock} <span className="text-sm font-semibold text-stone-500">{result.unit}</span></p>
              </div>
              <StockBadge status={result.stock_status} />
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link href={`/products/${result.id}`} className="btn btn-outline"><Icon name="eye" className="h-4 w-4" /> Detail Produk</Link>
              {canTrx && <Link href={`/transactions/new?type=IN&product=${result.id}`} className="btn btn-success"><Icon name="arrowIn" className="h-4 w-4" /> Barang Masuk</Link>}
              {canTrx && <Link href={`/transactions/new?type=OUT&product=${result.id}`} className="btn btn-accent"><Icon name="arrowOut" className="h-4 w-4" /> Barang Keluar</Link>}
              {role === "manager" && <Link href={`/restock/new?product=${result.id}`} className="btn btn-primary"><Icon name="truck" className="h-4 w-4" /> Restock</Link>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
