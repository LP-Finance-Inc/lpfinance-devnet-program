import React, { useEffect } from 'react';
import * as anchor from '@project-serum/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'

import idl from '../../idls/staking_pool.json';
const { PublicKey, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;

const NETWORK = 'https://api.devnet.solana.com';

const storeAccount = new PublicKey("C1eN88HQSJ1Jy2zRgbnnZ4LchhLipU5zLZ9vu8We96jj");
// POOL
const poolSeeded = new PublicKey("HYPm4vXCwqNdjsYaP12uQwFK5vFZexr7CSHF1iMUyjXv");
// Token
const seededMint = new PublicKey("Gag5A5jjD38CX93QF828oNJQQgoYeuKBNpwcKqwx3oG4");

const netconfig = "devnet";
const program_title = "cbs_protocal";
const DAILY_REWARD_RATE = 5;

const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl(netconfig));

export const BorrowComponent = () => {
    const wallet = useWallet();
    const { publicKey } = wallet;

    const convert_to_wei = (val) => (parseFloat(val) * 1e9).toString();
    const convert_from_wei = (val) => parseFloat(val) / 1e9;

    useEffect(async () => {
        if (!publicKey) {
            return;
        }
        await getBalance();
        // eslint-disable-next-line 
    }, [publicKey])

    // Get token balance of wallet and pool
    const getBalance = async () => {
        connection.getTokenAccountsByOwner(publicKey, { "mint": seededMint }).then(res => {
            if (res.value.length !== 0) {
                connection.getParsedAccountInfo(new anchor.web3.PublicKey(res.value[0].pubkey.toString())).then(info => {
                    if(info && info.value) {
                    //@ts-expect-error
                    console.log("Wallet Balance", info.value.data.parsed.info.tokenAmount.uiAmount)
                    }
                })
            } else {
                console.log("Wallet Balance", 0);
                // setUsdcBalance(0)
            }
        });
        
        connection.getTokenAccountsByOwner(storeAccount, { "mint": seededMint }).then(res => {
            if (res.value.length !== 0) {
                connection.getParsedAccountInfo(new anchor.web3.PublicKey(res.value[0].pubkey.toString())).then(info => {
                    if(info && info.value) {
                        //@ts-expect-error
                        console.log("Pool Balance", info.value.data.parsed.info.tokenAmount.uiAmount);
                    }
                })
            } else {
                // setVeraBalance(0)
                console.log("Pool Balance 2", 0);
            }
        });

        await getStakingInfo();

    }

    const getStakingInfo = async () => {
        try {
            const provider = await getProvider();
            anchor.setProvider(provider);

            // address of deployed program
            const programId = new PublicKey(idl.metadata.address);
        
            // Generate the program client from IDL.
            const program = new anchor.Program(idl, programId);
            
            const seed0 = publicKey.toBase58().substring(0, 22);
            const seed1 = publicKey.toBase58().substring(22);
            // Find PDA from `seed` for state account
            const [stakeAccount, bump] = await PublicKey.findProgramAddress(
                [Buffer.from(program_title), Buffer.from(seed0), Buffer.from(seed1)],
                program.programId
            );

            const accountData = await program.account.stakeInfoAccount.fetch(stakeAccount);
            console.log("YOUR Staked SEEDED", convert_from_wei(accountData.stakedAmount.toString()))

            const slot = await connection.getSlot();
            const curBlockTime = await connection.getBlockTime(slot);
            const stakingTerm = curBlockTime - accountData.lastStakeTs;
            const stakingDay = Math.floor((stakingTerm > 0 ? stakingTerm: 0) / 86400.0);
            const earned_amount = stakingDay * convert_from_wei(accountData.stakedAmount.toString()) * DAILY_REWARD_RATE/ 10000
            console.log("Deposit TIME", curBlockTime, accountData.lastStakeTs.toString(), stakingTerm, stakingDay, earned_amount.toFixed(6))
            
        } catch (err) {
            console.log(err)
        }
    }

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

        const provider = await getProvider();
        anchor.setProvider(provider);

        const storeAuthority = wallet.publicKey;
        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);
    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId);
        
        const seed0 = storeAuthority.toBase58().substring(0, 22);
        const seed1 = storeAuthority.toBase58().substring(22);
        // Find PDA from `seed` for state account
        const [stakeAccount, bump] = await PublicKey.findProgramAddress(
            [Buffer.from(program_title), Buffer.from(seed0), Buffer.from(seed1)],
            program.programId
        );

        console.log("StateAccount", stakeAccount.toBase58());
        console.log("SEED", seed0, seed1, bump, storeAuthority.toBase58())
                
        let accountData;
        try {
            accountData = await program.account.stakeInfoAccount.fetch(stakeAccount);
        } catch (err) {
            accountData = null;
        }

        if (accountData == null || accountData == undefined) {
            try {
                const pp = await program.account.storeAccount.fetch(storeAccount);
                console.log(pp)

                await program.rpc.initStakeAccount(bump, seed0, seed1, {
                    accounts: {
                        stakeAccount,
                        storeAccount,
                        storeAuthority,
                        systemProgram: SystemProgram.programId,
                        rent: SYSVAR_RENT_PUBKEY
                    }
                });

                accountData = await program.account.stakeInfoAccount.fetch(stakeAccount);
            } catch (err) {
                console.log(err);
            }
        }

        if (accountData == null || accountData == undefined) {
            return;
        }
        

        if(accountData && accountData.owner.toBase58() == storeAuthority.toBase58()) {
            console.log("Transaction")

            try {
                const stake_amount = new anchor.BN('1000000000')
                const userSeeded = await Token.getAssociatedTokenAddress(
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                    TOKEN_PROGRAM_ID,
                    seededMint,
                    storeAuthority
                );
    
                console.log("UserSeeded", userSeeded.toBase58());
    
                await program.rpc.enterStaking(stake_amount, {
                    accounts: {
                        userAuthority: storeAuthority,
                        userSeeded,
                        seededMint,
                        stakeAccount,
                        storeAccount,
                        poolSeeded,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY
                    }
                })
                await getBalance();
            } catch (err) {
                console.log(err);
            }

            console.log("End transaction")
        } else {
            alert("Owner account does not match");
        }            
    }

    // borrow lptokens
    const borrow = async () => {
        console.log("Start borrow")

        const provider = await getProvider();
        anchor.setProvider(provider);

        const storeAuthority = wallet.publicKey;
        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);
    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId);
        
        const seed0 = storeAuthority.toBase58().substring(0, 22);
        const seed1 = storeAuthority.toBase58().substring(22);
        // Find PDA from `seed` for state account
        const [stakeAccount, bump] = await PublicKey.findProgramAddress(
            [Buffer.from(program_title), Buffer.from(seed0), Buffer.from(seed1)],
            program.programId
        );

        console.log("StateAccount", stakeAccount.toBase58(), program.programId.toBase58(), seed0, seed1);
                
        let accountData;
        try {
            accountData = await program.account.stakeInfoAccount.fetch(stakeAccount);
        } catch (err) {
            accountData = null;

            console.log("NOT DEPOSITED YET");
            return;
        }

        if(accountData && accountData.owner.toBase58() == storeAuthority.toBase58()) {
            console.log("Transaction")
            console.log("YOUR Deposit", accountData.stakedAmount.toString())
            try {
                const userSeeded = await Token.getAssociatedTokenAddress(
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                    TOKEN_PROGRAM_ID,
                    seededMint,
                    storeAuthority
                );
    
                console.log("UserSeeded", userSeeded.toBase58());
                
                const withdraw_amount = new anchor.BN('1000000000');
                
                await program.rpc.startUnstaking(withdraw_amount, {
                    accounts: {
                        userAuthority: storeAuthority,
                        userSeeded,
                        seededMint,
                        stakeAccount,
                        storeAccount,
                        poolSeeded,
                        tokenProgram: TOKEN_PROGRAM_ID,
                    }
                })
                await getBalance();
            } catch (err) {
                console.log(err);
            }

            console.log("End transaction")
        } else {
            alert("Owner account does not match");
        }            
    }
    
    // withdraw earned amount
    const withdraw = async () => {
        console.log("Start withdraw")

        const provider = await getProvider();
        anchor.setProvider(provider);

        const storeAuthority = wallet.publicKey;
        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);
    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId);
        
        const seed0 = storeAuthority.toBase58().substring(0, 22);
        const seed1 = storeAuthority.toBase58().substring(22);
        // Find PDA from `seed` for state account
        const [stakeAccount, bump] = await PublicKey.findProgramAddress(
            [Buffer.from(program_title), Buffer.from(seed0), Buffer.from(seed1)],
            program.programId
        );

        console.log("StateAccount", stakeAccount.toBase58(), program.programId.toBase58(), seed0, seed1);
                
        let accountData;
        try {
            accountData = await program.account.stakeInfoAccount.fetch(stakeAccount);
        } catch (err) {
            accountData = null;

            console.log("NOT DEPOSITED YET");
            return;
        }

        if(accountData && accountData.owner.toBase58() == storeAuthority.toBase58()) {
            console.log("Transaction")
            console.log("YOUR Deposited SEEDED", accountData.stakedAmount.toString())
            try {
                const userSeeded = await Token.getAssociatedTokenAddress(
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                    TOKEN_PROGRAM_ID,
                    seededMint,
                    storeAuthority
                );
    
                console.log("UserSeeded", userSeeded.toBase58());
    
                await program.rpc.borrow({
                    accounts: {
                        userAuthority: storeAuthority,
                        userSeeded,
                        seededMint,
                        stakeAccount,
                        storeAccount,
                        poolSeeded,
                        tokenProgram: TOKEN_PROGRAM_ID,
                    }
                })
                await getBalance();
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
            <button onClick={ depositing } >
                Deposit Collateral
            </button>

            <button onClick={ borrow } >
                Request Borrow
            </button>

            <button onClick={ withdraw } >
                Withdraw
            </button>
        </div>
    );
}
