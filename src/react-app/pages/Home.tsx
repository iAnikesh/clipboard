import { useState, useEffect } from "react";
import { Copy, Check, Clock, PlusCircle } from "lucide-react";
import { getRemainingSeconds, formatTime } from "../utils/time";

export default function Home() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!result) return;
    
    setTimeLeft(getRemainingSeconds(result.expiresAt));
    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(result.expiresAt);
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [result]);

  const handleCreate = async () => {
    if (!content.trim()) return;
    
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "An unexpected error occurred.");
      }
      
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create paste");
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNew = () => {
    setContent("");
    setResult(null);
    setCopied(false);
    setTimeLeft(null);
  };

  return (
    <div className="glass-panel animate-fade-in">
      <h1>Clipboard</h1>
      <h2>Share text securely. Expires in 1 hour.</h2>
      
      {!result ? (
        <>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your text here..."
            disabled={loading}
          />
          {error && <p style={{ color: "#ef4444", marginTop: "0.5rem" }}>{error}</p>}
          <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleCreate} disabled={!content.trim() || loading}>
              {loading ? "Creating..." : "Create Link"}
            </button>
          </div>
        </>
      ) : (
        <div className="animate-fade-in">
          <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Your link is ready:</p>
          <div className="url-result">
            <span className="url-text">{result.url}</span>
            <button className="secondary" onClick={handleCopy} aria-label="Copy to clipboard">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          
          <div className="status-bar">
            <div className={`countdown ${timeLeft !== null && timeLeft < 300 ? "urgent" : ""}`}>
              <Clock size={18} />
              <span>
                {timeLeft === null ? "Calculating..." : 
                 timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : "Expired"}
              </span>
            </div>
            <button className="secondary" onClick={handleNew}>
              <PlusCircle size={18} /> New Paste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
