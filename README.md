# 🎓 CampusChain

Sistem manajemen poin dan sertifikat digital mahasiswa berbasis blockchain.

## 📌 Tentang Aplikasi

CampusChain memungkinkan universitas untuk:

- Memberikan **poin** (CampusPoint) kepada mahasiswa yang mengikuti kegiatan
- Menerbitkan **sertifikat digital** (NFT) yang dapat diverifikasi on-chain

## 🛠️ Tech Stack

- **Blockchain**: Ganache (Local)
- **Smart Contract**: Solidity
- **Frontend**: Next.js + React
- **Web3**: ethers.js
- **Wallet**: MetaMask

## 🚀 Cara Menjalankan

1. Jalankan **Ganache Desktop**
2. Deploy smart contract via **Remix IDE**
3. Jalankan frontend:
   ```bash
   cd web3app
   npm install
   npm run dev
   ```
4. Buka http://localhost:3000

## 👥 Role

| Role          | Akses                                     |
| ------------- | ----------------------------------------- |
| **Admin**     | Buat kegiatan, beri poin, mint sertifikat |
| **Mahasiswa** | Lihat saldo poin & sertifikat             |

---

Tugas Akhir Blockchain - UKDW 2025
