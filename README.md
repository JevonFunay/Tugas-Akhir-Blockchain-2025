# 🎓 CampusChain

Sistem manajemen poin dan sertifikat digital mahasiswa berbasis blockchain dengan fitur kehadiran.

## 📌 Tentang Aplikasi

CampusChain memungkinkan universitas untuk:

- Mengelola **kegiatan kampus** dan absensi mahasiswa
- Memberikan **poin** (CampusPoint) kepada mahasiswa yang hadir
- Menerbitkan **sertifikat digital** (NFT) yang dapat diverifikasi on-chain
- Mahasiswa dapat **mengajukan sertifikat eksternal** untuk divalidasi admin

## ✨ Fitur Utama

### Mahasiswa

- Melihat saldo poin dan sertifikat
- Menandai kehadiran di kegiatan aktif
- Mengajukan sertifikat dari kegiatan eksternal
- Melihat detail sertifikat via IPFS

### Admin

- Membuat dan mengelola kegiatan
- Melihat daftar hadir per kegiatan
- Mengakhiri kegiatan
- Memberikan poin dari daftar mahasiswa hadir
- Menerbitkan sertifikat dengan validasi duplikat
- Menyetujui/menolak pengajuan sertifikat eksternal

## 🛠️ Tech Stack

- **Blockchain**: Ganache (Local)
- **Smart Contract**: Solidity
- **Frontend**: Next.js + React
- **Web3**: ethers.js
- **Wallet**: MetaMask
- **Storage**: IPFS (Local)

## 🚀 Cara Menjalankan

1. Jalankan **Ganache Desktop**
2. Jalankan **IPFS Desktop** (port 8080)
3. Deploy smart contract via **Remix IDE**:
   - CampusPointBARU.sol
   - ActivityCertificateBARU.sol
   - ActivityManagerBARU.sol
4. Set minter roles di CampusPoint & ActivityCertificate
5. Update alamat contract di `web3app/src/lib/config.js`
6. Jalankan frontend:
   ```bash
   cd web3app
   npm install
   npm run dev
   ```
7. Buka http://localhost:3000

## 👥 Role

| Role          | Akses                                                        |
| ------------- | ------------------------------------------------------------ |
| **Admin**     | Kelola kegiatan, lihat kehadiran, beri poin, mint sertifikat |
| **Mahasiswa** | Absen kegiatan, lihat poin & sertifikat, ajukan sertifikat   |

---

Tugas Akhir Blockchain - UKDW 2025
