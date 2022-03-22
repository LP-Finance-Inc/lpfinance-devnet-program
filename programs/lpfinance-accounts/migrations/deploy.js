// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

const anchor = require("@project-serum/anchor");
const { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;

const idl = require("../target/idl/lpfinance_accounts.json");
const programID = idl.metadata.address;

console.log("ProgramID", programID);
const accounts_name = "accounts_0";

// Test Token's MINT
const cbsAccount = new PublicKey("2bpEcaTSRtenzbtVuQmygXWn69ccj2voJ59PjbPuthtJ"); 

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  // Add your deploy script here
  const program = new anchor.Program(idl, programID);

  try {
    /* interact with the program via rpc */
    let bumps = {
      stateAccount: 0
    };

    // Find PDA from `cbs protocol` for state account
    const [stateAccount, stateAccountBump] = await PublicKey.findProgramAddress(
      [Buffer.from(accounts_name)],
      program.programId
    );
    bumps.stateAccount = stateAccountBump;
    console.log("State-Account:", stateAccount.toBase58());

    console.log("Bumps", bumps);

    // Signer
    const authority = provider.wallet.publicKey;
       
    // initialize
    await program.rpc.initialize(accounts_name, bumps, {
      accounts: {
        authority,
        stateAccount,
        cbsAccount,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      },
    });

  } catch (err) {
    console.log("Transaction error: ", err);
  }
}

// 2022-03-22 devnet
// ProgramID CaBy6Mh16bVQpnqY7Crt13hU4Zyv8QbW55GfTvVFwxYh
// State-Account: 35mSpeCWi9rH1KNMnmhC9i32Mxak8jWEk8YB841g5WAi
// Bumps { stateAccount: 255 }