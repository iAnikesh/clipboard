import { useState, useEffect, useRef } from "react";
import { Copy, Check, Clock, PlusCircle, FileText, KeyRound, ArrowRight } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useLocation } from "wouter";
import { getRemainingSeconds, formatTime } from "../utils/time";

export default function Home() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"paste" | "access">("paste");

  // Tab 1 (Paste Text) state
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ code: string; url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [pasteTurnstileToken, setPasteTurnstileToken] = useState("");
  const pasteTurnstileRef = useRef<TurnstileInstance>(null);

  // Tab 2 (Access Text) state
  const [code, setCode] = useState("");
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [accessTurnstileToken, setAccessTurnstileToken] = useState("");
  const accessTurnstileRef = useRef<TurnstileInstance>(null);

  useEffect(() => {
    document.title = "Online Clipboard | Free Text Sharing & Online Text Clipboard";
  }, []);

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

  const handleTabChange = (tab: "paste" | "access") => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setError("");
    setAccessError("");
    setPasteTurnstileToken("");
    setAccessTurnstileToken("");
  };

  const handleCreate = async () => {
    if (!content.trim() || !pasteTurnstileToken) return;
    
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, turnstileToken: pasteTurnstileToken })
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
      setPasteTurnstileToken("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      pasteTurnstileRef.current?.reset();
      setPasteTurnstileToken("");
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
    setPasteTurnstileToken("");
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (val.includes("/")) {
      const parts = val.split("/").filter(Boolean);
      if (parts.length > 0) {
        val = parts[parts.length - 1];
      }
    }
    val = val.replace(/[^A-Za-z0-9]/g, "").slice(0, 4);
    setCode(val);
    if (accessError) setAccessError("");
  };

  const handleAccess = async () => {
    const cleanCode = code.trim();
    if (cleanCode.length !== 4 || !accessTurnstileToken) return;

    setAccessLoading(true);
    setAccessError("");
    try {
      const res = await fetch(`/api/v1/paste/${cleanCode}`, {
        headers: {
          "cf-turnstile-response": accessTurnstileToken
        }
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
        throw new Error(data?.error || "Paste not found or has expired.");
      }

      setLocation(`/${cleanCode}`);
    } catch (err: unknown) {
      setAccessError(err instanceof Error ? err.message : "Failed to access paste.");
      accessTurnstileRef.current?.reset();
      setAccessTurnstileToken("");
    } finally {
      setLoading(false);
    }
  };

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAER-OJbnPU0yDDNs";

  return (
    <>
      <div className="glass-panel animate-fade-in">
        <h1>Online Clipboard</h1>
        <h2>Fast, secure text sharing &amp; online text clipboard. Pastes expire in 1 hour.</h2>

      <div className="tabs-container" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "paste"}
          className={`tab-btn ${activeTab === "paste" ? "active" : ""}`}
          onClick={() => handleTabChange("paste")}
        >
          <FileText size={18} />
          <span>Paste Text</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "access"}
          className={`tab-btn ${activeTab === "access" ? "active" : ""}`}
          onClick={() => handleTabChange("access")}
        >
          <KeyRound size={18} />
          <span>Access Text</span>
        </button>
      </div>

      {activeTab === "paste" && (
        <div className="animate-fade-in">
          {!result ? (
            <>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your text here..."
                disabled={loading}
              />
              {error && <p className="error-text">{error}</p>}
              <div className="turnstile-container">
                <Turnstile 
                  id="turnstile-paste"
                  siteKey={siteKey} 
                  onSuccess={(token) => setPasteTurnstileToken(token)}
                  onExpire={() => setPasteTurnstileToken("")}
                  ref={pasteTurnstileRef}
                  options={{ theme: "dark" }}
                />
                <button onClick={handleCreate} disabled={!content.trim() || !pasteTurnstileToken || loading}>
                  {loading ? "Creating..." : "Create Link"}
                </button>
              </div>
            </>
          ) : (
            <div className="animate-fade-in">
              <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Your link is ready:</p>
              <div className="url-result">
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: "0.2rem" }}>
                  <span className="url-text">{result.url}</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Share Code: <strong style={{ color: "var(--text-primary)", letterSpacing: "0.15rem", fontFamily: "monospace" }}>{result.code}</strong>
                  </span>
                </div>
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
      )}

      {activeTab === "access" && (
        <div className="animate-fade-in">
          <div className="code-input-section">
            <label htmlFor="code-input" className="code-label">
              Enter 4-Character Code
            </label>
            <p className="code-hint">
              Enter the 4-character code shared with you to view the paste.
            </p>
            <input 
              id="code-input"
              type="text"
              className="code-input"
              value={code}
              onChange={handleCodeChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code.trim().length === 4 && accessTurnstileToken && !accessLoading) {
                  handleAccess();
                }
              }}
              placeholder="Ab12"
              maxLength={4}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              disabled={accessLoading}
            />
            {accessError && <p className="error-text">{accessError}</p>}
          </div>

          <div className="turnstile-container">
            <Turnstile 
              id="turnstile-access"
              siteKey={siteKey} 
              onSuccess={(token) => setAccessTurnstileToken(token)}
              onExpire={() => setAccessTurnstileToken("")}
              ref={accessTurnstileRef}
              options={{ theme: "dark" }}
            />
            <button 
              onClick={handleAccess} 
              disabled={code.trim().length !== 4 || !accessTurnstileToken || accessLoading}
            >
              {accessLoading ? "Accessing..." : "Access Text"}
              {!accessLoading && <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>

    {/* SEO Features & Guide Section */}
    <section className="seo-section animate-fade-in" aria-label="About Online Clipboard">
      <div className="seo-card">
        <h3>Why Use Our Online Clipboard?</h3>
        <p className="seo-intro">
          <strong>Online Clipboard</strong> is a free, temporary <strong>text sharing</strong> tool built for quick and secure copy-pasting across all your devices. Whether you need to transfer notes from mobile to desktop or share code snippets with a colleague, our <strong>text clipboard</strong> provides instant access with no login or setup required.
        </p>

        <div className="seo-grid">
          <div className="seo-feature">
            <div className="feature-icon">📋</div>
            <h4>Cross-Device Text Clipboard</h4>
            <p>Paste text online and access it from any browser, Mac, Windows, Linux, Android, or iOS device in seconds.</p>
          </div>
          <div className="seo-feature">
            <div className="feature-icon">⚡</div>
            <h4>Instant Text Sharing</h4>
            <p>Generate shareable short links with one click. Share notes, links, and code snippets securely with anyone.</p>
          </div>
          <div className="seo-feature">
            <div className="feature-icon">🔑</div>
            <h4>4-Character Code Access</h4>
            <p>Skip long URLs. Enter the 4-character code on the <em>Access Text</em> tab to retrieve shared clipboard text instantly.</p>
          </div>
          <div className="seo-feature">
            <div className="feature-icon">🔒</div>
            <h4>Safe &amp; Self-Destructing</h4>
            <p>All shared pastes automatically expire and are permanently deleted after 1 hour, protected by Cloudflare Turnstile.</p>
          </div>
        </div>
      </div>

      <div className="seo-card">
        <h3>Frequently Asked Questions</h3>
        <div className="faq-list">
          <div className="faq-item">
            <h4>What is an online clipboard?</h4>
            <p>An online clipboard is a web tool that enables seamless text sharing between different devices over the internet without needing an account or messaging apps.</p>
          </div>
          <div className="faq-item">
            <h4>How does text sharing work on this text clipboard?</h4>
            <p>Paste your text in the "Paste Text" tab, complete the quick captcha, and click "Create Link". You will receive a short URL and a 4-character code to share.</p>
          </div>
          <div className="faq-item">
            <h4>How long does shared text stay on the clipboard?</h4>
            <p>Every paste expires automatically after 1 hour. Once expired, the content is permanently purged from our servers.</p>
          </div>
          <div className="faq-item">
            <h4>How do I access someone's shared text?</h4>
            <p>Navigate to the "Access Text" tab on any device, type the 4-character code, complete the Turnstile captcha, and click "Access Text" to read the shared content.</p>
          </div>
        </div>
      </div>
    </section>
  </>
  );
}
