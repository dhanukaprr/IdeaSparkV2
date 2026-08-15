import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, ExternalLink, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCode: string;
}

export function QRCodeModal({ isOpen, onClose, sessionCode }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?code=${encodeURIComponent(sessionCode)}`
    : `https://ideaspark.app/?code=${sessionCode}`;

  useEffect(() => {
    if (isOpen && sessionCode) {
      QRCode.toDataURL(joinUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1A1A1A',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [isOpen, sessionCode, joinUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
      <div
        id="qr-modal-container"
        className="bg-white border border-slate-200/80 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl shadow-indigo-500/20 relative flex flex-col items-center text-center overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

        <button
          id="qr-modal-close"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-3 mt-1">
          <QrCode className="w-6 h-6" />
        </div>

        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
          INSTANT MOBILE ONBOARDING
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">Scan to Join Session</h3>
        <p className="text-xs text-slate-600 mb-5">
          Scan with any mobile camera to submit ideas and vote anonymously.
        </p>

        {/* QR Code Container */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner mb-5 flex items-center justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code to join session ${sessionCode}`}
              className="w-60 h-60 rounded-xl object-contain bg-white p-2 shadow-xs border border-slate-100"
            />
          ) : (
            <div className="w-60 h-60 flex items-center justify-center text-slate-400 text-xs font-mono">
              Generating QR code...
            </div>
          )}
        </div>

        {/* Big Code Pill */}
        <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-3.5 mb-4 flex items-center justify-between shadow-xs">
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-wider text-blue-600 font-bold">ROOM PIN</div>
            <div className="text-2xl font-black tracking-widest text-slate-900 font-mono">{sessionCode}</div>
          </div>
          <button
            id="qr-modal-copy-btn"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/20 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
          <span>URL:</span>
          <span className="truncate max-w-[240px] font-bold text-slate-700">{joinUrl}</span>
        </div>
      </div>
    </div>
  );
}
