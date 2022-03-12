import * as anchor from '@project-serum/anchor';
const { PublicKey } = anchor.web3;

export const auction_name = "auction_01";


export const bumps = {
  stateAccount: 252,
  poolUsdc: 254,
  poolBtc: 254,
  poolLpsol: 250,
  poolLpusd: 255
}
export const stateAccount = new PublicKey("DXkKu4JNp3QoPPrPWhQk9fXCDVwYjn3bJEfnHRJoJrC7");
export const poolUsdc = new PublicKey("73xGUk2R7cooqVqHdNsvEhmEdUxvmRAvtnoVrfV78Cvj");
export const poolBtc = new PublicKey("6UPvPTsnYSNTHp1nuTESQPrQfhnpoe5gFHXxbj9daiMU");
export const poolLpsol = new PublicKey("FpzXqnXjuUrYRhmGB27BMLxpRWHsE6e26J62EaDUvfmr");
export const poolLpusd = new PublicKey("DCaRFdbkfHHCvMK2mv7o3ZFcTH1m9Nb9q89oKacghzqG");


// 2022-03-11 env
// ProgramID 6KS4ho2CDvr7MGofHU6F6WJfQ5j6DL8nhBWJtkhMTzqt

// State-Account: DXkKu4JNp3QoPPrPWhQk9fXCDVwYjn3bJEfnHRJoJrC7
// Pool-USDC: 73xGUk2R7cooqVqHdNsvEhmEdUxvmRAvtnoVrfV78Cvj
// Pool-BTC: 6UPvPTsnYSNTHp1nuTESQPrQfhnpoe5gFHXxbj9daiMU
// Pool-LpSOL: FpzXqnXjuUrYRhmGB27BMLxpRWHsE6e26J62EaDUvfmr
// Pool-LpUSD: DCaRFdbkfHHCvMK2mv7o3ZFcTH1m9Nb9q89oKacghzqG
// Bumps {
//   stateAccount: 252,
//   poolUsdc: 254,
//   poolBtc: 254,
//   poolLpsol: 250,
//   poolLpusd: 255
// }