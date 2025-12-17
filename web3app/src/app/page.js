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
      setRewardForm({ activityId: "", studentAddress: "" });
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
      setCertForm({ activityId: "", studentAddress: "", tokenURI: "" });
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
          loadData(accounts[0]);
        } else {
          setAccount(null);
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
    ...(!isOwner ? [{ id: "certificates", icon: "🏆", label: "Sertifikat Saya" }] : []),
    ...(isOwner ? [
      { id: "admin-activity", icon: "➕", label: "Kelola Kegiatan" },
      { id: "admin-reward", icon: "🎁", label: "Beri Reward" },
      { id: "admin-attendance", icon: "📝", label: "Kelola Kehadiran" },
      { id: "admin-requests", icon: "📨", label: "Pengajuan" },
      { id: "admin-certs", icon: "📜", label: "Semua Sertifikat" },
    ] : []),
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">🎓</div>
            <div className="logo-text">Campus<span>Chain</span></div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Menu Utama</div>
            {navItems.slice(0, 3).map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? "active" : ""}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>

          {isOwner && (
            <div className="nav-section">
              <div className="nav-section-title">Admin Panel</div>
              {navItems.slice(3).map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? "active" : ""}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="wallet-section">
            {account ? (
              <>
                <div className="wallet-status">
                  <span className="status-dot"></span>
                  <span>Connected</span>
                </div>
                <div className="wallet-address">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              </>
            ) : (
              <button className="connect-btn" onClick={handleConnect} disabled={loading}>
                {loading ? <span className="spinner"></span> : "🦊"} Connect Wallet
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Alert Messages */}
        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.type === "success" ? "✅" : "❌"} {message.text}
          </div>
        )}

        {/* Welcome Screen (Not Connected) */}
        {!account ? (
          <div className="welcome-screen">
            <div className="welcome-illustration">🎓</div>
            <h1 className="welcome-title">Selamat Datang di CampusChain</h1>
            <p className="welcome-subtitle">
              Platform manajemen sertifikat dan reward berbasis blockchain untuk kampus.
              Hubungkan wallet MetaMask untuk memulai.
            </p>
            <button className="btn btn-primary" style={{ maxWidth: 300 }} onClick={handleConnect} disabled={loading}>
              {loading ? <span className="spinner"></span> : "🦊"} Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Dashboard */}
            {activeTab === "dashboard" && (
              <>
                <div className="header">
                  <h1 className="page-title">
                    <span className="page-title-icon">📊</span>
                    Dashboard
                  </h1>
                </div>

                <div className="bento-grid">
                  {/* Stats Cards */}
                  <div className="bento-card bento-sm stat-card highlight">
                    <div className="stat-header">
                      <div className="stat-icon">💰</div>
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{tokenBalance}</div>
                      <div className="stat-label">Campus Points</div>
                    </div>
                  </div>

                  <div className="bento-card bento-sm stat-card">
                    <div className="stat-header">
                      <div className="stat-icon">🏆</div>
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{nftBalance}</div>
                      <div className="stat-label">Sertifikat</div>
                    </div>
                  </div>

                  <div className="bento-card bento-sm stat-card">
                    <div className="stat-header">
                      <div className="stat-icon">📋</div>
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{activities.length}</div>
                      <div className="stat-label">Kegiatan</div>
                    </div>
                  </div>

                  <div className="bento-card bento-sm stat-card">
                    <div className="stat-header">
                      <div className="stat-icon">{isOwner ? "👑" : "👤"}</div>
                    </div>
                    <div className="stat-content">
                      <div className="stat-value" style={{ fontSize: "1.5rem" }}>{isOwner ? "Admin" : "Student"}</div>
                      <div className="stat-label">Role Anda</div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bento-card bento-md">
                    <h3 style={{ marginBottom: "1rem", color: "var(--cream)" }}>⚡ Quick Actions</h3>
                    <div className="quick-actions">
                      <button className="quick-action-btn" onClick={() => setActiveTab("activities")}>
                        <span className="quick-action-icon">📋</span>
                        <span className="quick-action-label">Lihat Kegiatan</span>
                      </button>
                      {!isOwner && (
                        <button className="quick-action-btn" onClick={() => setActiveTab("certificates")}>
                          <span className="quick-action-icon">🏆</span>
                          <span className="quick-action-label">Sertifikat Saya</span>
                        </button>
                      )}
                      {isOwner && (
                        <>
                          <button className="quick-action-btn" onClick={() => setActiveTab("admin-activity")}>
                            <span className="quick-action-icon">➕</span>
                            <span className="quick-action-label">Buat Kegiatan</span>
                          </button>
                          <button className="quick-action-btn" onClick={() => setActiveTab("admin-requests")}>
                            <span className="quick-action-icon">📨</span>
                            <span className="quick-action-label">Pengajuan ({pendingRequests.length})</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Recent Activities */}
                  <div className="bento-card bento-md">
                    <h3 style={{ marginBottom: "1rem", color: "var(--cream)" }}>📋 Kegiatan Terbaru</h3>
                    {activities.length === 0 ? (
                      <p style={{ color: "var(--text-muted)" }}>Belum ada kegiatan</p>
                    ) : (
                      <div className="list-container">
                        {activities.slice(0, 3).map((act) => (
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
                </div>
              </>
            )}

            {/* Activities */}
            {activeTab === "activities" && (
              <>
                <div className="header">
                  <h1 className="page-title">
                    <span className="page-title-icon">📋</span>
                    Daftar Kegiatan
                  </h1>
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
                              style={{ width: "auto" }}
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
                <div className="header">
                  <h1 className="page-title">
                    <span className="page-title-icon">🏆</span>
                    Sertifikat Saya
                  </h1>
                </div>

                {/* Check Certificate */}
                <div className="form-section">
                  <h3 className="form-title">🔍 Cek Sertifikat</h3>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Masukkan Token ID"
                      value={checkTokenId}
                      onChange={(e) => setCheckTokenId(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button 
                      className="btn btn-primary" 
                      style={{ width: "auto" }}
                      onClick={handleCheckCertificate} 
                      disabled={loading}
                    >
                      Cek
                    </button>
                  </div>
                </div>

                {/* Certificate List */}
                <div className="form-section">
                  <h3 className="form-title">📜 Daftar Sertifikat</h3>
                  {certificates.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📜</div>
                      <h3>Belum Ada Sertifikat</h3>
                      <p>Anda belum memiliki sertifikat</p>
                    </div>
                  ) : (
                    <div className="certificate-grid">
                      {certificates.map((cert) => (
                        <div key={cert.tokenId} className="certificate-card">
                          <div className="certificate-card-header">
                            <div className="certificate-card-icon">🏅</div>
                            <div>
                              <div className="certificate-card-title">Token #{cert.tokenId.toString()}</div>
                              <div className="certificate-card-id">NFT Certificate</div>
                            </div>
                          </div>
                          <div className="certificate-card-uri">{cert.tokenURI}</div>
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

                {/* Request External Certificate */}
                <div className="form-section">
                  <h3 className="form-title">📝 Ajukan Sertifikat Eksternal</h3>
                  <p style={{ color: "var(--text-muted)", marginBottom: "1rem", fontSize: "0.9rem" }}>
                    Ajukan sertifikat dari kegiatan di luar kampus untuk diverifikasi admin.
                  </p>
                  <form onSubmit={handleRequestCertificate}>
                    <div className="form-group">
                      <label className="form-label">Nama Sertifikat</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Contoh: Sertifikat Workshop AI"
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
                        placeholder="Contoh: Workshop AI di XYZ pada 1 Desember 2025"
                        value={requestForm.description}
                        onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Token URI (Link Bukti/Metadata)</label>
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
                      {loading ? <span className="spinner"></span> : "Ajukan Sertifikat"}
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* Admin: Create Activity */}
            {activeTab === "admin-activity" && isOwner && (
              <>
                <div className="header">
                  <h1 className="page-title">
                    <span className="page-title-icon">➕</span>
                    Kelola Kegiatan
                  </h1>
                </div>

                <div className="form-section">
                  <h3 className="form-title">📝 Buat Kegiatan Baru</h3>
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
              </>
            )}

            {/* Admin: Reward */}
            {activeTab === "admin-reward" && isOwner && (
              <>
                <div className="header">
                  <h1 className="page-title">
                    <span className="page-title-icon">🎁</span>
                    Beri Reward
                  </h1>
                </div>

                <div className="bento-grid">
                  {/* Reward Points */}
                  <div className="bento-card bento-md">
                    <h3 className="form-title">💰 Beri Poin Mahasiswa</h3>
                    <form onSubmit={handleRewardStudent}>
                      <div className="form-group">
                        <label className="form-label">Pilih Kegiatan (yang sudah berakhir)</label>
                        <select
                          className="form-input"
                          value={rewardForm.activityId}
                          onChange={async (e) => {
                            const val = e.target.value;
                            setRewardForm({ ...rewardForm, activityId: val, studentAddress: "" });
                            if (val && !isNaN(parseInt(val))) {
                              await loadAttendees(parseInt(val));
                            } else {
                              setAttendeesList([]);
                            }
                          }}
                          required
                        >
                          <option value="">-- Pilih Kegiatan --</option>
                          {activities.filter(a => a.isEnded).map((act) => (
                            <option key={act.id} value={act.id}>{act.name} (ID: {act.id})</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Pilih Mahasiswa Hadir</label>
                        <select
                          className="form-input"
                          value={rewardForm.studentAddress}
                          onChange={(e) => setRewardForm({ ...rewardForm, studentAddress: e.target.value })}
                          required
                          disabled={!rewardForm.activityId}
                        >
                          <option value="">-- Pilih Mahasiswa --</option>
                          {attendeesList.filter(a => !a.rewarded).map((att) => (
                            <option key={att.index} value={att.address}>
                              {att.address.slice(0,10)}...{att.address.slice(-8)}
                            </option>
                          ))}
                        </select>
                        {attendeesList.length > 0 && attendeesList.filter(a => !a.rewarded).length === 0 && (
                          <small style={{ color: "var(--success)" }}>✓ Semua sudah dapat poin</small>
                        )}
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={loading || !rewardForm.studentAddress}>
                        {loading ? <span className="spinner"></span> : "Beri Poin"}
                      </button>
                    </form>
                  </div>

                  {/* Mint Certificate */}
                  <div className="bento-card bento-md">
                    <h3 className="form-title">🏆 Terbitkan Sertifikat</h3>
                    <form onSubmit={handleMintCertificate}>
                      <div className="form-group">
                        <label className="form-label">Pilih Kegiatan (yang sudah berakhir)</label>
                        <select
                          className="form-input"
                          value={certForm.activityId}
                          onChange={async (e) => {
                            const val = e.target.value;
                            setCertForm({ ...certForm, activityId: val, studentAddress: "" });
                            if (val && !isNaN(parseInt(val))) {
                              await loadAttendees(parseInt(val));
                            } else {
                              setAttendeesList([]);
                            }
                          }}
                          required
                        >
                          <option value="">-- Pilih Kegiatan --</option>
                          {activities.filter(a => a.isEnded).map((act) => (
                            <option key={act.id} value={act.id}>{act.name} (ID: {act.id})</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Pilih Mahasiswa Hadir</label>
                        <select
                          className="form-input"
                          value={certForm.studentAddress}
                          onChange={(e) => setCertForm({ ...certForm, studentAddress: e.target.value })}
                          required
                          disabled={!certForm.activityId}
                        >
                          <option value="">-- Pilih Mahasiswa --</option>
                          {attendeesList.filter(a => !a.certified).map((att) => (
                            <option key={att.index} value={att.address}>
                              {att.address.slice(0,10)}...{att.address.slice(-8)}
                            </option>
                          ))}
                        </select>
                        {attendeesList.length > 0 && attendeesList.filter(a => !a.certified).length === 0 && (
                          <small style={{ color: "var(--success)" }}>✓ Semua sudah dapat sertifikat</small>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Token URI (Metadata)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="https://ipfs.io/ipfs/..."
                          value={certForm.tokenURI}
                          onChange={(e) => setCertForm({ ...certForm, tokenURI: e.target.value })}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={loading || !certForm.studentAddress}>
                        {loading ? <span className="spinner"></span> : "Terbitkan Sertifikat"}
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}

            {/* Admin: Attendance Management */}
            {activeTab === "admin-attendance" && isOwner && (
              <>
                <div className="header">
                  <h1 className="page-title">
                    <span className="page-title-icon">📝</span>
                    Kelola Kehadiran
                  </h1>
                </div>

                <div className="form-section">
                  <div className="form-group">
                    <label className="form-label">Pilih Kegiatan</label>
                    <select 
                      className="form-input"
                      value={selectedActivity?.id || ""}
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (val && !isNaN(parseInt(val))) {
                          const actId = parseInt(val);
                          const act = await getActivity(actId);
                          setSelectedActivity(act);
                          await loadAttendees(actId);
                        } else {
                          setSelectedActivity(null);
                          setAttendeesList([]);
                        }
                      }}
                    >
                      <option value="">-- Pilih Kegiatan --</option>
                      {activities.map((act) => (
                        <option key={act.id} value={act.id}>
                          {act.name} {act.isEnded ? "(Berakhir)" : act.isActive ? "(Aktif)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedActivity && (
                    <>
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
                            className="btn btn-sm" 
                            style={{ width: "auto", background: "var(--warning)", color: "#000" }}
                            onClick={() => handleEndActivity(parseInt(selectedActivity.id))}
                            disabled={loading}
                          >
                            🏁 Akhiri Kegiatan
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
                              <div style={{ fontFamily: "monospace", color: "var(--cream)" }}>
                                {att.address.slice(0, 10)}...{att.address.slice(-8)}
                              </div>
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
              </>
            )}

            {/* Admin: Pending Requests */}
            {activeTab === "admin-requests" && isOwner && (
              <>
                <div className="header">
                  <h1 className="page-title">
                    <span className="page-title-icon">📨</span>
                    Pengajuan Menunggu Approval
                  </h1>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">✨</div>
                    <h3>Tidak Ada Pengajuan</h3>
                    <p>Tidak ada pengajuan yang menunggu</p>
                  </div>
                ) : (
                  <div className="list-container">
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="list-item" style={{ flexDirection: "column", alignItems: "stretch", gap: "1rem" }}>
                        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                          <div className="list-item-icon">📋</div>
                          <div className="list-item-text" style={{ flex: 1 }}>
                            <h4>{req.name}</h4>
                            <p>{req.description}</p>
                            <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                              Dari: {req.student.slice(0, 6)}...{req.student.slice(-4)} | URI: {req.tokenURI}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button 
                            className="btn btn-success btn-sm"
                            style={{ width: "auto" }}
                            onClick={() => handleApproveRequest(req.id)}
                            disabled={loading}
                          >
                            ✅ Approve
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            style={{ width: "auto" }}
                            onClick={() => handleRejectRequest(req.id)}
                            disabled={loading}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Admin: All Certificates */}
            {activeTab === "admin-certs" && isOwner && (
              <>
                <div className="header">
                  <h1 className="page-title">
                    <span className="page-title-icon">📜</span>
                    Semua Sertifikat Terbit
                  </h1>
                </div>

                {allCertificates.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📜</div>
                    <h3>Belum Ada Sertifikat</h3>
                    <p>Belum ada sertifikat yang diterbitkan</p>
                  </div>
                ) : (
                  <div className="certificate-grid">
                    {allCertificates.map((cert) => (
                      <div key={cert.tokenId} className="certificate-card">
                        <div className="certificate-card-header">
                          <div className="certificate-card-icon">🏅</div>
                          <div>
                            <div className="certificate-card-title">Token #{cert.tokenId.toString()}</div>
                            <div className="certificate-card-id">
                              {cert.owner.slice(0, 6)}...{cert.owner.slice(-4)}
                            </div>
                          </div>
                        </div>
                        <div className="certificate-card-uri">{cert.tokenURI}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
