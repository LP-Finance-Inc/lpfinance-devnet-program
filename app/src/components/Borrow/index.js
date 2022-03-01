import React, { useEffect, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'

import idl from '../../idls/cbs_protocol.json';
const { PublicKey, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;

const NETWORK = 'https://api.devnet.solana.com';

// 2022-03-01 devnet
// ProgramID 3YhaNLN3oYUaAXjK9yRqVVNUYhqPsVqB5q9GEJ1vWcTM
// State-Account: ES4ob9B6ngcM5FXDShXA6SHUvFSv1DQiZY5bG9NakXaR
// Pool-USDC: 3FT6VJn3kPAdaBjnNq9oxk47cJVtfyrt8EFFWwArxtMX
// Pool-BTC: HtrG19tdTKXhJHYFLD6PmjZN22Xi9o9EyVq49P6BBjCj
// Pool-LpSOL: 8fYcxYJxCWrQtoZuCrwnBU6sPbbnTW5eWpM7S1spsvZR
// Pool-LpUSD: 5Pb9Cq3Ho5w4JDLvZFjXQyahcpbSVMEpPHT2bAN4HiPy
// LpSOL-Mint: CCFfxDcVY6iCd4EiocQNymZRhZapuGrxVP4TK1PJrVqh
// LpUSD-Mint: C6DHbFE8eFmiiZPcY1mTPaG928q6cXuE9vD2NHuDL5TH
// Bumps {
//   stateAccount: 254,
//   lpusdMint: 253,
//   lpsolMint: 255,
//   poolUsdc: 255,
//   poolBtc: 255,
//   poolLpsol: 255,
//   poolLpusd: 253
// }

const bumps = {
    stateAccount: 254,
    lpusdMint: 253,
    lpsolMint: 255,
    poolUsdc: 255,
    poolBtc: 255,
    poolLpsol: 255,
    poolLpusd: 253
}
const stateAccount = new PublicKey("ES4ob9B6ngcM5FXDShXA6SHUvFSv1DQiZY5bG9NakXaR");
const usdcMint = new PublicKey("2Q1WAAgnpEox5Y4b6Y8YyXVwFNhDdGot467XfvdBJaPf");
const btcMint = new PublicKey("Hv96pk4HkhGcbNxkBvb7evTU88KzedvgVy2oddBB1ySB");
const poolUsdc = new PublicKey("3FT6VJn3kPAdaBjnNq9oxk47cJVtfyrt8EFFWwArxtMX");
const poolBtc = new PublicKey("HtrG19tdTKXhJHYFLD6PmjZN22Xi9o9EyVq49P6BBjCj");
const poolLpsol = new PublicKey("8fYcxYJxCWrQtoZuCrwnBU6sPbbnTW5eWpM7S1spsvZR");
const poolLpusd = new PublicKey("5Pb9Cq3Ho5w4JDLvZFjXQyahcpbSVMEpPHT2bAN4HiPy");
const lpsolMint = new PublicKey("CCFfxDcVY6iCd4EiocQNymZRhZapuGrxVP4TK1PJrVqh");
const lpusdMint = new PublicKey("C6DHbFE8eFmiiZPcY1mTPaG928q6cXuE9vD2NHuDL5TH");

// ======> PYTH
const pythBtcAccount = new PublicKey("HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"); // 3m1y5h2uv7EQL3KaJZehvAJa4yDNvgc5yAdL9KPMKwvk
const pythUsdcAccount = new PublicKey("5SSkXsEKQepHHAewytPVwdej4epN1nxgLVM84L4KXgy7"); // 6NpdXrQEpmDZ3jZKmM2rhdmkd3H6QAk23j2x8bkXcHKA
const pythSolAccount = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"); // 3Mnn2fX6rQyUsyELYms1sBJyChWofzSNRoqYzvgMVz5E
// ======> PYTH

const protocol_name = "cbs_pool02";
const netconfig = "devnet";
const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl(netconfig));

export const BorrowComponent = () => {
    const wallet = useWallet();
    const { publicKey } = wallet;

    const [depositAmount, setDepositAmount] = useState('');
    const [borrowAmount, setBorrowAmount] = useState('');

    const convert_to_wei = (val) => (parseFloat(val) * 1e9).toString();
    const convert_from_wei = (val) => parseFloat(val) / 1e9;

    // useEffect(async () => {
    //     if (!publicKey) {
    //         return;
    //     }
    //     await getBalance();
    //     // eslint-disable-next-line 
    // }, [publicKey])

    // Get token balance of wallet and pool
    // const getBalance = async () => {
    //     connection.getTokenAccountsByOwner(publicKey, { "mint": usdcMint }).then(res => {
    //         if (res.value.length !== 0) {
    //             connection.getParsedAccountInfo(new anchor.web3.PublicKey(res.value[0].pubkey.toString())).then(info => {
    //                 if(info && info.value) {
    //                 //@ts-expect-error
    //                 console.log("Wallet Balance", info.value.data.parsed.info.tokenAmount.uiAmount)
    //                 }
    //             })
    //         } else {
    //             console.log("Wallet Balance", 0);
    //             // setUsdcBalance(0)
    //         }
    //     });
        
    //     connection.getTokenAccountsByOwner(storeAccount, { "mint": seededMint }).then(res => {
    //         if (res.value.length !== 0) {
    //             connection.getParsedAccountInfo(new anchor.web3.PublicKey(res.value[0].pubkey.toString())).then(info => {
    //                 if(info && info.value) {
    //                     //@ts-expect-error
    //                     console.log("Pool Balance", info.value.data.parsed.info.tokenAmount.uiAmount);
    //                 }
    //             })
    //         } else {
    //             // setVeraBalance(0)
    //             console.log("Pool Balance 2", 0);
    //         }
    //     });

    //     await getUserInfo();

    // }

    // const getStakingInfo = async () => {
    //     try {
    //         const provider = await getProvider();
    //         anchor.setProvider(provider);

    //         // address of deployed program
    //         const programId = new PublicKey(idl.metadata.address);
        
    //         // Generate the program client from IDL.
    //         const program = new anchor.Program(idl, programId);
            
    //         const seed0 = publicKey.toBase58().substring(0, 22);
    //         const seed1 = publicKey.toBase58().substring(22);
    //         // Find PDA from `seed` for state account
    //         const [stakeAccount, bump] = await PublicKey.findProgramAddress(
    //             [Buffer.from(protocol_name), Buffer.from(seed0), Buffer.from(seed1)],
    //             program.programId
    //         );

    //         const accountData = await program.account.stakeInfoAccount.fetch(stakeAccount);
    //         console.log("YOUR Staked SEEDED", convert_from_wei(accountData.stakedAmount.toString()))

    //         const slot = await connection.getSlot();
    //         const curBlockTime = await connection.getBlockTime(slot);
    //         const stakingTerm = curBlockTime - accountData.lastStakeTs;
    //         const stakingDay = Math.floor((stakingTerm > 0 ? stakingTerm: 0) / 86400.0);
    //         const earned_amount = stakingDay * convert_from_wei(accountData.stakedAmount.toString()) * DAILY_REWARD_RATE/ 10000
    //         console.log("Deposit TIME", curBlockTime, accountData.lastStakeTs.toString(), stakingTerm, stakingDay, earned_amount.toFixed(6))
            
    //     } catch (err) {
    //         console.log(err)
    //     }
    // }

    // GET provider
    const getProvider = async () => {
        const network = NETWORK;
    
        const anchorWallet = {
            publicKey: wallet.publicKey,
            signAllTransactions: wallet.signAllTransactions,
            signTransaction: wallet.signTransaction,
        }
        const connection = new Connection(network, "processed");
        const provider = new anchor.Provider(
            connection,
            anchorWallet,
            {
                preflightCommitment: "processed",
            }
        );
    
        return provider;
    }
    
    // Enter depositing
    const depositing = async () => {
        console.log("Start depositing")

        const userAuthority = wallet.publicKey;
        const provider = await getProvider();
        anchor.setProvider(provider);
        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId);
        
        // const seed0 = userAuthority.toBase58().substring(0, 22);
        // const seed1 = userAuthority.toBase58().substring(22);
        // Find PDA from `seed` for state account
        const [userAccount, userAccountBump] = await PublicKey.findProgramAddress(
            // [Buffer.from(protocol_name), Buffer.from(seed0), Buffer.from(seed1)],
            [Buffer.from(protocol_name), Buffer.from(userAuthority.toBuffer())],
            program.programId
        );
        
        const userLpusd = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            lpusdMint,
            userAuthority
        )

        const userLpsol = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            lpsolMint,
            userAuthority
        )

        console.log("UserAccount", userAccount.toBase58(), userAuthority.toBase58());
        // console.log("SEED", seed0, seed1, bump, userAuthority.toBase58())
                
        let accountData;
        try {
            accountData = await program.account.userAccount.fetch(userAccount);
        } catch (err) {
            accountData = null;
        }

        if (accountData == null || accountData == undefined) {
            try {
                await program.rpc.initUserAccount(userAccountBump, {
                    accounts: {
                        userAccount,
                        userLpusd,
                        lpusdMint,
                        userLpsol,
                        lpsolMint,
                        stateAccount,
                        userAuthority,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY
                    }
                });
                accountData = await program.account.userAccount.fetch(userAccount);
            } catch (err) {
                console.log(err);
            }
        }

        console.log("Passed", accountData)
        if (accountData == null || accountData == undefined) {
            return;
        }
        

        if(accountData && accountData.owner.toBase58() == userAuthority.toBase58()) {
            console.log("Transaction")

            try {
                // SOL decimal is 9
                const deposit_wei = convert_to_wei(depositAmount);
                const deposit_amount = new anchor.BN(deposit_wei); // '100000000'
                console.log("Deposit Amount:", deposit_amount.toString())
                await program.rpc.depositSol(deposit_amount, {
                    accounts: {
                        userAuthority,
                        stateAccount,
                        userAccount,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY
                    }
                })
                // await getBalance();
            } catch (err) {
                console.log(err);
            }

            console.log("End transaction")
        } else {
            alert("Owner account does not match");
        }            
    }

    const deposit_tokens = async (depositTokenName) => {
        console.log("Start depositing")

        const userAuthority = wallet.publicKey;
        const provider = await getProvider();
        anchor.setProvider(provider);
        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId);
        
        const [userAccount, userAccountBump] = await PublicKey.findProgramAddress(
            // [Buffer.from(protocol_name), Buffer.from(seed0), Buffer.from(seed1)],
            [Buffer.from(protocol_name), Buffer.from(userAuthority.toBuffer())],
            program.programId
        );

        console.log("UserAccount", userAccount.toBase58(), userAuthority.toBase58());
        // console.log("SEED", seed0, seed1, bump, userAuthority.toBase58())
                
        let accountData;
        try {
            accountData = await program.account.userAccount.fetch(userAccount);
        } catch (err) {
            accountData = null;
        }

        const userLpusd = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            lpusdMint,
            userAuthority
        )

        const userLpsol = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            lpsolMint,
            userAuthority
        )

        if (accountData == null || accountData == undefined) {
            try {
                await program.rpc.initUserAccount(userAccountBump, {
                    accounts: {
                        userAccount,
                        userLpusd,
                        lpusdMint,
                        userLpsol,
                        lpsolMint,
                        stateAccount,
                        userAuthority,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY
                    }
                });
                accountData = await program.account.userAccount.fetch(userAccount);
            } catch (err) {
                console.log(err);
            }
        }

        console.log("Passed", accountData)
        if (accountData == null || accountData == undefined) {
            return;
        }

        let collateralMint = null;
        let collateralPool = null;
        let poolSeed = null;
        let poolBump = 0;
        if (depositTokenName == "lpusd") {
            collateralMint = lpusdMint;
            collateralPool = poolLpusd;
            poolSeed = "pool_lpusd";
            poolBump = bumps.poolLpusd;
        } else if(depositTokenName == "lpsol") {
            collateralMint = lpsolMint;
            collateralPool = poolLpsol;
            poolSeed = "pool_lpsol";
            poolBump = bumps.poolLpsol;
        } else if(depositTokenName == "usdc") {
            collateralMint = usdcMint;
            collateralPool = poolUsdc;
            poolSeed = "pool_usdc";
            poolBump = bumps.poolUsdc;
        } else if(depositTokenName == "btc") {
            collateralPool = poolBtc;
            collateralMint = btcMint;
            poolSeed = "pool_btc";
            poolBump = bumps.poolBtc;
        } else {
            alert("Invalid");
        }
        const userCollateral = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            collateralMint,
            userAuthority
        )

        if(accountData && accountData.owner.toBase58() == userAuthority.toBase58()) {
            console.log("Transaction")
            try {
                const deposit_wei = convert_to_wei(depositAmount);
                const deposit_amount = new anchor.BN(deposit_wei); // '100000000'
                console.log("Deposit Amount:", deposit_amount.toString())

                console.log("Detail Info", userCollateral.toBase58(), collateralMint.toBase58(), collateralPool.toBase58(), poolBump, poolSeed)
                await program.rpc.depositCollateral(
                    deposit_amount, poolBump, poolSeed, {
                    accounts: {
                        userAuthority,
                        userCollateral,
                        collateralMint,
                        stateAccount,
                        collateralPool,
                        userAccount,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY
                    }
                })
                // await getBalance();
            } catch (err) {
                console.log(err);
            }
            console.log("End transaction")
        } else {
            alert("Owner account does not match");
        } 

        console.log("End transaction")
    }

    // borrow Lptoken
    const borrowLpToken = async (isLpUSD) => {
        console.log("Start borrow")

        const provider = await getProvider();
        anchor.setProvider(provider);
        const userAuthority = wallet.publicKey;
        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId);
        
        const [userAccount, userAccountBump] = await PublicKey.findProgramAddress(
            // [Buffer.from(protocol_name), Buffer.from(seed0), Buffer.from(seed1)],
            [Buffer.from(protocol_name), Buffer.from(userAuthority.toBuffer())],
            program.programId
        );
        
        const userLptoken = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            isLpUSD ? lpusdMint : lpsolMint,
            userAuthority
        )

        const collateralMint = isLpUSD ? lpusdMint : lpsolMint;

        let accountData;
        try {
            accountData = await program.account.userAccount.fetch(userAccount);
        } catch (err) {
            accountData = null;

            console.log("NOT DEPOSITED YET");
            return;
        }

        
        if(accountData && accountData.owner.toBase58() == userAuthority.toBase58()) {
            console.log("Transaction")
            console.log("YOUR Depositted", accountData.solAmount.toString())
            try {
                const borrow_wei = convert_to_wei(borrowAmount);
                const borrow_amount = new anchor.BN(borrow_wei);
                console.log("Borrow Amount", borrow_amount.toString(), );
                console.log("Borrow AmountWei", borrow_wei);
                
                await program.rpc.borrowLptoken(isLpUSD, borrow_amount, {
                    accounts: {
                        userAuthority,
                        userAccount,
                        stateAccount,
                        userCollateral: userLptoken,
                        collateralMint,
                        pythBtcAccount,
                        pythUsdcAccount,
                        pythSolAccount,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY
                    }
                })
                // await getBalance();
            } catch (err) {
                console.log(err);
            }

            console.log("End transaction")
        } else {
            alert("Owner account does not match");
        }            
    }
    
    
    return (
        <div>  
            <div>
                <p>Please enter the amount of token to deposit</p>
                <input type="text" value={ depositAmount } onChange={(e) => setDepositAmount(e.target.value)}/>
            </div>
            <div>
                <button onClick={ depositing } >
                    Deposit SOL
                </button>
                <button onClick={ () => deposit_tokens("usdc") }>
                    Deposit USDC
                </button>
                <button onClick={ () => deposit_tokens("btc") }>
                    Deposit BTC
                </button>
                <button onClick={ () => deposit_tokens("lpusd") }>
                    Deposit LpUSD
                </button>
                <button onClick={ () => deposit_tokens("lpsol") }>
                    Deposit LpSOL
                </button>
            </div>
            <hr />
            <div>
                <p>Please enter the amount of Lptoken to borrow</p>
                <input type="text" value={ borrowAmount } onChange={(e) => setBorrowAmount(e.target.value)}/>
            </div>
            <button onClick={() => borrowLpToken(true) } >
                Request LpUSD Token
            </button>
            <button onClick={() => borrowLpToken(false) } >
                Request LpSOL Token
            </button>

            {/* <button onClick={ withdraw } >
                Withdraw
            </button> */}
            <hr/>
        </div>
    );
}
