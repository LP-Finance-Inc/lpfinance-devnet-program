import React, { useEffect, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'
import idl from '../../idls/lpusd_auction.json';
import cbs_idl from '../../idls/cbs_protocol.json';
import swap_idl  from '../../idls/lpfinance_swap.json';

import { CBS_Contants, SWAP_Contants, Auction_Constants, COMMON_Contants } from '../../constants';
import {
    convert_from_wei,
    convert_to_wei,
    readAuctionUserAccount,
    readAuctionStateAccount
} from '../../helpers';

const {
    lpusdMint, pythBtcAccount, pythMsolAccount,
    pythUsdcAccount, pythSolAccount, NETWORK
} = COMMON_Contants;

const {
    poolUsdc, poolMsol, poolBtc, poolLpsol, poolLpusd, auction_name, bumps, stateAccount
} = Auction_Constants;

const { PublicKey, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;

export const Liqudate = () => {
    const wallet = useWallet();
    const { publicKey } = wallet;

    const [depositAmount, setDepositAmount] = useState('');

    useEffect(async () => {
        if (!publicKey) {
            return;
        }
        await getInfo();
        // eslint-disable-next-line 
    }, [publicKey])
    
    const getInfo = async () => {
        try {            
            // Get info from user's state account
            const provider = await getProvider();
            const accountData = await readAuctionUserAccount(provider, publicKey);
            if (!accountData) return;
            console.log("Account Data:", accountData);

            // Get info from cbs program's state account
            const programData = await readAuctionStateAccount(provider, stateAccount);
            console.log("Program Data:", programData);

            console.log("Auction Total LpUSD:", convert_from_wei(programData.totalLpusd.toString()));
            console.log("Total Reward Percent:", programData.totalPercent.toString()); // 110 %  110 Lpusd
            console.log("Auction Last Epoch Profit Percent:", convert_from_wei(programData.lastEpochPercent.toString())); // return 106 %
            // APY = ((106 - 100) / 100 ) ^ 365;
            console.log("Auction Last Epoch Profit Amount:", convert_from_wei(programData.lastEpochProfit.toString())); 

            // User's Balance of LpUSD
            const userPercent = accountData.totalPercent.toString();
            const userLpUSDTemp = convert_from_wei(accountData.lpusdAmount.toString());
            const userLpUSD = userLpUSDTemp * userPercent / 100;

            console.log("Auction User Percent:", accountData.totalPercent.toString());
            console.log("Auction User Deposited LpUSD:", convert_from_wei(accountData.lpusdAmount.toString())); // 100 Lpusd
        } catch (err) {
            console.log(err);
        }

        // ((LEPP - 100) / 100 ) ^ 365 = APY
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
    
    const deposite_lpusd = async () => {
        console.log("Start depositing")

        const userAuthority = wallet.publicKey;
        const provider = await getProvider();
        anchor.setProvider(provider);
        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId);
        
        const [userAccount, userAccountBump] = await PublicKey.findProgramAddress(
            [Buffer.from(auction_name), Buffer.from(userAuthority.toBuffer())],
            program.programId
        );
   
        let accountData;
        try {
            accountData = await program.account.userStateAccount.fetch(userAccount);
        } catch (err) {
            accountData = null;
        }

        if (accountData == null || accountData == undefined) {
            try {
                await program.rpc.initUserAccount(userAccountBump, {
                    accounts: {
                        userAccount,
                        stateAccount,
                        userAuthority,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY
                    }
                });
                accountData = await program.account.userStateAccount.fetch(userAccount);
            } catch (err) {
                console.log(err);
            }
        }

        console.log("Passed", accountData)
        if (accountData == null || accountData == undefined) {
            return;
        }

        const userLpusd = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            lpusdMint,
            userAuthority
        )
        
        if(accountData && accountData.owner.toBase58() == userAuthority.toBase58()) {
            console.log("Transaction")
            try {
                const deposit_wei = convert_to_wei(depositAmount);
                const deposit_amount = new anchor.BN(deposit_wei); // '100000000'
                console.log("Deposit Amount:", deposit_amount.toString())

                await program.rpc.depositLpusd(
                    deposit_amount, {
                    accounts: {
                        userAuthority,
                        userLpusd,
                        lpusdMint,
                        stateAccount,
                        poolLpusd,
                        userAccount,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY
                    }
                })
                await getInfo();
            } catch (err) {
                console.log(err);
            }
            console.log("End transaction")
        } else {
            alert("Owner account does not match");
        } 

        console.log("End transaction")
    }

    const withdraw_lpusd = async () => {
        console.log("Start withdraw")

        const userAuthority = wallet.publicKey;
        const provider = await getProvider();
        anchor.setProvider(provider);
        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId);
        
        const [userAccount, userAccountBump] = await PublicKey.findProgramAddress(
            [Buffer.from(auction_name), Buffer.from(userAuthority.toBuffer())],
            program.programId
        );
           

        const userLpusd = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            lpusdMint,
            userAuthority
        )
        
        try {
            const deposit_wei = convert_to_wei(depositAmount);
            const deposit_amount = new anchor.BN(deposit_wei); // '100000000'
            console.log("Deposit Amount:", deposit_amount.toString())

            await program.rpc.withdrawLpusd(deposit_amount, {
                accounts: {
                    userAuthority,
                    userLpusd,
                    lpusdMint,
                    stateAccount,
                    poolLpusd,
                    userAccount,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY
                }
            })
            await getInfo();
        } catch (err) {
            console.log(err);
        }
        console.log("End transaction")

    }
    
    const liquidate = async () => {
        try {
            const auctionLpusd = poolLpusd;
            const auctionLpsol = poolLpsol;
            const auctionBtc = poolBtc;
            const auctionUsdc = poolUsdc;
            const auctionMsol = poolMsol;

            const cbsLpusd = CBS_Contants.poolLpusd;
            const cbsLpsol = CBS_Contants.poolLpsol;
            const cbsUsdc = CBS_Contants.poolUsdc;
            const cbsBtc = CBS_Contants.poolBtc;
            const cbsMsol = CBS_Contants.poolMsol;
            
            const swapAccount = SWAP_Contants.stateAccount;
            const swapLpusd = SWAP_Contants.poolLpusd;
            const swapLpsol = SWAP_Contants.poolLpsol;
            const swapBtc = SWAP_Contants.poolBtc;
            const swapUsdc = SWAP_Contants.poolUsdc;
            const swapMsol = SWAP_Contants.poolMsol;

            const cbsAccount = CBS_Contants.stateAccount;
            const cbsProgram = new PublicKey(cbs_idl.metadata.address);
            const swapProgram = new PublicKey(swap_idl.metadata.address);
            const auctionAccount = stateAccount;

            const userAuthority = wallet.publicKey;
            const provider = await getProvider();
            anchor.setProvider(provider);
            // address of deployed program
            const programId = new PublicKey(cbs_idl.metadata.address);    
            // Generate the program client from cbs_idl.
            const program = new anchor.Program(cbs_idl, programId);
            
            const [userAccount, userAccountBump] = await PublicKey.findProgramAddress(
                [Buffer.from(CBS_Contants.cbs_name), Buffer.from(userAuthority.toBuffer())],
                program.programId
            );
            const liquidator = userAccount;
            
            const auctionProgramId = new PublicKey(idl.metadata.address);
            const auctionProgram = new anchor.Program(idl, auctionProgramId);

            await auctionProgram.rpc.liquidate({
                accounts: {
                    userAuthority,
                    auctionAccount,
                    liquidator,
                    cbsAccount,
                    swapAccount,
                    cbsProgram,
                    swapProgram,
                    swapLpusd,
                    swapLpsol,
                    swapBtc,
                    swapUsdc,
                    swapMsol,
                    // btcMint,
                    // usdcMint,
                    // lpsolMint,
                    lpusdMint,
                    auctionLpusd,
                    auctionLpsol,
                    auctionBtc,
                    auctionUsdc,
                    auctionMsol,
                    cbsLpusd,
                    cbsLpsol,
                    cbsMsol,
                    cbsUsdc,
                    cbsBtc,
                    pythBtcAccount,
                    pythUsdcAccount,
                    pythSolAccount,
                    pythMsolAccount,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY
                }
            })
            await getInfo(); 

        } catch (err) {
            console.log(err);
        }
    }

    return (
        <div>  
            <h2>4) Liqudate</h2>
            <div>
                <p>Please enter the amount of token to deposit</p>
                <input type="text" value={ depositAmount } onChange={(e) => setDepositAmount(e.target.value)}/>
            </div>
            <div>
                <button onClick={ deposite_lpusd } >
                    Deposit LpUSD
                </button>
                <button onClick={ withdraw_lpusd } >
                    Withdraw
                </button>
                <button onClick={ liquidate } >
                    Liquidate
                </button>
            </div>
            <hr/>
        </div>
    );
}
