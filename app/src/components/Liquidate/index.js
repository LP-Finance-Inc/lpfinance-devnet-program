import React, { useEffect, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'
import idl from '../../idls/lpusd_auction.json';
import { CBS_Contants, Auction_Constants, COMMON_Contants } from '../../constants';
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
            console.log("Account Data:", accountData);
            console.log("Deposited LpSOL:", convert_from_wei(accountData.lpusdAmount.toString()));
            console.log("Discount Reward:", convert_from_wei(accountData.discountReward.toString()));

            // Get info from cbs program's state account
            const programData = await readAuctionStateAccount(provider, stateAccount);
            console.log("Program Data:", programData);

            console.log("Reward Percent:", programData.rewardPercent.toString());
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
            </div>
            <hr/>
        </div>
    );
}
