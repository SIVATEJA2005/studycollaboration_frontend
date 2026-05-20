import React, { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
  MdLink,
  MdPictureAsPdf,
  MdImage,
  MdVideoLibrary,
  MdFolder,
  MdAttachFile,
  MdCloudUpload,
  MdDeleteOutline,
  MdOpenInNew,
  MdDownload,
  MdFolderOpen,
  MdClose,
  MdVisibility,
} from "react-icons/md";
import PomodoroWidget from "./PomodoroWidget";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
const getToken = () => localStorage.getItem("token");
const getUserId = () => localStorage.getItem("userId");

// ✅ FIX 1: resolveUrl — stops double URL like http://localhost:8080https://cloudinary.com/...
const resolveUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE}${url}`;
};

const TYPE_CONFIG = {
  LINK:  { Icon: MdLink,          label: "Link",  color: "#6C63FF", bg: "#F3F0FF", mimeType: "text/html"       },
  PDF:   { Icon: MdPictureAsPdf,  label: "PDF",   color: "#DC2626", bg: "#FEF2F2", mimeType: "application/pdf" },
  IMAGE: { Icon: MdImage,         label: "Image", color: "#059669", bg: "#ECFDF5", mimeType: "image/*"          },
  VIDEO: { Icon: MdVideoLibrary,  label: "Video", color: "#D97706", bg: "#FEF3C7", mimeType: "video/*"          },
  FILE:  { Icon: MdFolder,        label: "File",  color: "#4B4880", bg: "#F8F6FF", mimeType: "*/*"              },
};

const theme = {
  primary:         "#6C63FF",
  primaryGradient: "linear-gradient(135deg,#6C63FF 0%,#A78BFA 100%)",
  primaryLight:    "#F3F0FF",
  border:          "#EDE9FF",
  text:            "#1E1B4B",
  textSec:         "#4B4880",
  textMuted:       "#9CA3AF",
  bg:              "#F8F6FF",
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF Viewer Modal
// ─────────────────────────────────────────────────────────────────────────────
function PdfViewerModal({ resource, roomId, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const fileUrl = resolveUrl(resource.url);
  // ✅ Use Google PDF viewer — works with any public URL including Cloudinary
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(15,10,40,0.78)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 920, height: "90vh",
          display: "flex", flexDirection: "column",
          borderRadius: 16, overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          border: `1.5px solid ${theme.border}`, background: "#fff",
        }}
      >
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "11px 16px", background: "#fff",
          borderBottom: `1px solid ${theme.border}`, flexShrink: 0,
        }}>
          <MdPictureAsPdf size={20} color="#DC2626" />
          <span style={{
            flex: 1, fontSize: 14, fontWeight: 700, color: theme.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {resource.title}
          </span>

          
          <a  href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 11px", borderRadius: 7,
              background: theme.primaryLight, color: theme.primary,
              border: `1px solid ${theme.border}`,
              fontSize: 12, fontWeight: 600, textDecoration: "none",
            }}
          >
            <MdOpenInNew size={14} /> New Tab
          </a>

          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: "1px solid #FECACA", background: "#FEF2F2",
              color: "#EF4444", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <MdClose size={17} />
          </button>
        </div>

        {/* ✅ Google Docs viewer iframe — no blob needed, no download forced */}
        <iframe
          src={viewerUrl}
          title={resource.title}
          style={{ flex: 1, width: "100%", border: "none", background: "#525659" }}
        />

        {/* Pomodoro footer */}
        <div style={{
          flexShrink: 0, borderTop: `1px solid ${theme.border}`,
          background: "#FDFAFF", transform: "translateZ(0)",
          position: "relative", minHeight: 76,
          display: "flex", alignItems: "center",
          justifyContent: "flex-end", paddingRight: 24, paddingBlock: 10,
        }}>
          <PomodoroWidget roomId={roomId} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ResourcesTab
// ─────────────────────────────────────────────────────────────────────────────
export default function ResourcesTab({ roomId }) {
  const [resources, setResources] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");
  const [dragOver,  setDragOver]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [linkUrl,   setLinkUrl]   = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [preview,   setPreview]   = useState(null);
  const [previewing,setPreviewing]= useState(false);
  const [error,     setError]     = useState(null);
  const [pdfResource, setPdfResource] = useState(null);

  const fileInputRef  = useRef(null);
  const stompRef      = useRef(null);
  const previewTimer  = useRef(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/resources/room/${roomId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) setResources(await res.json());
        else throw new Error("Failed to load resources");
      } catch (e) {
        setError("Failed to load resources");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
      connectHeaders:   { Authorization: `Bearer ${getToken()}` },
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/room/${roomId}/resources`, (msg) => {
          try {
            const r = JSON.parse(msg.body);
            setResources((prev) => prev.some((x) => x.id === r.id) ? prev : [r, ...prev]);
          } catch {}
        });
        client.subscribe(`/topic/room/${roomId}/resources/delete`, (msg) => {
          try {
            const id = JSON.parse(msg.body);
            setResources((prev) => prev.filter((x) => x.id !== id));
          } catch {}
        });
      },
      onDisconnect:   () => setConnected(false),
      onStompError:   () => setError("Connection error"),
      reconnectDelay: 5000,
    });
    client.activate();
    stompRef.current = client;
    return () => stompRef.current?.deactivate();
  }, [roomId]);

  const handleUrlChange = (val) => {
    setLinkUrl(val);
    setPreview(null);
    clearTimeout(previewTimer.current);
    if (val.startsWith("http")) {
      previewTimer.current = setTimeout(async () => {
        setPreviewing(true);
        try {
          const res = await fetch(
            `${API_BASE}/api/resources/preview?url=${encodeURIComponent(val)}`,
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );
          if (res.ok) {
            const data = await res.json();
            setPreview(data);
            if (!linkTitle && data.title) setLinkTitle(data.title);
          }
        } catch {}
        finally { setPreviewing(false); }
      }, 800);
    }
  };

  const addLink = async () => {
    if (!linkUrl.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/resources/link/${roomId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({
          url:          linkUrl.trim(),
          title:        linkTitle.trim() || linkUrl.trim(),
          previewImage: preview?.image       || null,
          previewDesc:  preview?.description || null,
          siteName:     preview?.siteName    || null,
        }),
      });
      if (res.ok) { setLinkUrl(""); setLinkTitle(""); setPreview(null); }
      else throw new Error();
    } catch { setError("Failed to add link"); }
  };

  const uploadFile = (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { setError("File size exceeds 50MB limit"); return; }
    setUploading(true);
    setUploadPct(0);
    const form = new FormData();
    form.append("file", file);
    if (file.name) form.append("title", file.name);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/resources/upload/${roomId}`);
    xhr.setRequestHeader("Authorization", `Bearer ${getToken()}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload  = () => { if (xhr.status !== 200) setError(`Upload failed: ${xhr.status}`); setUploading(false); setUploadPct(0); };
    xhr.onerror = () => { setError("Upload failed due to network error"); setUploading(false); setUploadPct(0); };
    xhr.send(form);
  };

  const deleteResource = async (r) => {
    const backup = [...resources];
    setResources((p) => p.filter((x) => x.id !== r.id));
    try {
      const res = await fetch(`${API_BASE}/api/resources/${r.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
    } catch { setResources(backup); setError("Failed to delete resource"); }
  };

  // ✅ FIX 4: openFile uses resolveUrl instead of API_BASE + url
  const openFile = (resource) => {
    if (resource.type === "LINK") {
      window.open(resource.url, "_blank");
    } else if (resource.type === "PDF") {
      setPdfResource(resource);
    } else {
      window.open(resolveUrl(resource.url), "_blank");
    }
  };

  // ✅ FIX 5: downloadFile uses resolveUrl instead of API_BASE + url
  const downloadFile = async (resource) => {
    if (!resource.url) { setError("Invalid file URL"); return; }
    try {
      const url = resolveUrl(resource.url);
      const isExternal = resource.url.startsWith("http");
      const res = await fetch(url, {
        headers: isExternal ? {} : { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = resource.originalFileName || resource.title || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch { setError("Failed to download file. Please try again."); }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024)    return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1)    + " KB";
    return                      (bytes / 1048576).toFixed(1) + " MB";
  };

  const isMyResource = (r) => String(r.addedById) === String(getUserId());

  const filtered = resources.filter((r) => {
    if (activeTab === "LINKS")  return r.type === "LINK";
    if (activeTab === "FILES")  return ["PDF","FILE"].includes(r.type);
    if (activeTab === "IMAGES") return r.type === "IMAGE";
    if (activeTab === "VIDEOS") return r.type === "VIDEO";
    return true;
  });

  const counts = {
    LINKS:  resources.filter((r) => r.type === "LINK").length,
    FILES:  resources.filter((r) => ["PDF","FILE"].includes(r.type)).length,
    IMAGES: resources.filter((r) => r.type === "IMAGE").length,
    VIDEOS: resources.filter((r) => r.type === "VIDEO").length,
  };

  const TABS = [
    { key:"ALL",    label:"All",    count: resources.length, Icon: MdFolderOpen   },
    { key:"LINKS",  label:"Links",  count: counts.LINKS,     Icon: MdLink         },
    { key:"FILES",  label:"Files",  count: counts.FILES,     Icon: MdPictureAsPdf },
    { key:"IMAGES", label:"Images", count: counts.IMAGES,    Icon: MdImage        },
    { key:"VIDEOS", label:"Videos", count: counts.VIDEOS,    Icon: MdVideoLibrary },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", background:theme.bg }}>

      {pdfResource && (
        <PdfViewerModal
          resource={pdfResource}
          roomId={roomId}
          onClose={() => setPdfResource(null)}
        />
      )}

      {error && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:1000, background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 4px 12px rgba(0,0,0,0.1)" }}>
          <span style={{ color:"#DC2626", fontSize:13 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#DC2626" }}><MdClose size={16} /></button>
        </div>
      )}

      <div style={{ flexShrink:0, padding:"20px 24px 0" }}>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <span style={{ fontSize:17, fontWeight:700, color:theme.text }}>Shared Resources</span>
            <span style={{ fontSize:13, color:theme.textMuted, marginLeft:8 }}>{resources.length} item{resources.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20, background:connected?"#ECFDF5":"#FEF3C7", color:connected?"#059669":"#D97706", border:`1px solid ${connected?"#6EE7B7":"#FDE68A"}` }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:connected?"#10B981":"#F59E0B" }} />
            {connected ? "Live sync" : "Connecting…"}
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{ border:`2px dashed ${dragOver?theme.primary:theme.border}`, borderRadius:14, padding:"18px 16px", background:dragOver?theme.primaryLight:"#fff", textAlign:"center", cursor:uploading?"default":"pointer", marginBottom:12, transition:"all 0.2s" }}
        >
          {uploading ? (
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:theme.primary, marginBottom:8 }}>Uploading… {uploadPct}%</div>
              <div style={{ background:theme.border, borderRadius:99, height:6, overflow:"hidden" }}>
                <div style={{ width:`${uploadPct}%`, height:"100%", background:theme.primaryGradient, transition:"width 0.3s" }} />
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <MdCloudUpload size={32} color={dragOver?theme.primary:theme.textMuted} style={{ transition:"color 0.2s" }} />
              <div style={{ fontSize:13, fontWeight:600, color:theme.textSec }}>{dragOver?"Drop to upload!":"Drag & drop or click to upload"}</div>
              <div style={{ fontSize:11, color:theme.textMuted }}>PDF, Images, Videos, Docs — max 50MB</div>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" style={{ display:"none" }} accept="*/*" onChange={(e) => uploadFile(e.target.files[0])} />

        <div style={{ background:"#fff", borderRadius:12, padding:12, marginBottom:12, border:`1.5px solid ${theme.border}` }}>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", flex:1, borderRadius:8, overflow:"hidden", border:`1.5px solid ${theme.border}`, background:"#FDFAFF" }}>
              <MdLink size={18} color={theme.textMuted} style={{ marginLeft:10, flexShrink:0 }} />
              <input
                value={linkUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLink()}
                placeholder="Paste a link… (YouTube, GitHub, Docs…)"
                style={{ flex:1, padding:"9px 10px", border:"none", fontSize:13, outline:"none", fontFamily:"inherit", color:theme.text, background:"transparent" }}
              />
            </div>
            <button
              onClick={addLink}
              disabled={!linkUrl.trim()}
              style={{ padding:"9px 18px", borderRadius:8, border:"none", background:linkUrl.trim()?theme.primaryGradient:"#E5E7EB", color:linkUrl.trim()?"#fff":"#9CA3AF", fontWeight:700, fontSize:13, cursor:linkUrl.trim()?"pointer":"not-allowed", whiteSpace:"nowrap" }}
            >
              Share Link
            </button>
          </div>

          {previewing && (
            <div style={{ marginTop:10, fontSize:12, color:theme.textMuted, display:"flex", alignItems:"center", gap:6 }}>
              <MdAttachFile size={14} color={theme.textMuted} /> Fetching preview…
            </div>
          )}

          {preview && !previewing && (
            <div style={{ marginTop:10, display:"flex", gap:10, padding:10, borderRadius:8, background:theme.bg, border:`1px solid ${theme.border}` }}>
              {preview.image
                ? <img src={preview.image} alt="" style={{ width:56, height:56, objectFit:"cover", borderRadius:8, flexShrink:0 }} onError={(e)=>(e.target.style.display="none")} />
                : <div style={{ width:56, height:56, borderRadius:8, flexShrink:0, background:theme.primaryLight, display:"flex", alignItems:"center", justifyContent:"center" }}><MdLink size={24} color={theme.primary}/></div>
              }
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{preview.title}</div>
                {preview.description && <div style={{ fontSize:11, color:theme.textMuted, marginTop:3, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{preview.description}</div>}
                {preview.siteName    && <div style={{ fontSize:11, color:theme.primary, fontWeight:700, marginTop:4 }}>{preview.siteName}</div>}
              </div>
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:2, borderBottom:`1px solid ${theme.border}` }}>
          {TABS.map(({ key, label, count, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 12px", border:"none", background:"transparent", cursor:"pointer", fontSize:12, fontWeight:activeTab===key?700:400, color:activeTab===key?theme.primary:theme.textMuted, borderBottom:activeTab===key?`2.5px solid ${theme.primary}`:"2.5px solid transparent", marginBottom:-1, transition:"all 0.15s", whiteSpace:"nowrap" }}
            >
              <Icon size={14} />{label} ({count})
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"16px 24px 24px" }}>

        {loading && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"50px 0", color:theme.textMuted }}>
            <MdFolderOpen size={40} color={theme.border} />
            <p style={{ fontSize:13 }}>Loading resources…</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"60px 0", color:theme.textMuted }}>
            <MdFolderOpen size={52} color={theme.border} />
            <p style={{ fontSize:15, fontWeight:600, color:theme.textSec }}>No {activeTab==="ALL"?"":activeTab.toLowerCase()+" "}resources yet</p>
            <p style={{ fontSize:12 }}>Share a link or upload a file above</p>
          </div>
        )}

        {/* ✅ FIX 6: Image grid uses resolveUrl */}
        {activeTab === "IMAGES" && filtered.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:10, marginBottom:8 }}>
            {filtered.map((r) => (
              <div key={r.id} style={{ position:"relative", borderRadius:10, overflow:"hidden", aspectRatio:"1", border:`1px solid ${theme.border}`, cursor:"pointer" }} onClick={() => openFile(r)}>
                <img src={resolveUrl(r.url)} alt={r.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,rgba(0,0,0,0.6))", padding:"20px 6px 6px" }}>
                  <div style={{ fontSize:10, color:"#fff", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.title}</div>
                </div>
                {isMyResource(r) && (
                  <button onClick={(e) => { e.stopPropagation(); deleteResource(r); }} style={{ position:"absolute", top:5, right:5, background:"rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:24, height:24, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <MdDeleteOutline size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab !== "IMAGES" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.map((r) => {
              const cfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.FILE;
              const { Icon } = cfg;
              return (
                <div key={r.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"14px 16px", background:"#fff", borderRadius:12, border:`1.5px solid ${theme.border}`, boxShadow:"0 2px 8px rgba(108,99,255,0.05)", transition:"all 0.2s" }}>

                  <div style={{ width:46, height:46, borderRadius:10, flexShrink:0, background:cfg.bg, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                    {r.type === "LINK" && r.previewImage
                      ? <img src={r.previewImage} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={(e)=>(e.target.style.display="none")} />
                      : <Icon size={24} color={cfg.color} />
                    }
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.title}</div>
                    {r.previewDesc && <div style={{ fontSize:12, color:theme.textMuted, marginTop:3, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{r.previewDesc}</div>}
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:6, flexWrap:"wrap" }}>
                      <span style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20, background:cfg.bg, color:cfg.color }}><Icon size={11}/>{cfg.label}</span>
                      {r.siteName  && <span style={{ fontSize:11, color:theme.primary, fontWeight:600 }}>{r.siteName}</span>}
                      {r.fileSize  && <span style={{ fontSize:11, color:theme.textMuted }}>{formatSize(r.fileSize)}</span>}
                      <span style={{ fontSize:11, color:theme.textMuted }}>by {isMyResource(r)?"you":r.addedBy} · {new Date(r.createdAt).toLocaleDateString([],{ month:"short", day:"numeric" })}</span>
                    </div>
                  </div>

                  <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"center" }}>
                    <button
                      onClick={() => openFile(r)}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:600, background:theme.primaryLight, color:theme.primary, border:`1px solid ${theme.border}`, whiteSpace:"nowrap", cursor:"pointer", transition:"all 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background=theme.primary; e.currentTarget.style.color="#fff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background=theme.primaryLight; e.currentTarget.style.color=theme.primary; }}
                    >
                      {r.type === "LINK" ? <><MdOpenInNew size={14}/> Open Link</> : <><MdVisibility size={14}/> View</>}
                    </button>

                    {r.type !== "LINK" && (
                      <button
                        onClick={() => downloadFile(r)}
                        title="Save to computer"
                        style={{ width:32, height:32, borderRadius:8, border:`1px solid ${theme.border}`, background:"#fff", color:theme.textMuted, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background=theme.primaryLight; e.currentTarget.style.color=theme.primary; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background="#fff"; e.currentTarget.style.color=theme.textMuted; }}
                      >
                        <MdDownload size={16} />
                      </button>
                    )}

                    {isMyResource(r) && (
                      <button
                        onClick={() => deleteResource(r)}
                        style={{ width:32, height:32, borderRadius:8, border:"1px solid #FECACA", background:"#FEF2F2", color:"#EF4444", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background="#FEE2E2"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background="#FEF2F2"; }}
                      >
                        <MdDeleteOutline size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}