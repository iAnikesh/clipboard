import { useState, useEffect } from "react";
import { Clock, PlusCircle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { getRemainingSeconds, formatTime } from "../utils/time";

interface PasteData {
  code: string;
  content: string;
  createdAt: string;
  expiresAt: string;
}

export default function View({ params }: { params: { code: string } }) {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<PasteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const fetchPaste = async () => {
      try {
        const res = await fetch(`/api/v1/paste/${params.code}`);
        let result;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          result = await res.json();
        } else {
          const text = await res.text();
          throw new Error(text || "An unexpected error occurred.");
        }
        
        if (!res.ok) {
          throw new Error(result?.error || "Failed to fetch paste");
        }
        
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPaste();
  }, [params.code]);

  useEffect(() => {
    if (!data) return;
    
    setTimeLeft(getRemainingSeconds(data.expiresAt));
    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(data.expiresAt);
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [data]);

  if (loading) {
    return (
      <div className="glass-panel animate-fade-in" style={{ width: "100%", height: "400px" }}>
        <div className="skeleton" style={{ height: "40px", width: "50%", marginBottom: "2rem" }}></div>
        <div className="skeleton" style={{ height: "20px", width: "100%", marginBottom: "1rem" }}></div>
        <div className="skeleton" style={{ height: "20px", width: "100%", marginBottom: "1rem" }}></div>
        <div className="skeleton" style={{ height: "20px", width: "80%" }}></div>
      </div>
    );
  }

  if (error || (timeLeft !== null && timeLeft <= 0)) {
    return (
      <div className="glass-panel animate-fade-in error-state">
        <AlertCircle size={48} className="error-icon" />
        <h1 style={{ fontSize: "2rem", backgroundImage: "none", color: "var(--text-primary)" }}>
          {timeLeft !== null && timeLeft <= 0 ? "Paste Expired" : "Not Found"}
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
          This paste has either expired or doesn't exist.
        </p>
        <button onClick={() => setLocation("/")}>
          <PlusCircle size={18} /> Create New Paste
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Paste: {params.code}</h1>
        <button className="secondary" onClick={() => setLocation("/")} style={{ padding: "0.5rem 1rem" }}>
          <PlusCircle size={18} /> New
        </button>
      </div>
      
      <div className="paste-content">
        {data?.content}
      </div>
      
      <div className="status-bar">
        <div className={`countdown ${timeLeft !== null && timeLeft < 300 ? "urgent" : ""}`}>
          <Clock size={18} />
          <span>
            {timeLeft === null ? "Calculating..." : `Expires in ${formatTime(timeLeft)}`}
          </span>
        </div>
      </div>
    </div>
  );
}
