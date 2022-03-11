import React, { useEffect, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'
import idl from '../../idls/lpfinance_swap.json';
import { SWAP_Contants, COMMON_Contants } from '../../constants';
import {
    convert_from_wei,
    convert_to_wei,
    getBalance,
    getSOLBalance
} from '../../helpers';

const {
    bumps, stateAccount, poolUsdc,  poolBtc,
    poolLpsol, poolLpusd, swap_name
} = SWAP_Contants;

const {
    lpsolMint, lpusdMint, usdcMint, btcMint, pythBtcAccount, 
    pythUsdcAccount, pythSolAccount, NETWORK
} = COMMON_Contants;

const { PublicKey, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;

// const netconfig = "devnet";
// const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl(netconfig));

export const Swap = () => {
    const wallet = useWallet();
    const { publicKey } = wallet;

    const [swapAmount, setSwapAmount] = useState('');

    useEffect(async () => {
        if (!publicKey) {
            return;
        }
        await getInfo();
        // eslint-disable-next-line 
    }, [publicKey])
    
    const getInfo = async () => {
        try {
            // Get the balance of pool tokens
            const btcBalance = await getBalance(stateAccount, btcMint);
            const usdcBalance = await getBalance(stateAccount, usdcMint);
            const lpsolBalance = await getBalance(stateAccount, lpsolMint);
            const lpusdBalance = await getBalance(stateAccount, lpusdMint);
            const solBalance = await getSOLBalance(stateAccount);
            
            console.log("Swap SOL balance:", solBalance);
            console.log("Swap Btc balance:", btcBalance)
            console.log("Swap USDC balance:", usdcBalance)
            console.log("Swap LpSOL balance:", lpsolBalance)
            console.log("Swap LpUSD balance:", lpusdBalance)            
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
        if (token_name == "USDC") return usdcMint;
        if (token_name == "BTC") return btcMint;
        if (token_name == "LpSOL") return lpsolMint;
        if (token_name == "LpUSD") return lpusdMint;
        return "";
    }

    const getPoolMint = (token_name) => {
        if (token_name == "USDC") return poolUsdc;
        if (token_name == "BTC") return poolBtc;
        if (token_name == "LpSOL") return poolLpsol;
        if (token_name == "LpUSD") return poolLpusd;
        return "";
    }
    
    const getPythMint = (token_name) => {
        if (token_name == "USDC") return pythUsdcAccount;
        if (token_name == "BTC") return pythBtcAccount;
        if (token_name == "LpSOL") return pythSolAccount;
        if (token_name == "LpUSD") return pythUsdcAccount;
        return "";
    }
    
    // Enter depositing
    const SwapSOLToToken = async (keyword) => {
        console.log("Start SwapSOLToToken")

        const userAuthority = wallet.publicKey;
        const provider = await getProvider();
        anchor.setProvider(provider);
        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId);                

        const userDest = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            getTokenMint(keyword),
            userAuthority
        )

        try {
            // SOL decimal is 9
            const amout_wei = convert_to_wei(swapAmount);
            const swap_amount = new anchor.BN(amout_wei); // '100000000'

            await program.rpc.swapSolToToken(swap_amount, {
                accounts: {
                    userAuthority,
                    stateAccount,
                    destMint: getTokenMint(keyword),
                    userDest,
                    destPool: getPoolMint(keyword),
                    pythQuoteAccount: pythSolAccount,
                    pythDestAccount: getPythMint(keyword),
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
    // Enter depositing
    const SwapTokenToSOL = async (keyword) => {
        console.log("Start SwapTokenToSOL")

        const userAuthority = wallet.publicKey;
        const provider = await getProvider();
        anchor.setProvider(provider);
        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId);                

        const userQuote = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            getTokenMint(keyword),
            userAuthority
        )

        try {
            // SOL decimal is 9
            const amout_wei = convert_to_wei(swapAmount);
            const swap_amount = new anchor.BN(amout_wei); // '100000000'

            console.log("Accounts", stateAccount.toBase58())
            await program.rpc.swapTokenToSol(swap_amount, {
                accounts: {
                    userAuthority,
                    stateAccount,
                    solAccount: stateAccount,
                    quoteMint: getTokenMint(keyword),
                    userQuote,
                    quotePool: getPoolMint(keyword),
                    pythQuoteAccount: getPythMint(keyword),
                    pythDestAccount: pythSolAccount,
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
    
    // Enter depositing
    const SwapTokenToToken = async (quote_key, dest_key) => {

        const userAuthority = wallet.publicKey;
        const provider = await getProvider();
        anchor.setProvider(provider);
        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId);                

        const userQuote = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            getTokenMint(quote_key),
            userAuthority
        )
        const userDest = await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            getTokenMint(dest_key),
            userAuthority
        )

        try {
            // SOL decimal is 9
            const amout_wei = convert_to_wei(swapAmount);
            const swap_amount = new anchor.BN(amout_wei); // '100000000'

            await program.rpc.swapTokenToToken(swap_amount, {
                accounts: {
                    userAuthority,
                    stateAccount,
                    quoteMint: getTokenMint(quote_key),
                    destMint: getTokenMint(dest_key),
                    userQuote,
                    userDest,
                    quotePool: getPoolMint(quote_key),
                    destPool: getPoolMint(dest_key),
                    pythQuoteAccount: getPythMint(quote_key),
                    pythDestAccount: getPythMint(dest_key),
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

    return (
        <div>  
            <h2>3) Swap protocol</h2>
            <div>
                <p>Please enter the amount of token to swap</p>
                <input type="text" value={ swapAmount } onChange={(e) => setSwapAmount(e.target.value)}/>
            </div>
            <h4>Swap SOL to token</h4>
            <div>
                <button onClick={ () => SwapSOLToToken("USDC") }>
                    Swap SOL to USDC
                </button>
                <button onClick={ () => SwapSOLToToken("BTC") }>
                    Swap SOL to BTC
                </button>
                <button onClick={ () => SwapSOLToToken("LpUSD") }>
                    Swap SOL to LpUSD
                </button>
                <button onClick={ () => SwapSOLToToken("LpSOL") }>
                    Swap SOL to LpSOL
                </button>
            </div>

            <hr/>
            <h4>Swap token to SOL</h4>
            <div>
                <button onClick={ () => SwapTokenToSOL("USDC") }>
                    Swap USDC to SOL
                </button>
                <button onClick={ () => SwapTokenToSOL("BTC") }>
                    Swap BTC to SOL
                </button>
                <button onClick={ () => SwapTokenToSOL("LpUSD") }>
                    Swap LpUSD to SOL
                </button>
                <button onClick={ () => SwapTokenToSOL("LpSOL") }>
                    Swap LpSOL to SOL
                </button>
            </div>

            <hr/>

            <h4>Swap token to token</h4>
            <div>
                <button onClick={ () => SwapTokenToToken("BTC", "USDC") }>
                    Swap BTC to USDC
                </button>
            </div>
        </div>
    );
}