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
    lpsolMint, lpusdMint, usdcMint, btcMint, pythBtcAccount, 
    pythUsdcAccount, pythSolAccount, NETWORK
} = COMMON_Contants;

const {
    poolUsdc, poolBtc, poolLpsol, poolLpusd, auction_name, bumps, stateAccount
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
            console.log("Deposited LpUSD:", convert_from_wei(accountData.lpusdAmount.toString())); // 100 Lpusd
            console.log("Discount Reward:", convert_from_wei(accountData.discountReward.toString()));

            // Get info from cbs program's state account
            const programData = await readAuctionStateAccount(provider, stateAccount);
            console.log("Program Data:", programData);

            console.log("Reward Percent:", programData.rewardPercent.toString()); // 110 %  110 Lpusd
            console.log("Auction Total deposited LpUSD:", convert_from_wei(programData.lpusdAmount.toString()));
        } catch (err) {
            console.log(err);
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
    
    const liquidate = async () => {
        try {
            const auctionLpusd = poolLpusd;
            const auctionLpsol = poolLpsol;
            const auctionBtc = poolBtc;
            const auctionUsdc = poolUsdc;

            const cbsLpusd = CBS_Contants.poolLpusd;
            const cbsLpsol = CBS_Contants.poolLpsol;
            const cbsUsdc = CBS_Contants.poolUsdc;
            const cbsBtc = CBS_Contants.poolBtc;

            const swapLpusd = SWAP_Contants.poolLpusd;
            const swapLpsol = SWAP_Contants.poolLpsol;
            const swapBtc = SWAP_Contants.poolBtc;
            const swapUsdc = SWAP_Contants.poolUsdc;

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
                    cbsProgram,
                    swapProgram,
                    swapLpusd,
                    swapLpsol,
                    swapBtc,
                    swapUsdc,
                    btcMint,
                    usdcMint,
                    lpsolMint,
                    lpusdMint,
                    auctionLpusd,
                    auctionLpsol,
                    auctionBtc,
                    auctionUsdc,
                    cbsLpusd,
                    cbsLpsol,
                    cbsUsdc,
                    cbsBtc,
                    pythBtcAccount,
                    pythUsdcAccount,
                    pythSolAccount,
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
                <button onClick={ liquidate } >
                    Liquidate
                </button>
            </div>
            <hr/>
        </div>
    );
}
