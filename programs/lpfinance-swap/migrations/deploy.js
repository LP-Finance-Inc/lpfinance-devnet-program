// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

const anchor = require("@project-serum/anchor");
const TOKEN = require("@solana/spl-token");
const { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, Token } = require('@solana/spl-token')
const { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair } = anchor.web3;

const idl = require("../target/idl/lpfinance_swap.json");
const programID = idl.metadata.address;

console.log("ProgramID", programID);
const swap_name = "swap_pool0";
const pool_usdc = "pool_usdc";
const pool_btc = "pool_btc";
const pool_lpsol = "pool_lpsol";
const pool_lpusd = "pool_lpusd";

// Test Token's MINT
const usdcMint = new PublicKey("2Q1WAAgnpEox5Y4b6Y8YyXVwFNhDdGot467XfvdBJaPf"); 
const btcMint = new PublicKey("Hv96pk4HkhGcbNxkBvb7evTU88KzedvgVy2oddBB1ySB");
const lpsolMint = new PublicKey("FCSUDXzfqc393wVcv4tWBU4LgRhJeDi8YA6BGTs3qVPP"); 
const lpusdMint = new PublicKey("AL9fyDTSmJavYxjftxBHxkLtwv9FcsUJfVvEheW6vfdq");

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  // Add your deploy script here
  const program = new anchor.Program(idl, programID);

  try {
    /* interact with the program via rpc */
    let bumps = {
      stateAccount: 0,
      poolUsdc: 0,
      poolBtc: 0,
      poolLpsol: 0,
      poolLpusd: 0
    };

    // Find PDA from `cbs protocol` for state account
    const [stateAccount, stateAccountBump] = await PublicKey.findProgramAddress(
      [Buffer.from(swap_name)],
      program.programId
    );
    bumps.stateAccount = stateAccountBump;
    console.log("State-Account:", stateAccount.toBase58());

    // Find PDA for `usdc pool`
    const [poolUsdc, poolUsdcBump] = await PublicKey.findProgramAddress(
      [Buffer.from(swap_name), Buffer.from(pool_usdc)],
      program.programId
    );
    bumps.poolUsdc = poolUsdcBump;
    console.log("Pool-USDC:", poolUsdc.toBase58());

    // Find PDA for `btc pool`
    const [poolBtc, poolBtcBump] = await PublicKey.findProgramAddress(
      [Buffer.from(swap_name), Buffer.from(pool_btc)],
      program.programId
    );
    bumps.poolBtc = poolBtcBump;
    console.log("Pool-BTC:", poolBtc.toBase58());

    // Find PDA for `lpsol pool`
    const [poolLpsol, poolLpsolBump] = await PublicKey.findProgramAddress(
      [Buffer.from(swap_name), Buffer.from(pool_lpsol)],
      program.programId
    );
    bumps.poolLpsol = poolLpsolBump;
    console.log("Pool-LpSOL:", poolLpsol.toBase58());

    // Find PDA for `lpusd pool`
    const [poolLpusd, poolLpusdBump] = await PublicKey.findProgramAddress(
      [Buffer.from(swap_name), Buffer.from(pool_lpusd)],
      program.programId
    );
    bumps.poolLpusd = poolLpusdBump;
    console.log("Pool-LpUSD:", poolLpusd.toBase58());

    console.log("Bumps", bumps);

    // Signer
    const authority = provider.wallet.publicKey;
       
    // initialize
    await program.rpc.initialize(swap_name, bumps, {
      accounts: {
        authority,
        stateAccount,
        usdcMint,
        btcMint,
        lpsolMint,
        lpusdMint,
        poolUsdc,
        poolBtc,
        poolLpsol,
        poolLpusd,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      },
    });

  } catch (err) {
    console.log("Transaction error: ", err);
  }
}

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