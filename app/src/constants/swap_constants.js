import * as anchor from '@project-serum/anchor';
const { PublicKey } = anchor.web3;

export const swap_name = "swap_pool0";


export const bumps = {
  stateAccount: 251,
  poolUsdc: 254,
  poolBtc: 253,
  poolLpsol: 252,
  poolLpusd: 254
}
export const stateAccount = new PublicKey("2dNt95SBZVy1NDHK1taNuqS6QPC8Q17azdNksoMpjqGP");
export const poolUsdc = new PublicKey("54SKmgC5bVR7vSs4aXGBjaYdaAQivkb1Ke7LrepyjuGA");
export const poolBtc = new PublicKey("824SKRajm8sbPGCShytEGF3QfPwsdxqpj4q2LNCVQ1wV");
export const poolLpsol = new PublicKey("FxNARhJfYXUfjMWQV5LqBT1UTzDfayzFu1QnawgchSjo");
export const poolLpusd = new PublicKey("Hbh59XfzD17XXp9mijzmQVi1xxwpvKVPyFJxFFJF3TSK");


// 2022-03-10 env
// ProgramID 9jBjsXqKo6W54Hf65wrgR9k9AVYuCfDQQNUfygFtjWPJ

// State-Account: 2dNt95SBZVy1NDHK1taNuqS6QPC8Q17azdNksoMpjqGP
// Pool-USDC: 54SKmgC5bVR7vSs4aXGBjaYdaAQivkb1Ke7LrepyjuGA
// Pool-BTC: 824SKRajm8sbPGCShytEGF3QfPwsdxqpj4q2LNCVQ1wV
// Pool-LpSOL: FxNARhJfYXUfjMWQV5LqBT1UTzDfayzFu1QnawgchSjo
// Pool-LpUSD: Hbh59XfzD17XXp9mijzmQVi1xxwpvKVPyFJxFFJF3TSK
// Bumps {
//   stateAccount: 251,
//   poolUsdc: 254,
//   poolBtc: 253,
//   poolLpsol: 252,
//   poolLpusd: 254
// }