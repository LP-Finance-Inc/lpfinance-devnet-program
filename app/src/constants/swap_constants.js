import * as anchor from '@project-serum/anchor';
const { PublicKey } = anchor.web3;

export const swap_name = "swap_pool1";


export const bumps = {
  stateAccount: 251,
  poolUsdc: 253,
  poolBtc: 255,
  poolLpsol: 254,
  poolLpusd: 255,
  poolMsol: 254
}
export const stateAccount = new PublicKey("73v4gK2y12KJLZhAnGZ8ApQXGsgJ3LAydiGy25UickrR");
export const poolUsdc = new PublicKey("7R7ybuCqx5ibNmQJdS3ej6jF1ceoqzFPNurWEYTB64y8");
export const poolBtc = new PublicKey("3g8X4CBf9XfqC5bqhy5ojfHV4YPni4i2ezr8GYfcPE8y");
export const poolLpsol = new PublicKey("5aC57PB7zD2myUWCmbisAik3AyNQf1vwdi4vsv5S6kRc");
export const poolLpusd = new PublicKey("5sePY3AuQ1LtSH9UDimn4yDCUUsGoV8gQqKjyQSGvTFA");
export const poolMsol = new PublicKey("F9RN5CfyP9TfXVMW1ekM2SPguDWWDJLqG632SNa8y4Br");

// 2022-03-15 devnet

// ProgramID 9jBjsXqKo6W54Hf65wrgR9k9AVYuCfDQQNUfygFtjWPJ
// State-Account: 73v4gK2y12KJLZhAnGZ8ApQXGsgJ3LAydiGy25UickrR
// Pool-USDC: 7R7ybuCqx5ibNmQJdS3ej6jF1ceoqzFPNurWEYTB64y8
// Pool-BTC: 3g8X4CBf9XfqC5bqhy5ojfHV4YPni4i2ezr8GYfcPE8y
// Pool-LpSOL: 5aC57PB7zD2myUWCmbisAik3AyNQf1vwdi4vsv5S6kRc
// Pool-MSOL: F9RN5CfyP9TfXVMW1ekM2SPguDWWDJLqG632SNa8y4Br
// Pool-LpUSD: 5sePY3AuQ1LtSH9UDimn4yDCUUsGoV8gQqKjyQSGvTFA
// Bumps {
//   stateAccount: 251,
//   poolUsdc: 253,
//   poolBtc: 255,
//   poolLpsol: 254,
//   poolLpusd: 255,
//   poolMsol: 254
// }

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