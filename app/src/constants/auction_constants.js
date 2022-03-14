import * as anchor from '@project-serum/anchor';
const { PublicKey } = anchor.web3;

export const auction_name = "auction_02";


export const bumps = {
  stateAccount: 255,
  poolUsdc: 255,
  poolBtc: 255,
  poolLpsol: 255,
  poolLpusd: 255,
  poolMsol: 255
}
export const stateAccount = new PublicKey("4rU15gLvdV2SwfooxmTX13iRyE2ruCGyVn5p5QeZd5ks");
export const poolUsdc = new PublicKey("6sghnjhcQgw64uehscJtDPhsTdrQm7ty7ed2h6WhhyrC");
export const poolBtc = new PublicKey("DHzVDgbogJvs3L8UPFHxcYhL8LdmWBj8PcbUeph7J2CZ");
export const poolLpsol = new PublicKey("9qhUKBqqdvyeGmj7rPatdgyphgWFM7WY6n3r1R12Eu4b");
export const poolLpusd = new PublicKey("2XCUWyG6Bw5jMtYScSkpTFbhwRD8Y4MSiDLiekuUrW3o");
export const poolMsol = new PublicKey("9GwzM5FnVa7DHyqFYSeZzM39jN8TA21d5VskarV17cHU");


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