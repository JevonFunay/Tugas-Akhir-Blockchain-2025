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
  rewardStudent,
  mintCertificate,
  isContractOwner,
  getContracts
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

      // Load activities
      await loadActivities();

      // Load certificates for user
      await loadCertificates(addr, parseInt(nftCount));

      // Load all certificates if admin
      if (ownerStatus) {
        await loadAllCertificates();
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
    // Only scan if user has NFTs
    if (nftCount === 0) {
      setCertificates([]);
      return;
    }
    
    const certs = [];
    let consecutiveErrors = 0;
    
    // Scan token IDs to find certificates owned by user
    for (let i = 1; i <= 100 && consecutiveErrors < 3; i++) {
      try {
        const details = await getNFTDetails(i);
        if (details && details.owner) {
          consecutiveErrors = 0; // Reset error counter
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
      await rewardStudent(parseInt(rewardForm.activityId), rewardForm.studentAddress);
      setMessage({ type: "success", text: "Poin berhasil diberikan!" });
      setRewardForm({ activityId: "", studentAddress: "" });
      if (account) await loadData(account);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Handle mint certificate
  const handleMintCertificate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await mintCertificate(parseInt(certForm.activityId), certForm.studentAddress, certForm.tokenURI);
      setMessage({ type: "success", text: "Sertifikat berhasil diterbitkan!" });
      setCertForm({ activityId: "", studentAddress: "", tokenURI: "" });
      if (account) await loadData(account);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
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

  // Auto-connect if already connected
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          loadData(accounts[0]);
        }
      });

      // Listen for account changes
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

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🎓</span>
          <span>CampusChain</span>
        </div>
        
        {account ? (
          <button className="wallet-btn connected">
            <span>🟢</span>
            <span className="wallet-address">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          </button>
        ) : (
          <button className="wallet-btn connect" onClick={handleConnect} disabled={loading}>
            {loading ? <span className="spinner"></span> : "🦊"} Connect Wallet
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="main">
        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.type === "success" ? "✅" : "❌"} {message.text}
          </div>
        )}

        {!account ? (
          <div className="empty-state">
            <div className="empty-icon">🦊</div>
            <h2>Selamat Datang di CampusChain</h2>
            <p>Hubungkan wallet MetaMask untuk mulai</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="tabs">
              <button 
                className={`tab ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
              >
                📊 Dashboard
              </button>
              {!isOwner && (
                <button 
                  className={`tab ${activeTab === "certificates" ? "active" : ""}`}
                  onClick={() => setActiveTab("certificates")}
                >
                  🏆 Sertifikat
                </button>
              )}
              <button 
                className={`tab ${activeTab === "activities" ? "active" : ""}`}
                onClick={() => setActiveTab("activities")}
              >
                📋 Kegiatan
              </button>
              {isOwner && (
                <button 
                  className={`tab ${activeTab === "admin" ? "active" : ""}`}
                  onClick={() => setActiveTab("admin")}
                >
                  ⚙️ Admin
                </button>
              )}
            </div>

            {/* Dashboard Tab */}
            {activeTab === "dashboard" && (
              <>
                <h1 className="page-title">📊 Dashboard</h1>
                <div className="dashboard-grid">
                  <div className="card stat-card highlight">
                    <div className="card-header">
                      <span className="card-icon">💰</span>
                      <span className="card-title">Saldo CampusPoint</span>
                    </div>
                    <div className="card-value">{tokenBalance} CPNT</div>
                  </div>

                  <div className="card stat-card">
                    <div className="card-header">
                      <span className="card-icon">🏆</span>
                      <span className="card-title">Jumlah Sertifikat</span>
                    </div>
                    <div className="card-value">{nftBalance}</div>
                  </div>

                  <div className="card stat-card">
                    <div className="card-header">
                      <span className="card-icon">📋</span>
                      <span className="card-title">Kegiatan Tersedia</span>
                    </div>
                    <div className="card-value">{activities.length}</div>
                  </div>
                </div>

                {isOwner && (
                  <div className="alert alert-warning">
                    ⚠️ Anda login sebagai <strong>Admin/Owner</strong>. Akses panel admin tersedia.
                  </div>
                )}
              </>
            )}

            {/* Certificates Tab */}
            {activeTab === "certificates" && (
              <>
                <h1 className="page-title">🏆 Sertifikat Saya</h1>
                
                {/* Check Certificate */}
                <div className="section">
                  <h2 className="section-title">🔍 Cek Sertifikat</h2>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Masukkan Token ID"
                      value={checkTokenId}
                      onChange={(e) => setCheckTokenId(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary" onClick={handleCheckCertificate} disabled={loading} style={{ width: "auto" }}>
                      Cek
                    </button>
                  </div>
                </div>

                {/* Certificate List */}
                <div className="section">
                  <h2 className="section-title">📜 Daftar Sertifikat</h2>
                  {certificates.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📜</div>
                      <p>Belum ada sertifikat</p>
                    </div>
                  ) : (
                    <div className="certificate-list">
                      {certificates.map((cert) => (
                        <div key={cert.tokenId} className="certificate-item">
                          <div className="certificate-icon">🏅</div>
                          <div className="certificate-info">
                            <div className="certificate-id">Token #{cert.tokenId.toString()}</div>
                            <div className="certificate-uri">{cert.tokenURI}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Activities Tab */}
            {activeTab === "activities" && (
              <>
                <h1 className="page-title">📋 Daftar Kegiatan</h1>
                <div className="section">
                  {activities.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📋</div>
                      <p>Belum ada kegiatan terdaftar</p>
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="activity-item">
                        <div>
                          <div className="activity-name">{activity.name}</div>
                          <small style={{ color: "var(--text-muted)" }}>ID: {activity.id}</small>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <span className={`status-badge ${activity.isActive ? "active" : "inactive"}`}>
                            {activity.isActive ? "✓ Aktif" : "✗ Nonaktif"}
                          </span>
                          <span className="activity-points">{activity.pointReward} Poin</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Admin Tab */}
            {activeTab === "admin" && isOwner && (
              <>
                <h1 className="page-title">⚙️ Panel Admin</h1>
                <div className="admin-grid">
                  {/* Create Activity */}
                  <div className="section">
                    <h2 className="section-title">➕ Buat Kegiatan</h2>
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
                        <label className="form-label">Jumlah Poin</label>
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

                  {/* Reward Student */}
                  <div className="section">
                    <h2 className="section-title">🎁 Beri Poin Mahasiswa</h2>
                    <form onSubmit={handleRewardStudent}>
                      <div className="form-group">
                        <label className="form-label">ID Kegiatan</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Contoh: 1"
                          value={rewardForm.activityId}
                          onChange={(e) => setRewardForm({ ...rewardForm, activityId: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Alamat Wallet Mahasiswa</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="0x..."
                          value={rewardForm.studentAddress}
                          onChange={(e) => setRewardForm({ ...rewardForm, studentAddress: e.target.value })}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <span className="spinner"></span> : "Beri Poin"}
                      </button>
                    </form>
                  </div>

                  {/* Mint Certificate */}
                  <div className="section">
                    <h2 className="section-title">🏆 Terbitkan Sertifikat</h2>
                    <form onSubmit={handleMintCertificate}>
                      <div className="form-group">
                        <label className="form-label">ID Kegiatan</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Contoh: 1"
                          value={certForm.activityId}
                          onChange={(e) => setCertForm({ ...certForm, activityId: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Alamat Wallet Mahasiswa</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="0x..."
                          value={certForm.studentAddress}
                          onChange={(e) => setCertForm({ ...certForm, studentAddress: e.target.value })}
                          required
                        />
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
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <span className="spinner"></span> : "Terbitkan Sertifikat"}
                      </button>
                    </form>
                  </div>
                </div>

                {/* All Certificates Section */}
                <div className="section" style={{ marginTop: "2rem" }}>
                  <h2 className="section-title">📜 Semua Sertifikat Terbit</h2>
                  {allCertificates.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📜</div>
                      <p>Belum ada sertifikat yang diterbitkan</p>
                    </div>
                  ) : (
                    <div className="certificate-list">
                      {allCertificates.map((cert) => (
                        <div key={cert.tokenId} className="certificate-item">
                          <div className="certificate-icon">🏅</div>
                          <div className="certificate-info" style={{ flex: 1 }}>
                            <div className="certificate-id">Token #{cert.tokenId.toString()}</div>
                            <div className="certificate-uri">{cert.tokenURI}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Pemilik:</div>
                            <div style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                              {cert.owner.slice(0, 6)}...{cert.owner.slice(-4)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
