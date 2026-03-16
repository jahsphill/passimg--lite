/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { Upload, Shield, CheckCircle, AlertCircle, Share2, Copy, ExternalLink, ArrowLeft, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { jsPDF } from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';
import QRCode from 'qrcode';

// --- Assets & Constants ---

const Logo = ({ className = "w-8 h-8", color = "#39FF14" }: { className?: string, color?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Shield Outer */}
    <path d="M50 8L18 22V45C18 64 50 92 50 92C50 92 82 64 82 45V22L50 8Z" stroke={color} strokeWidth="6" fill="none" strokeLinejoin="round"/>
    {/* Frame Corners (White) */}
    <path d="M38 32H46M38 32V40" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M62 32H54M62 32V40" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M38 58H46M38 58V50" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M62 58H54M62 58V50" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Checkmark Badge */}
    <circle cx="72" cy="72" r="16" fill={color} />
    <path d="M65 72L70 77L80 67" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// --- Components ---

const SecurityOverlay = ({ onRetry }: { onRetry?: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 px-6 text-center bg-black text-white animate-in fade-in duration-500">
    <div className="relative">
      <Shield className="w-20 h-20 text-neon-green animate-pulse" />
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-black">
        <AlertCircle className="w-4 h-4 text-white" />
      </div>
    </div>
    
    <div className="space-y-4 max-w-md">
      <h1 className="text-3xl font-black tracking-tighter neon-glow uppercase">Security Block Detected</h1>
      <p className="text-zinc-400 text-sm leading-relaxed">
        Your browser is blocking the security cookies required to connect to the PassIMG infrastructure. 
        This usually happens in <span className="text-white font-bold italic">Safari</span>, <span className="text-white font-bold italic">Incognito Mode</span>, or when <span className="text-white font-bold italic">Cross-Site Tracking</span> is disabled.
      </p>
    </div>

    <div className="flex flex-col w-full max-w-xs gap-3">
      <button 
        onClick={() => window.open(window.location.href, '_blank')}
        className="w-full px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-neon-green transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95"
      >
        Open in New Tab to Fix
      </button>
      
      <div className="flex gap-2">
        <button 
          onClick={() => window.location.reload()}
          className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:text-white hover:bg-zinc-800 transition-all"
        >
          Refresh
        </button>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:text-white hover:bg-zinc-800 transition-all"
          >
            Try Again
          </button>
        )}
      </div>
    </div>

    <div className="pt-8 space-y-2">
      <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold">Why is this happening?</p>
      <p className="text-[10px] text-zinc-700 max-w-xs mx-auto italic">
        The AI Studio environment runs apps in an iframe. Modern browsers block cookies in these contexts for privacy, but our security layer requires them to verify your session.
      </p>
    </div>
  </div>
);

const Badge = ({ id, status = "Verified Original" }: { id: string, status?: string }) => (
  <div className="inline-flex flex-col items-center p-4 bg-zinc-900 border border-neon-green rounded-lg shadow-lg">
    <div className="flex items-center gap-2 mb-1">
      <Logo className="w-6 h-6" />
      <span className="text-neon-green font-bold text-sm tracking-widest uppercase">Verified Image</span>
    </div>
    <div className="text-[10px] text-zinc-400 uppercase tracking-tighter mb-2">Verified via PassIMG</div>
    <div className="text-xs font-mono text-white bg-black px-2 py-1 rounded border border-zinc-800">
      ID: {id}
    </div>
  </div>
);

const FileUpload = ({ onUpload, label = "Upload Image", previewUrl }: { onUpload: (file: File) => void, label?: string, previewUrl?: string | null }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div 
      className={cn(
        "relative w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden",
        dragActive ? "border-neon-green bg-neon-green/5" : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input 
        ref={inputRef}
        type="file" 
        className="hidden" 
        accept="image/*" 
        onChange={handleChange}
      />
      {previewUrl ? (
        <div className="w-full h-full relative group">
          <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-4" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-white text-xs font-bold uppercase tracking-widest">Click or Drag to Replace</p>
          </div>
        </div>
      ) : (
        <>
          <Upload className={cn("w-10 h-10 mb-3", dragActive ? "text-neon-green" : "text-zinc-500")} />
          <p className="text-zinc-400 text-sm font-medium">{label}</p>
          <p className="text-zinc-600 text-xs mt-1 uppercase tracking-widest font-bold">JPG, PNG or WEBP (Max 50MB)</p>
        </>
      )}
    </div>
  );
};

// --- Pages ---

const HomePage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [cookieError, setCookieError] = useState(false);
  const navigate = useNavigate();

  const onFileChange = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const checkApi = async () => {
    setApiStatus('checking');
    try {
      // First try to init/prime cookies
      await fetch('/api/init', { credentials: 'include' }).catch(() => {});
      
      const res = await fetch('/api/health', { credentials: 'include' });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          // If we get HTML back from an API call, it's almost certainly the cookie check page
          setApiStatus('offline');
          setCookieError(true);
        } else {
          setApiStatus('online');
          setCookieError(false);
        }
      } else {
        setApiStatus('offline');
      }
    } catch (e) {
      setApiStatus('offline');
    }
  };

  useEffect(() => {
    checkApi();
  }, []);

  const handleVerify = async () => {
    if (!file) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('image', file);

    try {
      const apiUrl = "/api/verify";
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      const contentType = response.headers.get("content-type");
      const isHtml = contentType && contentType.includes("text/html");
      
      if (!response.ok || isHtml) {
        const errorText = isHtml ? "Cookie check required" : await response.text();
        
        let errorMessage = `Server error (${response.status})`;
        if (!isHtml && contentType && contentType.includes("application/json")) {
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch (e) {}
        } else if (isHtml || errorText.includes("Cookie check") || errorText.includes("Action required to load your app") || errorText.includes("Authenticate in new window")) {
          setCookieError(true);
          errorMessage = "AI Studio Security: Browser is blocking cookies. Please open in a new tab.";
        } else if (errorText.includes("<!doctype html>") || errorText.includes("<html>")) {
          errorMessage = "The server returned an HTML page instead of a data response.";
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      const isCookieError = err.message?.includes("blocking") || err.message?.includes("AI Studio Security") || err.message?.includes("Cookie check");
      
      if (isCookieError) {
        setCookieError(true);
      } else {
        alert(err.message || "Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (cookieError) {
    return <SecurityOverlay onRetry={checkApi} />;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 bg-black text-white">
      <header className="text-center mb-12 flex flex-col items-center">
        <Logo className="w-20 h-20 mb-6" />
        <h1 className="text-4xl font-bold tracking-tight mb-2 neon-glow">
          PassIMG Lite
        </h1>
        <p className="text-zinc-400 text-lg">
          Verify that an image hasn’t been altered.
        </p>
      </header>

      <main className="space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border",
            apiStatus === 'online' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : 
            apiStatus === 'offline' ? "bg-red-500/10 text-red-500 border-red-500/20" : 
            "bg-zinc-800 text-zinc-500 border-zinc-700"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", apiStatus === 'online' ? "bg-neon-green animate-pulse" : apiStatus === 'offline' ? "bg-red-500" : "bg-zinc-600")} />
            Infrastructure: {apiStatus}
          </div>
          
          {apiStatus === 'offline' && (
            <button 
              onClick={() => window.open(window.location.href, '_blank')}
              className="text-[10px] text-zinc-400 hover:text-white underline underline-offset-4 decoration-zinc-700 font-bold uppercase tracking-widest"
            >
              Fix Connectivity: Open in New Tab
            </button>
          )}
        </div>

        {!result ? (
          <section className="space-y-6">
            <FileUpload onUpload={onFileChange} previewUrl={preview} label={file ? file.name : "Upload Image to Verify"} />
            <button 
              disabled={!file || loading}
              onClick={handleVerify}
              className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-neon-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? "Processing..." : "Generate Fingerprint"}
            </button>

            {/* How It Works Section */}
            <div className="pt-12 mt-12 border-t border-zinc-900">
              <h2 className="text-center text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-10">
                How PassIMG Lite Works
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-neon-green font-mono text-xs font-bold">01</div>
                    <h3 className="font-bold text-sm text-white uppercase tracking-wider">Upload Image</h3>
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed pl-11">
                    Upload a photo to PassIMG Lite for verification.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-neon-green font-mono text-xs font-bold">02</div>
                    <h3 className="font-bold text-sm text-white uppercase tracking-wider">Fingerprint</h3>
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed pl-11">
                    The system generates a unique SHA-256 fingerprint.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-neon-green font-mono text-xs font-bold">03</div>
                    <h3 className="font-bold text-sm text-white uppercase tracking-wider">Share Link</h3>
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed pl-11">
                    Share the public verification page with others.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-neon-green font-mono text-xs font-bold">04</div>
                    <h3 className="font-bold text-sm text-white uppercase tracking-wider">Verify</h3>
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed pl-11">
                    Others can confirm integrity by re-uploading the file.
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6"
          >
            <div className="flex items-center gap-3 text-neon-green mb-4">
              <CheckCircle className="w-6 h-6" />
              <h2 className="text-xl font-bold">Verification Successful</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Verification ID</label>
                <p className="font-mono text-white text-lg font-bold">{result.id}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Timestamp (Local)</label>
                <p className="font-mono text-white text-sm">
                  {new Intl.DateTimeFormat('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                  }).format(new Date(result.timestamp))}
                </p>
              </div>
              <div className="col-span-full space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">SHA-256 Fingerprint</label>
                <p className="font-mono text-zinc-300 text-xs break-all bg-black p-3 rounded border border-zinc-800">
                  {result.hash}
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <Link 
                to={`/verify/${result.id}`}
                className="flex-1 py-3 bg-neon-green text-black font-bold rounded-lg text-center hover:bg-white transition-colors flex items-center justify-center gap-2"
              >
                Open Verification Page <ExternalLink className="w-4 h-4" />
              </Link>
              <button 
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setPreview(null);
                }}
                className="px-6 py-3 border border-zinc-700 text-zinc-400 rounded-lg hover:bg-zinc-800 transition-colors font-bold"
              >
                New Verification
              </button>
            </div>
          </motion.section>
        )}
      </main>

      <footer className="mt-24 pt-12 border-t border-zinc-900 text-center text-zinc-600 text-sm space-y-4">
        <p>© 2026 PassIMG Lite — Trust-as-a-Service Infrastructure</p>
        <div className="flex justify-center gap-6">
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
};

const PrivacyPolicyPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 bg-black text-white">
      <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 text-sm font-bold uppercase tracking-widest">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>
      
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4 neon-glow">Privacy Policy – PassIMG Lite</h1>
        <div className="h-1 w-20 bg-neon-green"></div>
      </header>

      <div className="space-y-8 text-zinc-300 leading-relaxed">
        <p className="text-lg font-medium text-white">PassIMG Lite is an image integrity verification tool.</p>
        
        <section className="space-y-4">
          <p>When users upload an image, the system generates a cryptographic fingerprint and timestamp to verify file integrity.</p>
          <p>PassIMG Lite does not permanently store uploaded images unless required for verification purposes. Images are processed only to generate a verification record.</p>
          <p>PassIMG Lite does not sell or share user data.</p>
          <p>Verification records may contain image fingerprints, timestamps, and verification IDs.</p>
          <p>By using PassIMG Lite, you agree to the processing of images for verification purposes.</p>
        </section>

        <section className="pt-8 border-t border-zinc-900">
          <p className="text-sm text-zinc-500 uppercase tracking-widest font-bold mb-2">Contact Information</p>
          <p>For questions, contact: <a href="mailto:jahsobc27@gmail.com" className="text-neon-green hover:underline">jahsobc27@gmail.com</a></p>
        </section>
      </div>

      <footer className="mt-24 pt-12 border-t border-zinc-900 text-center text-zinc-600 text-sm">
        <p>© 2026 PassIMG Lite — Trust-as-a-Service Infrastructure</p>
      </footer>
    </div>
  );
};

const VerificationPage = () => {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cookieError, setCookieError] = useState(false);
  
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checkImageData, setCheckImageData] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Prime cookies
      await fetch('/api/init', { credentials: 'include' }).catch(() => {});
      
      const apiUrl = `/api/verify/${id}`;
      const response = await fetch(apiUrl, {
        credentials: 'include'
      });
      
      const contentType = response.headers.get("content-type");
      const isHtml = contentType && contentType.includes("text/html");
      
      if (!response.ok || isHtml) {
        const errorText = isHtml ? "Cookie check required" : await response.text();
        if (isHtml || errorText.includes("Cookie check") || errorText.includes("Action required to load your app") || errorText.includes("Authenticate in new window")) {
          setCookieError(true);
          setError("AI Studio Security: Browser is blocking cookies. Please open in a new tab.");
        } else {
          setError(response.status === 404 ? "Verification record not found." : "Failed to load verification data.");
        }
        throw new Error();
      }
      const json = await response.json();
      setData(json);
      setError(null);
      setCookieError(false);
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleCheck = async (file: File) => {
    setChecking(true);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setCheckImageData(reader.result as string);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const apiUrl = `/api/check/${id}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok || !contentType || !contentType.includes("application/json")) {
        const errorText = await response.text();
        if (errorText.includes("Cookie check") || errorText.includes("Action required to load your app") || errorText.includes("Authenticate in new window")) {
          setCookieError(true);
          throw new Error("AI Studio Security: Browser is blocking cookies. Please open in a new tab.");
        }
        throw new Error("Server returned an invalid response. Please try again.");
      }

      const json = await response.json();
      setCheckResult(json);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const isCookieError = errorMessage.includes("blocking cookies") || errorMessage.includes("AI Studio Security");
      
      if (isCookieError) {
        if (confirm(`${errorMessage}\n\nWould you like to open the app in a new tab to fix this?`)) {
          window.open(window.location.href, '_blank');
        }
      } else {
        alert("Integrity check failed. " + errorMessage);
      }
    } finally {
      setChecking(false);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/verify/${data.id}`;
    navigator.clipboard.writeText(url);
    alert("Verification link copied to clipboard!");
  };

  const downloadCertificate = async () => {
    if (!data) return;

    const doc = new jsPDF();
    const verificationUrl = `${window.location.origin}/verify/${data.id}`;
    
    // Add Logo (Convert SVG to PNG for PDF support)
    const logoSvg = `
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#000000"/>
        <path d="M50 8L18 22V45C18 64 50 92 50 92C50 92 82 64 82 45V22L50 8Z" stroke="#39FF14" stroke-width="6" fill="none" stroke-linejoin="round"/>
        <path d="M38 32H46M38 32V40" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M62 32H54M62 32V40" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M38 58H46M38 58V50" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M62 58H54M62 58V50" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="72" cy="72" r="16" fill="#39FF14" />
        <path d="M65 72L70 77L80 67" stroke="black" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    try {
      const logoDataUrl = `data:image/svg+xml;base64,${btoa(logoSvg)}`;
      const img = new Image();
      img.src = logoDataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const pngDataUrl = canvas.toDataURL('image/png');
        doc.addImage(pngDataUrl, 'PNG', 20, 15, 20, 20);
      }
    } catch (e) {
      console.error("Could not add logo to PDF", e);
    }

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text("PassIMG Verification Certificate", 45, 28);
    
    doc.setLineWidth(0.5);
    doc.line(20, 40, 190, 40);
    
    // Professional Statement
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("This document serves as official confirmation that the digital asset identified below has been verified", 20, 50);
    doc.text("for integrity via the PassIMG platform. PassIMG utilizes advanced cryptographic hashing to ensure", 20, 55);
    doc.text("that the asset remains unaltered from its state at the time of registration.", 20, 60);
    doc.setFont("helvetica", "normal");

    // Helper for Localized Timezone
    const formatLocalizedDate = (dateStr: string) => {
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }).format(new Date(dateStr));
    };

    // Details
    doc.setFontSize(12);
    doc.text(`Verification ID: ${data.id}`, 20, 75);
    doc.text(`Timestamp (Local): ${formatLocalizedDate(data.timestamp)}`, 20, 85);
    
    doc.setFontSize(10);
    doc.text("Image Fingerprint (SHA-256):", 20, 100);
    doc.setFont("courier");
    doc.text(data.hash, 20, 107);
    doc.setFont("helvetica");
    
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94); // Green
    doc.text("Verification Status: VERIFIED ORIGINAL", 20, 125);
    doc.setTextColor(0, 0, 0);
    
    doc.setFontSize(10);
    doc.text(`Verification URL: ${verificationUrl}`, 20, 140);

    // Thumbnail
    if (data.imageData) {
      try {
        const img = new Image();
        img.src = data.imageData;
        await new Promise((resolve) => { img.onload = resolve; });
        
        const maxWidth = 100;
        const maxHeight = 80;
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        const finalWidth = img.width * ratio;
        const finalHeight = img.height * ratio;

        doc.addImage(data.imageData, 'JPEG', 20, 155, finalWidth, finalHeight, undefined, 'SLOW');
        doc.setFontSize(8);
        doc.text("Original Verified Image Thumbnail", 20, 155 + finalHeight + 7);
      } catch (e) {
        console.error("Could not add image to PDF", e);
      }
    }

    // QR Code in PDF
    try {
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      doc.addImage(qrDataUrl, 'PNG', 150, 230, 40, 40);
      doc.setFontSize(8);
      doc.text("Scan to Verify Online", 155, 275);
    } catch (e) {
      console.error("Could not generate QR code for PDF", e);
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on: ${formatLocalizedDate(new Date().toISOString())}`, 20, 285);
    doc.text("Generated via Passimg-Trust-as -a-Service Infrastructure", 20, 290);

    doc.save(`PassIMG_Certificate_${data.id}.pdf`);
  };

  if (loading) return <div className="flex items-center justify-center h-screen font-mono text-neon-green text-sm tracking-widest uppercase animate-pulse">Loading Verification Data...</div>;
  
  if (error || cookieError) return (
    <div className="bg-black min-h-screen">
      {cookieError ? (
        <SecurityOverlay onRetry={fetchData} />
      ) : (
        <div className="flex flex-col items-center justify-center h-screen space-y-6 px-6 text-center text-white">
          <AlertCircle className="w-16 h-16 text-red-500" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold neon-glow">Verification Error</h1>
            <p className="text-zinc-400 max-w-md mx-auto">{error}</p>
          </div>
          <Link to="/" className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-xl hover:bg-zinc-800 transition-colors">
            Return to Dashboard
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* SECTION 1 — VERIFICATION SUMMARY (TOP CARD) */}
        <motion.section 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-sm space-y-6"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">Status:</span>
            <span className="text-xl font-bold text-neon-green flex items-center gap-2 neon-glow">
              VERIFIED ORIGINAL ✔
            </span>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Verification ID:</span>
              <span className="font-mono text-white font-bold">{data.id}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Verified On:</span>
              <span className="font-mono text-white">
                {new Intl.DateTimeFormat('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZoneName: 'short'
                }).format(new Date(data.timestamp))}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Integrity Fingerprint:</span>
              <span className="font-mono text-zinc-300 text-[10px] break-all bg-black p-3 rounded border border-zinc-800">
                {data.hash}
              </span>
            </div>
          </div>
        </motion.section>

        {/* SECTION 2 — ORIGINAL VERIFICATION IMAGE */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold neon-glow">Original Verification Image</h3>
          <p className="text-zinc-500 text-sm">Allow viewers to visually compare the verified image with suspicious versions.</p>
          <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 p-2">
            <img 
              src={data.imageData} 
              alt="Verified Content" 
              className="w-full h-auto object-contain max-h-[600px] rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </section>

        {/* SECTION 3 — COMPARE ANOTHER IMAGE */}
        <section className="space-y-6">
          <h3 className="text-lg font-bold neon-glow">Compare Another Image</h3>
          <p className="text-zinc-500 text-sm">Upload another image to check if it matches the verified file.</p>
          
          {!checkResult ? (
            <FileUpload onUpload={handleCheck} previewUrl={checkImageData} label={checking ? "Analyzing..." : "Drop image to compare"} />
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "p-6 rounded-xl border flex flex-col items-center space-y-6",
                checkResult.match ? "border-neon-green/20 bg-neon-green/5" : "border-orange-500/20 bg-orange-500/5"
              )}
            >
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold text-center">Original</p>
                  <div className="aspect-square bg-black rounded-lg overflow-hidden border border-zinc-800">
                    <img src={data.imageData} alt="Original" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold text-center">Uploaded</p>
                  <div className="aspect-square bg-black rounded-lg overflow-hidden border border-zinc-800">
                    <img src={checkImageData || ""} alt="Uploaded" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-2">
                <div className={cn("text-2xl font-black tracking-tighter", checkResult.match ? "text-neon-green neon-glow" : "text-orange-500")}>
                  {checkResult.match ? "MATCH ✔" : "MODIFIED ⚠"}
                </div>
                <p className={cn("text-sm font-medium", checkResult.match ? "text-neon-green/80" : "text-orange-500/80")}>
                  {checkResult.match 
                    ? "Image is identical to the verified original." 
                    : "Image does not match the verified original."}
                </p>
              </div>

              <button 
                onClick={() => {
                  setCheckResult(null);
                  setCheckImageData(null);
                }}
                className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
              >
                ← Test Another File
              </button>
            </motion.div>
          )}
        </section>

        {/* SECTION 4 — VERIFICATION TOOLS */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={downloadCertificate}
              className="flex-1 py-4 bg-white text-black font-bold rounded-xl hover:bg-neon-green transition-colors flex items-center justify-center gap-2 text-sm"
            >
              Download Verification Certificate
            </button>
            <button 
              onClick={copyLink}
              className="flex-1 py-4 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Copy className="w-4 h-4" /> Copy Verification Link
            </button>
          </div>
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between gap-4">
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Public Verification Link</p>
              <p className="font-mono text-xs text-zinc-300 truncate">{`${window.location.origin}/verify/${data.id}`}</p>
            </div>
            <button 
              onClick={copyLink}
              className="p-2 text-zinc-500 hover:text-neon-green transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* SECTION 5 — INVESTIGATION INSIGHT (COLLAPSIBLE) */}
        <section className="border border-zinc-800 rounded-2xl overflow-hidden">
          <button 
            onClick={() => setInsightOpen(!insightOpen)}
            className="w-full p-6 flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <h3 className="text-lg font-bold neon-glow">Investigation Insight</h3>
            {insightOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <AnimatePresence>
            {insightOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 space-y-6 border-t border-zinc-800">
                  {data.investigation.isFirstSeen ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-neon-green/10 text-neon-green text-[10px] font-bold uppercase rounded-full border border-neon-green/20">First Registered Copy</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-zinc-500">First Seen on PassIMG:</p>
                        <p className="font-mono font-bold text-white">
                          {new Intl.DateTimeFormat('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZoneName: 'short'
                          }).format(new Date(data.investigation.firstSeenTimestamp))}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-orange-500 font-bold">This exact image file has already been verified.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-sm text-zinc-500">First Seen on PassIMG:</p>
                          <p className="font-mono font-bold text-white">
                            {new Intl.DateTimeFormat('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              timeZoneName: 'short'
                            }).format(new Date(data.investigation.firstSeenTimestamp))}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-zinc-500">Original Verification ID:</p>
                          <Link to={`/verify/${data.investigation.firstSeenId}`} className="font-mono font-bold text-neon-green hover:underline">
                            {data.investigation.firstSeenId}
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      This indicates when this exact file was first registered within the PassIMG system.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 6 — QR CODE VERIFICATION */}
        <section className="flex flex-col items-center text-center space-y-4 py-8 border-t border-zinc-800">
          <div className="p-4 bg-white rounded-2xl shadow-lg">
            <QRCodeCanvas 
              value={`${window.location.origin}/verify/${data.id}`} 
              size={120}
              level="H"
            />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Scan to verify this image record on PassIMG.
          </p>
        </section>

        {/* SECTION 7 — INTEGRITY NOTICE (FOOTER INFORMATION BOX) */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <p className="text-xs text-zinc-500 leading-relaxed max-w-xl mx-auto">
            <span className="font-bold block mb-2 text-zinc-400">PassIMG verifies file integrity.</span>
            This means the exact image file shown here has not been altered since verification. 
            PassIMG does not determine the original source of the image or whether other versions exist.
          </p>
        </section>

        <footer className="mt-12 pt-12 border-t border-zinc-900 text-center text-zinc-600 text-sm space-y-4">
          <p>© 2026 PassIMG Lite — Trust-as-a-Service Infrastructure</p>
          <div className="flex justify-center gap-6">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black">
        <nav className="border-b border-zinc-900 px-6 py-4 bg-black">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="text-xl font-black tracking-tighter flex items-center gap-2 text-white">
              <Logo className="w-8 h-8" />
              PASSIMG <span className="text-neon-green">LITE</span>
            </Link>
            <div className="hidden sm:flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <a href="#" className="hover:text-white transition-colors">Infrastructure</a>
              <a href="#" className="hover:text-white transition-colors">API Docs</a>
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></div>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/verify/:id" element={<VerificationPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
        </Routes>
      </div>
    </Router>
  );
}
