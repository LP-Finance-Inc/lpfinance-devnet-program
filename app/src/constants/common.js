import * as anchor from '@project-serum/anchor';
const { PublicKey } = anchor.web3;

// NETWORK
export const NETWORK = 'https://api.devnet.solana.com';

// TOken mints
export const lpsolMint = new PublicKey("FCSUDXzfqc393wVcv4tWBU4LgRhJeDi8YA6BGTs3qVPP");
export const lpusdMint = new PublicKey("AL9fyDTSmJavYxjftxBHxkLtwv9FcsUJfVvEheW6vfdq");
export const usdcMint = new PublicKey("2Q1WAAgnpEox5Y4b6Y8YyXVwFNhDdGot467XfvdBJaPf");
export const btcMint = new PublicKey("Hv96pk4HkhGcbNxkBvb7evTU88KzedvgVy2oddBB1ySB");

// ======> PYTH
export const pythBtcAccount = new PublicKey("HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"); // 3m1y5h2uv7EQL3KaJZehvAJa4yDNvgc5yAdL9KPMKwvk
export const pythUsdcAccount = new PublicKey("5SSkXsEKQepHHAewytPVwdej4epN1nxgLVM84L4KXgy7"); // 6NpdXrQEpmDZ3jZKmM2rhdmkd3H6QAk23j2x8bkXcHKA
export const pythSolAccount = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"); // 3Mnn2fX6rQyUsyELYms1sBJyChWofzSNRoqYzvgMVz5E
// ======> PYTH
