"use client";

import { useState, useEffect } from "react";
import "./globals.css";
import { 
  connectWallet, 
  getTokenBalance, 
  getNFTBalance, 
  getNFTDetails,
  getActivity,
  createActivity,
  isContractOwner,
  getContracts,
  requestCertificate,
  getRequest,
  approveRequest,
  rejectRequest,
  markAttendance,
  getAttendeesCount,
  getAttendee,
  hasReceivedReward,
  hasReceivedCertificate,
  endActivity,
  rewardAttendee,
  mintCertificateForAttendee
} from "@/lib/web3";

export default function Home() {
  const [account, setAccount] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [tokenBalance, setTokenBalance] = useState("0");
  const [nftBalance, setNftBalance] = useState("0");
  const [certificates, setCertificates] = useState([]);
  const [allCertificates, setAllCertificates] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [adminSubTab, setAdminSubTab] = useState("create");

  // Form states
  const [activityForm, setActivityForm] = useState({ name: "", pointReward: "" });
  const [rewardForm, setRewardForm] = useState({ activityId: "", studentAddress: "" });
  const [certForm, setCertForm] = useState({ activityId: "", studentAddress: "", tokenURI: "" });
  const [checkTokenId, setCheckTokenId] = useState("");
  const [requestForm, setRequestForm] = useState({ name: "", description: "", tokenURI: "" });
  const [pendingRequests, setPendingRequests] = useState([]);
  
  // Attendance states
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [attendeesList, setAttendeesList] = useState([]);

  // Connect wallet
  const handleConnect = async () => {
    try {
      setLoading(true);
      const addr = await connectWallet();
      setAccount(addr);
      await loadData(addr);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Load user data
  const loadData = async (addr) => {
    try {
      const balance = await getTokenBalance(addr);
      setTokenBalance(balance);

      const nftCount = await getNFTBalance(addr);
      setNftBalance(nftCount);

      const ownerStatus = await isContractOwner(addr);
      setIsOwner(ownerStatus);

      await loadActivities();
      await loadCertificates(addr, parseInt(nftCount));

      if (ownerStatus) {
        await loadAllCertificates();
        await loadPendingRequests();
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  // Load activities
  const loadActivities = async () => {
    try {
      const contracts = await getContracts();
      if (!contracts) return;

      const nextId = await contracts.activityManager.nextActivityId();
      const acts = [];
      
      for (let i = 1; i < parseInt(nextId.toString()); i++) {
        const activity = await getActivity(i);
        if (activity && activity.id !== "0") {
          acts.push(activity);
        }
      }
      setActivities(acts);
    } catch (error) {
      console.error("Error loading activities:", error);
    }
  };

  // Load certificates
  const loadCertificates = async (addr, nftCount) => {
    if (nftCount === 0) {
      setCertificates([]);
      return;
    }
    
    const certs = [];
    let consecutiveErrors = 0;
    
    for (let i = 1; i <= 100 && consecutiveErrors < 3; i++) {
      try {
        const details = await getNFTDetails(i);
        if (details && details.owner) {
          consecutiveErrors = 0;
          if (details.owner.toLowerCase() === addr.toLowerCase()) {
            certs.push(details);
          }
        } else {
          consecutiveErrors++;
        }
      } catch (e) {
        consecutiveErrors++;
      }
    }
    setCertificates(certs);
  };

  // Load ALL certificates (for admin view)
  const loadAllCertificates = async () => {
    const certs = [];
    let consecutiveErrors = 0;
    
    for (let i = 1; i <= 100 && consecutiveErrors < 3; i++) {
      try {
        const details = await getNFTDetails(i);
        if (details && details.owner) {
          consecutiveErrors = 0;
          certs.push(details);
        } else {
          consecutiveErrors++;
        }
      } catch (e) {
        consecutiveErrors++;
      }
    }
    setAllCertificates(certs);
  };

  // Handle create activity
  const handleCreateActivity = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await createActivity(activityForm.name, parseInt(activityForm.pointReward));
      setMessage({ type: "success", text: "Kegiatan berhasil dibuat!" });
      setActivityForm({ name: "", pointReward: "" });
      await loadActivities();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Handle reward student
  const handleRewardStudent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const attendeeIndex = attendeesList.findIndex(a => a.address === rewardForm.studentAddress);
      if (attendeeIndex === -1) {
        throw new Error("Mahasiswa tidak ditemukan dalam daftar hadir");
      }
      await rewardAttendee(parseInt(rewardForm.activityId), attendeeIndex);
      setMessage({ type: "success", text: "Poin berhasil diberikan!" });
      setRewardForm({ ...rewardForm, studentAddress: "" });
      await loadAttendees(parseInt(rewardForm.activityId));
      if (account) await loadData(account);
    } catch (error) {
      if (error.message.includes("Already rewarded")) {
        setMessage({ type: "error", text: "Mahasiswa sudah mendapat poin!" });
      } else {
        setMessage({ type: "error", text: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle mint certificate
  const handleMintCertificate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const attendeeIndex = attendeesList.findIndex(a => a.address === certForm.studentAddress);
      if (attendeeIndex === -1) {
        throw new Error("Mahasiswa tidak ditemukan dalam daftar hadir");
      }
      await mintCertificateForAttendee(parseInt(certForm.activityId), attendeeIndex, certForm.tokenURI);
      setMessage({ type: "success", text: "Sertifikat berhasil diterbitkan!" });
      setCertForm({ ...certForm, studentAddress: "", tokenURI: "" });
      await loadAttendees(parseInt(certForm.activityId));
      if (account) await loadData(account);
    } catch (error) {
      if (error.message.includes("Already received")) {
        setMessage({ type: "error", text: "Mahasiswa sudah mendapat sertifikat!" });
      } else {
        setMessage({ type: "error", text: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  // Check certificate by token ID
  const handleCheckCertificate = async () => {
    try {
      setLoading(true);
      const details = await getNFTDetails(parseInt(checkTokenId));
      if (details) {
        setMessage({ 
          type: "success", 
          text: `Token #${checkTokenId} dimiliki oleh ${details.owner.slice(0,6)}...${details.owner.slice(-4)}` 
        });
      } else {
        setMessage({ type: "error", text: "Token tidak ditemukan" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Token tidak ditemukan" });
    } finally {
      setLoading(false);
    }
  };

  // Student: Submit certificate request
  const handleRequestCertificate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await requestCertificate(requestForm.name, requestForm.description, requestForm.tokenURI);
      setMessage({ type: "success", text: "Pengajuan sertifikat berhasil dikirim!" });
      setRequestForm({ name: "", description: "", tokenURI: "" });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Load pending requests (for admin)
  const loadPendingRequests = async () => {
    const contracts = await getContracts();
    if (!contracts) return;

    try {
      const nextId = await contracts.activityManager.nextRequestId();
      const reqs = [];
      
      for (let i = 1; i < parseInt(nextId.toString()); i++) {
        const request = await getRequest(i);
        if (request && request.status === 0) {
          reqs.push(request);
        }
      }
      setPendingRequests(reqs);
    } catch (error) {
      console.error("Error loading requests:", error);
    }
  };

  // Admin: Approve request
  const handleApproveRequest = async (requestId) => {
    try {
      setLoading(true);
      await approveRequest(parseInt(requestId));
      setMessage({ type: "success", text: "Request berhasil di-approve!" });
      await loadPendingRequests();
      await loadAllCertificates();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Admin: Reject request
  const handleRejectRequest = async (requestId) => {
    try {
      setLoading(true);
      await rejectRequest(parseInt(requestId));
      setMessage({ type: "success", text: "Request ditolak." });
      await loadPendingRequests();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Student: Mark attendance
  const handleMarkAttendance = async (activityId) => {
    try {
      setLoading(true);
      await markAttendance(activityId);
      setMessage({ type: "success", text: "Kehadiran berhasil dicatat!" });
      if (account) await loadData(account);
    } catch (error) {
      if (error.message.includes("Already marked")) {
        setMessage({ type: "error", text: "Anda sudah absen di kegiatan ini." });
      } else {
        setMessage({ type: "error", text: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  // Admin: Load attendees for selected activity
  const loadAttendees = async (activityId) => {
    try {
      const count = await getAttendeesCount(activityId);
      const list = [];
      
      for (let i = 0; i < count; i++) {
        const addr = await getAttendee(activityId, i);
        const rewarded = await hasReceivedReward(activityId, addr);
        const certified = await hasReceivedCertificate(activityId, addr);
        list.push({ index: i, address: addr, rewarded, certified });
      }
      
      setAttendeesList(list);
    } catch (error) {
      console.error("Error loading attendees:", error);
    }
  };

  // Admin: End activity
  const handleEndActivity = async (activityId) => {
    try {
      setLoading(true);
      await endActivity(activityId);
      setMessage({ type: "success", text: "Kegiatan berhasil diakhiri!" });
      await loadActivities();
      if (selectedActivity && selectedActivity.id === activityId.toString()) {
        const act = await getActivity(activityId);
        setSelectedActivity(act);
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Auto-connect if already connected
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          loadData(accounts[0]);
        }
      });

      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setActiveTab("dashboard"); // Reset ke dashboard saat ganti akun
          setAdminSubTab("create"); // Reset admin sub-tab juga
          loadData(accounts[0]);
        } else {
          setAccount(null);
          setActiveTab("dashboard");
        }
      });
    }
  }, []);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: "", text: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Navigation items
  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "activities", icon: "📋", label: "Kegiatan" },
    ...(!isOwner ? [{ id: "certificates", icon: "🏆", label: "Sertifikat" }] : []),
    ...(isOwner ? [{ id: "admin", icon: "⚙️", label: "Admin Panel" }] : []),
  ];

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="top-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <div className="brand-icon">🎓</div>
            <div className="brand-text">Campus<span>Chain</span></div>
          </div>

          {account && (
            <div className="nav-tabs">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  className={`nav-tab ${activeTab === item.id ? "active" : ""}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span className="nav-tab-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {account ? (
            <button className="wallet-btn connected">
              <span className="wallet-dot"></span>
              <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
            </button>
          ) : (
            <button className="wallet-btn connect" onClick={handleConnect} disabled={loading}>
              {loading ? <span className="spinner"></span> : "🦊"} Connect Wallet
            </button>
          )}
        </div>
      </nav>

      {/* Toast Notifications - Fixed Position */}
      {message.text && (
        <div className="toast-container">
          <div 
            className={`toast toast-${message.type}`}
            onClick={() => setMessage({ type: "", text: "" })}
          >
            <span className="toast-icon">
              {message.type === "success" ? "✅" : message.type === "error" ? "❌" : "⚠️"}
            </span>
            <span className="toast-message">{message.text}</span>
            <button className="toast-close" onClick={() => setMessage({ type: "", text: "" })}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-container">
        {/* Welcome Screen (Not Connected) */}
        {!account ? (
          <div className="welcome-screen">
            <div className="welcome-icon">🎓</div>
            <h1 className="welcome-title">Selamat Datang di CampusChain</h1>
            <p className="welcome-subtitle">
              Platform manajemen sertifikat dan reward berbasis blockchain untuk kampus.
              Hubungkan wallet MetaMask untuk memulai.
            </p>
            <button className="btn btn-primary" style={{ maxWidth: 320 }} onClick={handleConnect} disabled={loading}>
              {loading ? <span className="spinner"></span> : "🦊"} Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Dashboard */}
            {activeTab === "dashboard" && (
              <>
                <div className="hero-banner">
                  <h1 className="hero-title">👋 Selamat Datang!</h1>
                  <p className="hero-subtitle">
                    {isOwner ? "Anda login sebagai Admin. Kelola kegiatan dan sertifikat kampus." : "Pantau poin, sertifikat, dan kegiatan kampus Anda."}
                  </p>
                  
                  <div className="hero-stats">
                    <div className="hero-stat highlight">
                      <div className="hero-stat-icon">💰</div>
                      <div className="hero-stat-value">{tokenBalance}</div>
                      <div className="hero-stat-label">Campus Points</div>
                    </div>
                    
                    <div className="hero-stat">
                      <div className="hero-stat-icon">🏆</div>
                      <div className="hero-stat-value">{nftBalance}</div>
                      <div className="hero-stat-label">Sertifikat</div>
                    </div>
                    
                    <div className="hero-stat">
                      <div className="hero-stat-icon">📋</div>
                      <div className="hero-stat-value">{activities.length}</div>
                      <div className="hero-stat-label">Kegiatan</div>
                    </div>
                    
                    <div className="hero-stat">
                      <div className="hero-stat-icon">{isOwner ? "👑" : "👤"}</div>
                      <div className="hero-stat-value" style={{ fontSize: "1.5rem" }}>{isOwner ? "Admin" : "Student"}</div>
                      <div className="hero-stat-label">Role Anda</div>
                    </div>
                  </div>
                </div>

                {/* Recent Activities Card */}
                <div className="cards-grid">
                  <div className="neu-card">
                    <div className="neu-card-header">
                      <div className="neu-card-title">
                        <div className="neu-card-icon">📋</div>
                        <span>Kegiatan Terbaru</span>
                      </div>
                      <span className="neu-card-badge">{activities.length} Total</span>
                    </div>
                    
                    {activities.length === 0 ? (
                      <p style={{ color: "var(--text-muted)" }}>Belum ada kegiatan</p>
                    ) : (
                      <div className="list-container">
                        {activities.slice(0, 4).map((act) => (
                          <div key={act.id} className="list-item">
                            <div className="list-item-info">
                              <div className="list-item-icon">📌</div>
                              <div className="list-item-text">
                                <h4>{act.name}</h4>
                                <p>ID: {act.id}</p>
                              </div>
                            </div>
                            <div className="list-item-actions">
                              {act.isEnded ? (
                                <span className="badge badge-error">Berakhir</span>
                              ) : act.isActive ? (
                                <span className="badge badge-success">Aktif</span>
                              ) : (
                                <span className="badge badge-warning">Nonaktif</span>
                              )}
                              <span className="points-badge">{act.pointReward} Poin</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="neu-card">
                    <div className="neu-card-header">
                      <div className="neu-card-title">
                        <div className="neu-card-icon">⚡</div>
                        <span>Aksi Cepat</span>
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <button className="btn btn-secondary" onClick={() => setActiveTab("activities")}>
                        📋 Lihat Semua Kegiatan
                      </button>
                      {!isOwner && (
                        <button className="btn btn-secondary" onClick={() => setActiveTab("certificates")}>
                          🏆 Lihat Sertifikat Saya
                        </button>
                      )}
                      {isOwner && (
                        <>
                          <button className="btn btn-primary" onClick={() => { setActiveTab("admin"); setAdminSubTab("create"); }}>
                            ➕ Buat Kegiatan Baru
                          </button>
                          <button className="btn btn-secondary" onClick={() => { setActiveTab("admin"); setAdminSubTab("requests"); }}>
                            📨 Pengajuan ({pendingRequests.length})
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Activities */}
            {activeTab === "activities" && (
              <>
                <div className="hero-banner" style={{ paddingBottom: "1.5rem" }}>
                  <h1 className="hero-title">📋 Daftar Kegiatan</h1>
                  <p className="hero-subtitle">Lihat semua kegiatan yang tersedia di kampus</p>
                </div>

                {activities.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>Belum Ada Kegiatan</h3>
                    <p>Belum ada kegiatan yang terdaftar</p>
                  </div>
                ) : (
                  <div className="list-container">
                    {activities.map((act) => (
                      <div key={act.id} className="list-item">
                        <div className="list-item-info">
                          <div className="list-item-icon">📌</div>
                          <div className="list-item-text">
                            <h4>{act.name}</h4>
                            <p>ID: {act.id}</p>
                          </div>
                        </div>
                        <div className="list-item-actions">
                          {act.isEnded ? (
                            <span className="badge badge-error">🏁 Berakhir</span>
                          ) : act.isActive ? (
                            <span className="badge badge-success">✓ Aktif</span>
                          ) : (
                            <span className="badge badge-warning">✗ Nonaktif</span>
                          )}
                          <span className="points-badge">{act.pointReward} Poin</span>
                          {!isOwner && act.isActive && !act.isEnded && (
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleMarkAttendance(parseInt(act.id))}
                              disabled={loading}
                            >
                              ✋ Hadir
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Certificates (Student) */}
            {activeTab === "certificates" && !isOwner && (
              <>
                <div className="hero-banner" style={{ paddingBottom: "1.5rem" }}>
                  <h1 className="hero-title">🏆 Sertifikat Saya</h1>
                  <p className="hero-subtitle">Kelola dan lihat semua sertifikat yang Anda miliki</p>
                </div>

                <div className="cards-grid">
                  {/* Check Certificate */}
                  <div className="neu-card">
                    <div className="neu-card-header">
                      <div className="neu-card-title">
                        <div className="neu-card-icon">🔍</div>
                        <span>Cek Sertifikat</span>
                      </div>
                    </div>
                    <div className="row">
                      <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Masukkan Token ID"
                          value={checkTokenId}
                          onChange={(e) => setCheckTokenId(e.target.value)}
                        />
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={handleCheckCertificate} disabled={loading}>
                        Cek
                      </button>
                    </div>
                  </div>

                  {/* Request External Certificate */}
                  <div className="neu-card">
                    <div className="neu-card-header">
                      <div className="neu-card-title">
                        <div className="neu-card-icon">📝</div>
                        <span>Ajukan Sertifikat Eksternal</span>
                      </div>
                    </div>
                    <form onSubmit={handleRequestCertificate}>
                      <div className="form-group">
                        <label className="form-label">Nama Sertifikat</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Contoh: Workshop AI"
                          value={requestForm.name}
                          onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Deskripsi</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Deskripsi singkat"
                          value={requestForm.description}
                          onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Token URI (Link Bukti)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="https://..."
                          value={requestForm.tokenURI}
                          onChange={(e) => setRequestForm({ ...requestForm, tokenURI: e.target.value })}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <span className="spinner"></span> : "Ajukan"}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Certificate List */}
                <div className="neu-card" style={{ marginTop: "1.5rem" }}>
                  <div className="neu-card-header">
                    <div className="neu-card-title">
                      <div className="neu-card-icon">📜</div>
                      <span>Daftar Sertifikat</span>
                    </div>
                    <span className="neu-card-badge">{certificates.length} Total</span>
                  </div>
                  
                  {certificates.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📜</div>
                      <h3>Belum Ada Sertifikat</h3>
                      <p>Anda belum memiliki sertifikat</p>
                    </div>
                  ) : (
                    <div className="cert-grid">
                      {certificates.map((cert) => (
                        <div key={cert.tokenId} className="cert-card">
                          <div className="cert-card-header">
                            <div className="cert-card-icon">🏅</div>
                            <div>
                              <div className="cert-card-title">Token #{cert.tokenId.toString()}</div>
                              <div className="cert-card-id">NFT Certificate</div>
                            </div>
                          </div>
                          <div className="cert-card-uri">{cert.tokenURI}</div>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              let url = cert.tokenURI;
                              if (url.startsWith("ipfs://")) {
                                url = url.replace("ipfs://", "http://127.0.0.1:8080/ipfs/");
                              }
                              window.open(url, "_blank");
                            }}
                          >
                            🔗 Lihat Sertifikat
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Admin Panel */}
            {activeTab === "admin" && isOwner && (
              <>
                <div className="hero-banner" style={{ paddingBottom: "1.5rem" }}>
                  <h1 className="hero-title">⚙️ Admin Panel</h1>
                  <p className="hero-subtitle">Kelola kegiatan, reward, dan sertifikat kampus</p>
                </div>

                {/* Admin Sub Navigation */}
                <div className="admin-nav-pills">
                  <button className={`admin-pill ${adminSubTab === "create" ? "active" : ""}`} onClick={() => setAdminSubTab("create")}>
                    ➕ Buat Kegiatan
                  </button>
                  <button className={`admin-pill ${adminSubTab === "reward" ? "active" : ""}`} onClick={() => setAdminSubTab("reward")}>
                    🎁 Beri Reward
                  </button>
                  <button className={`admin-pill ${adminSubTab === "attendance" ? "active" : ""}`} onClick={() => setAdminSubTab("attendance")}>
                    📝 Kehadiran
                  </button>
                  <button className={`admin-pill ${adminSubTab === "requests" ? "active" : ""}`} onClick={() => setAdminSubTab("requests")}>
                    📨 Pengajuan ({pendingRequests.length})
                  </button>
                  <button className={`admin-pill ${adminSubTab === "allcerts" ? "active" : ""}`} onClick={() => setAdminSubTab("allcerts")}>
                    📜 Semua Sertifikat
                  </button>
                </div>

                {/* Create Activity */}
                {adminSubTab === "create" && (
                  <div className="neu-card">
                    <div className="neu-card-header">
                      <div className="neu-card-title">
                        <div className="neu-card-icon">➕</div>
                        <span>Buat Kegiatan Baru</span>
                      </div>
                    </div>
                    <form onSubmit={handleCreateActivity}>
                      <div className="form-group">
                        <label className="form-label">Nama Kegiatan</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Contoh: Seminar Web3"
                          value={activityForm.name}
                          onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Jumlah Poin Reward</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Contoh: 100"
                          value={activityForm.pointReward}
                          onChange={(e) => setActivityForm({ ...activityForm, pointReward: e.target.value })}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <span className="spinner"></span> : "Buat Kegiatan"}
                      </button>
                    </form>
                  </div>
                )}

                {/* Reward */}
                {adminSubTab === "reward" && (
                  <div className="cards-grid">
                    <div className="neu-card">
                      <div className="neu-card-header">
                        <div className="neu-card-title">
                          <div className="neu-card-icon">💰</div>
                          <span>Beri Poin</span>
                        </div>
                      </div>
                      <form onSubmit={handleRewardStudent}>
                        <div className="form-group">
                          <label className="form-label">Pilih Kegiatan (Berakhir)</label>
                          <select
                            className="form-input"
                            value={rewardForm.activityId}
                            onChange={async (e) => {
                              const val = e.target.value;
                              setRewardForm({ activityId: val, studentAddress: "" });
                              if (val) await loadAttendees(parseInt(val));
                              else setAttendeesList([]);
                            }}
                            required
                          >
                            <option value="">-- Pilih --</option>
                            {activities.filter(a => a.isEnded).map((act) => (
                              <option key={act.id} value={act.id}>{act.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Pilih Mahasiswa</label>
                          <select
                            className="form-input"
                            value={rewardForm.studentAddress}
                            onChange={(e) => setRewardForm({ ...rewardForm, studentAddress: e.target.value })}
                            required
                            disabled={!rewardForm.activityId}
                          >
                            <option value="">-- Pilih --</option>
                            {attendeesList.filter(a => !a.rewarded).map((att) => (
                              <option key={att.index} value={att.address}>
                                {att.address.slice(0,8)}...{att.address.slice(-6)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading || !rewardForm.studentAddress}>
                          {loading ? <span className="spinner"></span> : "Beri Poin"}
                        </button>
                      </form>
                    </div>

                    <div className="neu-card">
                      <div className="neu-card-header">
                        <div className="neu-card-title">
                          <div className="neu-card-icon">🏆</div>
                          <span>Terbitkan Sertifikat</span>
                        </div>
                      </div>
                      <form onSubmit={handleMintCertificate}>
                        <div className="form-group">
                          <label className="form-label">Pilih Kegiatan (Berakhir)</label>
                          <select
                            className="form-input"
                            value={certForm.activityId}
                            onChange={async (e) => {
                              const val = e.target.value;
                              setCertForm({ ...certForm, activityId: val, studentAddress: "" });
                              if (val) await loadAttendees(parseInt(val));
                              else setAttendeesList([]);
                            }}
                            required
                          >
                            <option value="">-- Pilih --</option>
                            {activities.filter(a => a.isEnded).map((act) => (
                              <option key={act.id} value={act.id}>{act.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Pilih Mahasiswa</label>
                          <select
                            className="form-input"
                            value={certForm.studentAddress}
                            onChange={(e) => setCertForm({ ...certForm, studentAddress: e.target.value })}
                            required
                            disabled={!certForm.activityId}
                          >
                            <option value="">-- Pilih --</option>
                            {attendeesList.filter(a => !a.certified).map((att) => (
                              <option key={att.index} value={att.address}>
                                {att.address.slice(0,8)}...{att.address.slice(-6)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Token URI</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="https://ipfs.io/..."
                            value={certForm.tokenURI}
                            onChange={(e) => setCertForm({ ...certForm, tokenURI: e.target.value })}
                            required
                          />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading || !certForm.studentAddress}>
                          {loading ? <span className="spinner"></span> : "Terbitkan"}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Attendance */}
                {adminSubTab === "attendance" && (
                  <div className="neu-card">
                    <div className="neu-card-header">
                      <div className="neu-card-title">
                        <div className="neu-card-icon">📝</div>
                        <span>Kelola Kehadiran</span>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Pilih Kegiatan</label>
                      <select 
                        className="form-input"
                        value={selectedActivity?.id || ""}
                        onChange={async (e) => {
                          const val = e.target.value;
                          if (val) {
                            const act = await getActivity(parseInt(val));
                            setSelectedActivity(act);
                            await loadAttendees(parseInt(val));
                          } else {
                            setSelectedActivity(null);
                            setAttendeesList([]);
                          }
                        }}
                      >
                        <option value="">-- Pilih --</option>
                        {activities.map((act) => (
                          <option key={act.id} value={act.id}>
                            {act.name} {act.isEnded ? "(Berakhir)" : act.isActive ? "(Aktif)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedActivity && (
                      <>
                        <div className="section-divider"></div>
                        
                        <div className="list-item" style={{ marginBottom: "1rem" }}>
                          <div className="list-item-info">
                            <div className="list-item-icon">📌</div>
                            <div className="list-item-text">
                              <h4>{selectedActivity.name}</h4>
                              <p>{selectedActivity.pointReward} Poin | {attendeesList.length} Hadir</p>
                            </div>
                          </div>
                          {!selectedActivity.isEnded && (
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleEndActivity(parseInt(selectedActivity.id))}
                              disabled={loading}
                            >
                              🏁 Akhiri
                            </button>
                          )}
                        </div>

                        <h4 style={{ marginBottom: "0.75rem", color: "var(--cream)" }}>Daftar Hadir:</h4>
                        {attendeesList.length === 0 ? (
                          <p style={{ color: "var(--text-muted)" }}>Belum ada yang hadir</p>
                        ) : (
                          <div className="list-container">
                            {attendeesList.map((att) => (
                              <div key={att.index} className="list-item">
                                <span style={{ fontFamily: "monospace", color: "var(--cream)" }}>
                                  {att.address.slice(0, 10)}...{att.address.slice(-8)}
                                </span>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  {att.rewarded && <span className="badge badge-success">💰 Poin</span>}
                                  {att.certified && <span className="badge badge-primary">🏆 Sertifikat</span>}
                                  {!att.rewarded && !att.certified && <span className="badge badge-warning">⏳ Pending</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Requests */}
                {adminSubTab === "requests" && (
                  <div className="neu-card">
                    <div className="neu-card-header">
                      <div className="neu-card-title">
                        <div className="neu-card-icon">📨</div>
                        <span>Pengajuan Menunggu</span>
                      </div>
                      <span className="neu-card-badge">{pendingRequests.length} Pending</span>
                    </div>
                    
                    {pendingRequests.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">✨</div>
                        <h3>Tidak Ada Pengajuan</h3>
                        <p>Semua pengajuan sudah diproses</p>
                      </div>
                    ) : (
                      <div className="list-container">
                        {pendingRequests.map((req) => (
                          <div key={req.id} className="list-item" style={{ flexDirection: "column", alignItems: "stretch", gap: "1rem" }}>
                            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                              <div className="list-item-icon">📋</div>
                              <div className="list-item-text" style={{ flex: 1 }}>
                                <h4>{req.name}</h4>
                                <p>{req.description || "Tidak ada deskripsi"}</p>
                                <p style={{ fontSize: "0.7rem", marginTop: "0.25rem" }}>
                                  Dari: {req.student.slice(0, 6)}...{req.student.slice(-4)}
                                </p>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                              <button className="btn btn-success btn-sm" onClick={() => handleApproveRequest(req.id)} disabled={loading}>
                                ✅ Approve
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleRejectRequest(req.id)} disabled={loading}>
                                ❌ Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* All Certificates */}
                {adminSubTab === "allcerts" && (
                  <div className="neu-card">
                    <div className="neu-card-header">
                      <div className="neu-card-title">
                        <div className="neu-card-icon">📜</div>
                        <span>Semua Sertifikat</span>
                      </div>
                      <span className="neu-card-badge">{allCertificates.length} Total</span>
                    </div>
                    
                    {allCertificates.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">📜</div>
                        <h3>Belum Ada Sertifikat</h3>
                        <p>Belum ada sertifikat yang diterbitkan</p>
                      </div>
                    ) : (
                      <div className="cert-grid">
                        {allCertificates.map((cert) => (
                          <div key={cert.tokenId} className="cert-card">
                            <div className="cert-card-header">
                              <div className="cert-card-icon">🏅</div>
                              <div>
                                <div className="cert-card-title">Token #{cert.tokenId.toString()}</div>
                                <div className="cert-card-id">{cert.owner.slice(0, 6)}...{cert.owner.slice(-4)}</div>
                              </div>
                            </div>
                            <div className="cert-card-uri">{cert.tokenURI}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
