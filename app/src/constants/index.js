import * as anchor from '@project-serum/anchor';
const { PublicKey } = anchor.web3;

export const NETWORK = 'https://api.devnet.solana.com';
export const cbs_name = "cbs_pool03";

// 2022-03-01 devnet
// ProgramID 3YhaNLN3oYUaAXjK9yRqVVNUYhqPsVqB5q9GEJ1vWcTM
// State-Account: 6ZitbU1D6EZBYqKHq74zCkzoZBvGDGdgzKH1oUh5RM8j
// Pool-USDC: GpzZjubiozLk9K6obfm1dcnKQSqqZGn69dooX2Q1C3Uk
// Pool-BTC: 2tDLPfwz7KCtzSBvUZcsuwmDSZBvy7nT7JEYfQTWApzn
// Pool-LpSOL: 8sB3gqYZ13J4hTmhQ6P5XRcHvoviwymU8Ru9dE2MUrcB
// Pool-LpUSD: GXHTqCiQuFc6k5UT8Rc4aS1gVTr45sTP1NjhQMMtSK82
// LpSOL-Mint: FCSUDXzfqc393wVcv4tWBU4LgRhJeDi8YA6BGTs3qVPP
// LpUSD-Mint: AL9fyDTSmJavYxjftxBHxkLtwv9FcsUJfVvEheW6vfdq
// Bumps {
//   stateAccount: 254,
//   lpusdMint: 255,
//   lpsolMint: 254,
//   poolUsdc: 252,
//   poolBtc: 254,
//   poolLpsol: 255,
//   poolLpusd: 253
// }

export const bumps = {
    stateAccount: 254,
    lpusdMint: 255,
    lpsolMint: 254,
    poolUsdc: 252,
    poolBtc: 254,
    poolLpsol: 255,
    poolLpusd: 253
}
export const stateAccount = new PublicKey("6ZitbU1D6EZBYqKHq74zCkzoZBvGDGdgzKH1oUh5RM8j");
export const poolUsdc = new PublicKey("GpzZjubiozLk9K6obfm1dcnKQSqqZGn69dooX2Q1C3Uk");
export const poolBtc = new PublicKey("2tDLPfwz7KCtzSBvUZcsuwmDSZBvy7nT7JEYfQTWApzn");
export const poolLpsol = new PublicKey("8sB3gqYZ13J4hTmhQ6P5XRcHvoviwymU8Ru9dE2MUrcB");
export const poolLpusd = new PublicKey("GXHTqCiQuFc6k5UT8Rc4aS1gVTr45sTP1NjhQMMtSK82");
export const lpsolMint = new PublicKey("FCSUDXzfqc393wVcv4tWBU4LgRhJeDi8YA6BGTs3qVPP");
export const lpusdMint = new PublicKey("AL9fyDTSmJavYxjftxBHxkLtwv9FcsUJfVvEheW6vfdq");
export const usdcMint = new PublicKey("2Q1WAAgnpEox5Y4b6Y8YyXVwFNhDdGot467XfvdBJaPf");
export const btcMint = new PublicKey("Hv96pk4HkhGcbNxkBvb7evTU88KzedvgVy2oddBB1ySB");

// ======> PYTH
export const pythBtcAccount = new PublicKey("HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"); // 3m1y5h2uv7EQL3KaJZehvAJa4yDNvgc5yAdL9KPMKwvk
export const pythUsdcAccount = new PublicKey("5SSkXsEKQepHHAewytPVwdej4epN1nxgLVM84L4KXgy7"); // 6NpdXrQEpmDZ3jZKmM2rhdmkd3H6QAk23j2x8bkXcHKA
export const pythSolAccount = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"); // 3Mnn2fX6rQyUsyELYms1sBJyChWofzSNRoqYzvgMVz5E
// ======> PYTH
