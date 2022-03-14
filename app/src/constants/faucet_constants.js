import * as anchor from '@project-serum/anchor';
const { PublicKey } = anchor.web3;

export const faucet_name = "faucet_000";

export const bumps = {
    stateAccount: 254, poolTusdc: 254, poolTbtc: 254
}
export const stateAccount = new PublicKey("ob9WHKk3a3cnrTo2SojP6wH5piBXRDKjEJaDFaRn7Dd");
export const poolUsdc = new PublicKey("67tFAd5JrHT8vrMZofcrwaReabsNdRW2RyDmGnpXGv2j");
export const poolBtc = new PublicKey("DcGNuUFPEqhGfGFVrttVKr5iMfy9oZpx99fHkTroHR5R");
