import React, { useEffect, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'
import idl from '../../idls/faucet.json';
import { COMMON_Contants, Faucet_Constants } from '../../constants';
import {
    convert_from_wei,
    convert_to_wei,
    getBalance,
    getSOLBalance
} from '../../helpers';

const { PublicKey, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;

const { btcMint, usdcMint, msolMint, NETWORK} = COMMON_Contants;
const { poolBtc, poolUsdc, poolTmsol, faucet_name } = Faucet_Constants;

const tmsolMint = msolMint;
// const netconfig = "devnet";
// const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl(netconfig));

export const Faucet = () => {
    const wallet = useWallet();
    const { publicKey } = wallet;


    useEffect(async () => {
        if (!publicKey) {
            return;
        }
        await getInfo();
        // eslint-disable-next-line 
    }, [publicKey])
    
    const getInfo = async () => {
        try {
            console.log("Get Info started");
            // Get the balance of pool tokens
            const btcBalance = await getBalance(publicKey, btcMint);
            const usdcBalance = await getBalance(publicKey, usdcMint);
            const solBalance = await getSOLBalance(publicKey);
            
            console.log("My Account SOL balance:", solBalance);
            console.log("My Account Btc balance:", btcBalance)
            console.log("My Account USDC balance:", usdcBalance)         
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

    const getTokenMint = (token_name) => {
        if (token_name == "tUSDC") return usdcMint;
        if (token_name == "tBTC") return btcMint;
        if (token_name == "tmSOL") return tmsolMint;
        return "";
    }

    const getPoolMint = (token_name) => {
        if (token_name == "tUSDC") return poolUsdc;
        if (token_name == "tBTC") return poolBtc;
        if (token_name == "tmSOL") return poolTmsol;
        return "";
    }    
    
    // Enter depositing
    const request_faucet = async (keyword) => {
        console.log("Request Faucet")


        const userAuthority = wallet.publicKey;
        
        if (keyword === "SOL") {
            try {
                const connection = new Connection(NETWORK, "processed");

                let airdropSignature = await connection.requestAirdrop(
                    userAuthority,
                    anchor.web3.LAMPORTS_PER_SOL,
                );
            
                await connection.confirmTransaction(airdropSignature);
                console.log("1 SOL transferred to your account")
                await getInfo();
            } catch (err) {
                console.log(err);
            }
            return;
        }

        const provider = await getProvider();
        anchor.setProvider(provider);
        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId);                

        const [stateAccount, stateAccountBump] = await PublicKey.findProgramAddress(
            [Buffer.from(faucet_name)],
            program.programId
        );

        const tokenMint = getTokenMint(keyword);
        const userToken = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            tokenMint,
            userAuthority
        )
        const poolToken = getPoolMint(keyword);
        
        console.log("Info:",tokenMint.toBase58(), userToken.toBase58(), poolToken.toBase58())
        try {
            await program.rpc.requestToken({
                accounts: {
                    userAuthority,
                    stateAccount,
                    userToken,
                    tokenMint,
                    poolToken,
                    systemProgram: SystemProgram.programId,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
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
    
    return (
        <div>  
            <h2>0) Faucet</h2>
            <div>
                <button onClick={ () => request_faucet("tUSDC") }>
                    Request tUSDC
                </button>
                <button onClick={ () => request_faucet("tBTC") }>
                    Request tBTC
                </button>
                <button onClick={ () => request_faucet("SOL") }>
                    Request SOL
                </button>
                <button onClick={ () => request_faucet("tmSOL") }>
                    Request tmSOL
                </button>
            </div>
        </div>
    );
}