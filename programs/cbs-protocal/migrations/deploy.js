// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

const anchor = require("@project-serum/anchor");
const { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, Token } = require('@solana/spl-token')
const { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair } = anchor.web3;

const idl = require("../target/idl/cbs_protocal.json");
const programID = idl.metadata.address;

console.log("ProgramID", programID);
const protocal_name = "presale_05";
const pool_usdc = "pool_usdc";
const pool_btc = "pool_btc";
const lpsol_mint = "lpsol_mint";
const lpusd_mint = "lpusd_mint";

// Test Token's MINT
const usdcMint = new PublicKey("2Q1WAAgnpEox5Y4b6Y8YyXVwFNhDdGot467XfvdBJaPf"); 
const btcMint = new PublicKey("Hv96pk4HkhGcbNxkBvb7evTU88KzedvgVy2oddBB1ySB");

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  // Add your deploy script here
  const program = new anchor.Program(idl, programID);

  try {
    /* interact with the program via rpc */
    let bumps = {
      stateAccount: 0,
      lpusdMint: 0,
      lpsolMint: 0,
      poolUsdc: 0,
      poolBtc: 0
    };

    // Find PDA from `cbs protocal` for state account
    const [stateAccount, stateAccountBump] = await PublicKey.findProgramAddress(
      [Buffer.from(protocal_name)],
      program.programId
    );
    bumps.stateAccount = stateAccountBump;
    console.log("State-Account:", stateAccount.toBase58());

    // Find PDA for `usdc pool`
    const [poolUsdc, poolUsdcBump] = await PublicKey.findProgramAddress(
      [Buffer.from(protocal_name), Buffer.from(pool_usdc)],
      program.programId
    );
    bumps.poolUsdc = poolUsdcBump;
    console.log("Pool-USDC:", poolUsdc.toBase58());

    // Find PDA for `btc pool`
    const [poolBtc, poolBtcBump] = await PublicKey.findProgramAddress(
      [Buffer.from(protocal_name), Buffer.from(pool_btc)],
      program.programId
    );
    bumps.poolBtc = poolBtcBump;
    console.log("Pool-BTC:", poolBtc.toBase58());

    // Find PDA for `lpsol mint`
    const [lpsolMint, lpsolMintBump] = await PublicKey.findProgramAddress(
      [Buffer.from(protocal_name), Buffer.from(lpsol_mint)],
      program.programId
    );
    bumps.lpsolMint = lpsolMintBump;
    console.log("LpSOL-Mint:", lpsolMint.toBase58());

    // Find PDA for `lpsol mint`
    const [lpusdMint, lpusdMintBump] = await PublicKey.findProgramAddress(
      [Buffer.from(protocal_name), Buffer.from(lpusd_mint)],
      program.programId
    );
    bumps.lpusdMint = lpusdMintBump;
    console.log("LpUSD-Mint:", lpusdMint.toBase58());

    console.log("Bumps", bumps);

    // Signer
    const authority = provider.wallet.publicKey;
       
    // initialize
    await program.rpc.initialize(protocal_name, bumps, {
      accounts: {
        authority,
        stateAccount,
        usdcMint,
        btcMint,
        poolUsdc,
        poolBtc,
        lpsolMint,
        lpusdMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      },
    });

  } catch (err) {
    console.log("Transaction error: ", err);
  }
}

// 2022-02-26 devnet
// ProgramID FURTQbwZCqybpnWA5F3zGP82RgZwp4Jw4JSPziY6V2yH
// State-Account: EZ23aCphKJwcrgzNHbyfRKoAnMPvEApJk4Q1hqwsBNQy
// Pool-USDC: J5a9C2gQXhAJ4ETRgdybMoUujXyvE8uC2FRWJbabJD1S
// Pool-BTC: D9gNc3RyBxLSaDnhapZLtVDicUUbKmH7WL7vmEamwiep
// LpSOL-Mint: DVsVeTpt2Xsq56n17dGEJaZ6wtUnSxfKWscmLTUZfY7k
// LpUSD-Mint: 3hzwCPsbSmtbKZL71s2B9tpdv1ZSH9BvPxhBRU7x32v9
// Bumps {
//   stateAccount: 254,
//   lpusdMint: 255,
//   lpsolMint: 254,
//   poolUsdc: 254,
//   poolBtc: 251
// }