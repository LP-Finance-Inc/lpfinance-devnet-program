import * as anchor from '@project-serum/anchor';
const { PublicKey } = anchor.web3;

export const cbs_name = "cbs_pool03";

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

