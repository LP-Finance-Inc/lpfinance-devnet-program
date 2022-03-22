import React, { useEffect, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import idl from '../../idls/lpfinance_accounts.json';
import { ADD_WALLET_Constants, COMMON_Contants } from '../../constants';
import { readWalletStateAccount } from '../../helpers';

const { PublicKey, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;

const { NETWORK} = COMMON_Contants;
const { stateAccount } = ADD_WALLET_Constants;

export const AddWallet = () => {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const [accountKey, setAccountKey] = useState('');

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

            // Get info from cbs program's state account
            const programData = await readWalletStateAccount(provider, stateAccount);
            console.log("Wallet Program Data:", programData);
            console.log("Wallet List:", programData.accountList);
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
    
    // Enter depositing
    const add_wallet = async () => {
        const authority = wallet.publicKey;    

        const provider = await getProvider();
        anchor.setProvider(provider);
        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId);                

        const cbsAccount = new PublicKey(accountKey);
        try {
            await program.rpc.addWallet({
                accounts: {
                    authority,
                    cbsAccount,
                    stateAccount,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY
                }
            })
        } catch (err) {
            console.log(err);
        }

        console.log("End transaction")
    }
    
    return (
        <div>  
            <h2>6) Register Account</h2>
            <div>
                <input type="text" value={accountKey} onChange={(e) => setAccountKey(e.target.value)} />
            </div>
            <div>
                <button onClick={ () => add_wallet() }>
                    Register Account
                </button>
            </div>
        </div>
    );
}