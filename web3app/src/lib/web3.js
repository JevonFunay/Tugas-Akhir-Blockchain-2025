import { ethers } from "ethers";
import { CONTRACTS, NETWORK } from "./config";
import CampusPointABI from "../contracts/CampusPoint.json";
import ActivityCertificateABI from "../contracts/ActivityCertificate.json";
import ActivityManagerABI from "../contracts/ActivityManager.json";

// Get provider from MetaMask
export const getProvider = () => {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
};

// Get signer for transactions
export const getSigner = async () => {
  const provider = getProvider();
  if (provider) {
    return await provider.getSigner();
  }
  return null;
};

// Connect wallet
export const connectWallet = async () => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask tidak terinstall!");
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    // Check network
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId !== NETWORK.chainIdHex) {
      // Try to switch network
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: NETWORK.chainIdHex }]
        });
      } catch (switchError) {
        // Network not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: NETWORK.chainIdHex,
              chainName: NETWORK.name,
              rpcUrls: [NETWORK.rpcUrl],
              nativeCurrency: {
                name: "Ether",
                symbol: NETWORK.currency,
                decimals: 18
              }
            }]
          });
        } else {
          throw switchError;
        }
      }
    }

    return accounts[0];
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
};

// Get contract instances
export const getContracts = async () => {
  const signer = await getSigner();
  if (!signer) return null;

  return {
    campusPoint: new ethers.Contract(
      CONTRACTS.CAMPUS_POINT,
      CampusPointABI.abi,
      signer
    ),
    activityCertificate: new ethers.Contract(
      CONTRACTS.ACTIVITY_CERTIFICATE,
      ActivityCertificateABI.abi,
      signer
    ),
    activityManager: new ethers.Contract(
      CONTRACTS.ACTIVITY_MANAGER,
      ActivityManagerABI.abi,
      signer
    )
  };
};

// Get CampusPoint balance
export const getTokenBalance = async (address) => {
  const contracts = await getContracts();
  if (!contracts) return "0";
  
  const balance = await contracts.campusPoint.balanceOf(address);
  return balance.toString();
};

// Get NFT count
export const getNFTBalance = async (address) => {
  const contracts = await getContracts();
  if (!contracts) return "0";
  
  const balance = await contracts.activityCertificate.balanceOf(address);
  return balance.toString();
};

// Get NFT details by tokenId (silent mode - no console errors)
export const getNFTDetails = async (tokenId) => {
  const contracts = await getContracts();
  if (!contracts) return null;
  
  try {
    const owner = await contracts.activityCertificate.ownerOf(tokenId);
    const tokenURI = await contracts.activityCertificate.tokenURI(tokenId);
    return { tokenId, owner, tokenURI };
  } catch (error) {
    // Token doesn't exist - return null silently
    return null;
  }
};

// Get activity details
export const getActivity = async (activityId) => {
  const contracts = await getContracts();
  if (!contracts) return null;
  
  try {
    const activity = await contracts.activityManager.getActivity(activityId);
    return {
      id: activity[0].toString(),
      name: activity[1],
      pointReward: activity[2].toString(),
      isActive: activity[3]
    };
  } catch (error) {
    console.error("Error getting activity:", error);
    return null;
  }
};

// Admin: Create activity
export const createActivity = async (name, pointReward) => {
  const contracts = await getContracts();
  if (!contracts) throw new Error("Wallet not connected");
  
  const tx = await contracts.activityManager.createActivity(name, pointReward);
  await tx.wait();
  return tx;
};

// Admin: Reward student
export const rewardStudent = async (activityId, studentAddress) => {
  const contracts = await getContracts();
  if (!contracts) throw new Error("Wallet not connected");
  
  const tx = await contracts.activityManager.rewardStudent(activityId, studentAddress);
  await tx.wait();
  return tx;
};

// Admin: Mint certificate
export const mintCertificate = async (activityId, studentAddress, tokenURI) => {
  const contracts = await getContracts();
  if (!contracts) throw new Error("Wallet not connected");
  
  const tx = await contracts.activityManager.mintCertificate(activityId, studentAddress, tokenURI);
  await tx.wait();
  return tx;
};

// Check if address is contract owner
export const isContractOwner = async (address) => {
  const contracts = await getContracts();
  if (!contracts) return false;
  
  const owner = await contracts.activityManager.owner();
  return owner.toLowerCase() === address.toLowerCase();
};
