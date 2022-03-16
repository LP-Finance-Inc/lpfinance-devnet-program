import { useEffect, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'
import idl from '../../idls/cbs_protocol.json';
import { CBS_Contants, COMMON_Contants } from '../../constants';
import {
    convert_from_wei,
    convert_to_wei,
    getBalance,
    readStateAccount,
    readUserAccount
} from '../../helpers';
import { getTokensPriceList } from '../../helpers/price';
const {
    bumps, stateAccount, poolUsdc,  poolBtc, poolMsol,
    poolLpsol, poolLpusd, cbs_name
} = CBS_Contants;

const {
    lpsolMint, lpusdMint, usdcMint, btcMint, msolMint, pythBtcAccount, 
    pythUsdcAccount, pythSolAccount, NETWORK, pythMsolAccount
} = COMMON_Contants;


const { PublicKey, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;

// const netconfig = "devnet";
// const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl(netconfig));

export const BorrowComponent = () => {
    const wallet = useWallet();
    const { publicKey } = wallet;

    const [depositAmount, setDepositAmount] = useState('');
    const [borrowAmount, setBorrowAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const [solPrice, setSolPrice] = useState('');


    useEffect(async () => {
        if (!publicKey) {
            return;
        }
        await getInfo();
        // eslint-disable-next-line 
    }, [publicKey])

    useEffect(() => {
        if (!publicKey) {
            return;
        }
        getPythPrice();
    }, [publicKey]);

    const getPythPrice = async () => {
        const connection = new Connection(NETWORK, "processed");
        
        const pricesData = await getTokensPriceList(connection, pythSolAccount);
        
        pricesData?.map((data, index) => {
            if (!data) return;
            // console.log(data)
            if (data.Symbol == "Crypto.SOL/USD") {
                setSolPrice(data.Price.toString())
            }
        });
        // mainnet-beta, devnet, testnet
        // const pythConnection = new PythConnection(connection, getPythProgramKeyForCluster("devnet"))
        // if(pythConnection === undefined) return;
        // pythConnection.onPriceChange((product, price) => {
        //     // SRM/USD: $8.68725 ±$0.0131
        //     if (price.price && price.confidence) {
        //         console.log(product.symbol.toString())
        //         if (product.symbol.toString() === "Crypto.SOL/USD") {
        //             setSolPrice(price.price.toString())
        //         }
        //         // if (product.symbol.toString() === "Crypto.BTC/USD") {
        //         //     setSolPrice(price.price.toString())
        //         // }
        //         if (product.symbol.toString() === "Crypto.USDC/USD") {
        //             setSolPrice(price.price.toString())
        //         }
        //     } else {
        //         // Not avaiable to fetch price from pyth network.
        //     }
        // })
        // // // Start listening for price change events.
        // pythConnection.start()
    }
    
    const getInfo = async () => {
        try {
            // Get tokens balance of user's wallet
            const btcBalance = await getBalance(publicKey, btcMint);
            const usdcBalance = await getBalance(publicKey, usdcMint);
            const lpsolBalance = await getBalance(publicKey, lpsolMint);
            const lpusdBalance = await getBalance(publicKey, lpusdMint);
            const msolBalance = await getBalance(publicKey, msolMint);
    
            console.log("Btc balance:", btcBalance)
            console.log("USDC balance:", usdcBalance)
            console.log("LpSOL balance:", lpsolBalance)
            console.log("LpUSD balance:", lpusdBalance)
            console.log("mSOL balance:", msolBalance)
            
            // Get info from user's state account
            const provider = await getProvider();
            const accountData = await readUserAccount(provider, publicKey);
            console.log("Account Data:", accountData, accountData.solAmount.toString());
            console.log("Borrowed LpSOL:", convert_from_wei(accountData.borrowedLpsol.toString()));
            console.log("Borrowed LpUSD:", convert_from_wei(accountData.borrowedLpusd.toString()));

            console.log("Deposited LpSOL:", convert_from_wei(accountData.lpsolAmount.toString()));
            console.log("Deposited LpUSD:", convert_from_wei(accountData.lpusdAmount.toString()));
            console.log("Deposited SOL:", convert_from_wei(accountData.solAmount.toString()));
            console.log("Deposited USDC:", convert_from_wei(accountData.usdcAmount.toString()));
            console.log("Deposited BTC:", convert_from_wei(accountData.btcAmount.toString()));
            console.log("Deposited mSOL:", convert_from_wei(accountData.msolAmount.toString()));

            // Get info from cbs program's state account
            const programData = await readStateAccount(provider, stateAccount);
            console.log("Program Data:", programData);

            console.log("Total rent LpSOL:", convert_from_wei(programData.totalBorrowedLpsol.toString()));
            console.log("Total rent LpUSD:", convert_from_wei(programData.totalBorrowedLpusd.toString()));

            console.log("Total deposited SOL:", convert_from_wei(programData.totalDepositedSol.toString()));
            console.log("Total deposited USDC:", convert_from_wei(programData.totalDepositedUsdc.toString()));
            console.log("Total deposited BTC:", convert_from_wei(programData.totalDepositedBtc.toString()));
            console.log("Total deposited LpSOL:", convert_from_wei(programData.totalDepositedLpsol.toString()));
            console.log("Total deposited LpUSD:", convert_from_wei(programData.totalDepositedLpusd.toString()));
            console.log("Total deposited mSOL:", convert_from_wei(programData.totalDepositedMsol.toString()));

            // const SOL_PRICE  = from pyth // 
            // const total_price = convert_from_wei(programData.totalDepositedSol) * SOL_PRICE
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
            // [Buffer.from(cbs_name), Buffer.from(seed0), Buffer.from(seed1)],
            [Buffer.from(cbs_name), Buffer.from(userAuthority.toBuffer())],
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

        console.log("Passed", accountData, accountData.owner.toBase58(), userAuthority.toBase58())
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
                await getInfo();
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
            // [Buffer.from(cbs_name), Buffer.from(seed0), Buffer.from(seed1)],
            [Buffer.from(cbs_name), Buffer.from(userAuthority.toBuffer())],
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
        } else if(depositTokenName == "msol") {
            collateralPool = poolMsol;
            collateralMint = msolMint;
            poolSeed = "pool_msol";
            poolBump = bumps.poolMsol;
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
            // [Buffer.from(cbs_name), Buffer.from(seed0), Buffer.from(seed1)],
            [Buffer.from(cbs_name), Buffer.from(userAuthority.toBuffer())],
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

            console.log("End transaction")
        } else {
            alert("Owner account does not match");
        }            
    }
    
    
    const withdraw_sol = async () => {
        try {
            const userAuthority = wallet.publicKey;
            const provider = await getProvider();
            anchor.setProvider(provider);
            // address of deployed program
            const programId = new PublicKey(idl.metadata.address);    
            // Generate the program client from IDL.
            const program = new anchor.Program(idl, programId);
            
            const [userAccount, userAccountBump] = await PublicKey.findProgramAddress(
                // [Buffer.from(cbs_name), Buffer.from(seed0), Buffer.from(seed1)],
                [Buffer.from(cbs_name), Buffer.from(userAuthority.toBuffer())],
                program.programId
            );

            try {
                const withdraw_wei = convert_to_wei(withdrawAmount);
                const withdraw_amount = new anchor.BN(withdraw_wei);
                
                await program.rpc.withdrawSol(withdraw_amount, {
                    accounts: {
                        userAuthority,
                        userAccount,
                        stateAccount,
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
        } catch (err) {
            console.log(err);
        }
    }

    const withdraw_token = async (tokenName) => {
        try {
            const userAuthority = wallet.publicKey;
            const provider = await getProvider();
            anchor.setProvider(provider);
            // address of deployed program
            const programId = new PublicKey(idl.metadata.address);    
            // Generate the program client from IDL.
            const program = new anchor.Program(idl, programId);
            
            const [userAccount, userAccountBump] = await PublicKey.findProgramAddress(
                // [Buffer.from(cbs_name), Buffer.from(seed0), Buffer.from(seed1)],
                [Buffer.from(cbs_name), Buffer.from(userAuthority.toBuffer())],
                program.programId
            );

            let destMint = null;
            let destPool = null;
            if (tokenName == "lpusd") {
                destMint = lpusdMint;
                destPool = poolLpusd;
            } else if(tokenName == "lpsol") {
                destMint = lpsolMint;
                destPool = poolLpsol;
            } else if(tokenName == "usdc") {
                destMint = usdcMint;
                destPool = poolUsdc;
            } else if(tokenName == "btc") {
                destMint = btcMint;
                destPool = poolBtc;
            } else if(tokenName == "msol") {
                destMint = msolMint;
                destPool = poolMsol;
            } else {
                alert("Invalid");
            }

            const userDest = await Token.getAssociatedTokenAddress(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                destMint,
                userAuthority
            )

            try {
                const withdraw_wei = convert_to_wei(withdrawAmount);
                const withdraw_amount = new anchor.BN(withdraw_wei);
                
                await program.rpc.withdrawToken(withdraw_amount, {
                    accounts: {
                        userAuthority,
                        userAccount,
                        stateAccount,
                        userDest,
                        destPool,
                        destMint,
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
        } catch (err) {
            console.log(err);
        }
    }
    
    return (
        <div>  
            <h2>1) CBS protocol</h2>
            <div>
                SOL price:
            </div>
            <div>{ solPrice }</div>
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
                <button onClick={ () => deposit_tokens("msol") }>
                    Deposit mSOL
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

            <hr/>
            <div>
                <p>Please enter the amount of SOL to withdraw</p>
                <input type="text" value={ withdrawAmount } onChange={(e) => setWithdrawAmount(e.target.value)}/>
            </div>
            <button onClick={ withdraw_sol } >
                Withdraw SOL
            </button>
            
            <button onClick={() => withdraw_token('usdc') } >
                Withdraw USDC
            </button>
            <button onClick={() => withdraw_token('btc') } >
                Withdraw BTC
            </button>
            <button onClick={() => withdraw_token('lpusd') } >
                Withdraw LpUSD
            </button>
            <button onClick={() => withdraw_token('lpsol') } >
                Withdraw LpSOL
            </button>
            <button onClick={() => withdraw_token('msol') } >
                Withdraw mSOL
            </button>
            <hr/>
        </div>
    );
}
