import * as anchor from '@project-serum/anchor';
import idl from '../idls/cbs_protocol.json';
import auction_idl from '../idls/lpusd_auction.json';

import { CBS_Contants, COMMON_Contants } from '../constants';
const { PublicKey, Connection } = anchor.web3;
const { NETWORK } = COMMON_Contants;
const { cbs_name } = CBS_Contants;

export const convert_to_wei = (val) => (parseFloat(val) * 1e9).toString();
export const convert_from_wei = (val) => parseFloat(val) / 1e9; 

// Get the token's amount from user wallet
export const getBalance = async (account, mint) => {
    const connection = new Connection(NETWORK, "processed");
    const res = await connection.getTokenAccountsByOwner(account, { "mint": mint });    
    if (res.value.length !== 0) {
        const info = await connection.getParsedAccountInfo(new anchor.web3.PublicKey(res.value[0].pubkey.toString()));
        if(info && info.value) {
            return info.value.data.parsed.info.tokenAmount.uiAmount;
        }
        return 0;
    } else {
        return 0;
    }
}

export const getSOLBalance = async (account) => {
    const connection = new Connection(NETWORK, "processed");
    const solBalance = await connection.getBalance(account);
    return convert_from_wei(solBalance);
}

// Get the infos from user wallet' state account
// as infos, deposited collateral amounts and borrowed tokens amount
export const readUserAccount = async (provider, publicKey) => {
    try {
        anchor.setProvider(provider);

        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);
    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId); 

        const [userAccount, bump] = await PublicKey.findProgramAddress(
            [Buffer.from(cbs_name), Buffer.from(publicKey.toBuffer())],
            programId
        );

        const accountData = await program.account.userAccount.fetch(userAccount);
        return accountData;
    } catch (err) {
        console.log(err)
        return null;
    }
}

// CBS program
// Get infos from program account
// as infos, total deposited tokens' amount and the token amount to rent to user's wallet
export const readStateAccount = async (provider, stateAccount) => {
    try {
        anchor.setProvider(provider);

        // address of deployed program
        const programId = new PublicKey(idl.metadata.address);
    
        // Generate the program client from IDL.
        const program = new anchor.Program(idl, programId); 

        const accountData = await program.account.stateAccount.fetch(stateAccount);
        return accountData;
    } catch (err) {
        console.log(err)
        return null;
    }
}

// Auction program state account
export const readAuctionStateAccount = async (provider, auctionStateAccount) => {
    try {
        anchor.setProvider(provider);
        const programId = new PublicKey(auction_idl.metadata.address);

        const program = new anchor.Program(auction_idl, programId);
        const accountData = await program.account.auctionStateAccount.fetch(auctionStateAccount);
        return accountData;
    } catch (err) {
        console.log(err);
        return null;
    }
}

export const readAuctionUserAccount = async (provider, publicKey) => {
    try {
        anchor.setProvider(provider);

        // address of deployed program
        const programId = new PublicKey(auction_idl.metadata.address);
    
        // Generate the program client from IDL.
        const program = new anchor.Program(auction_idl, programId); 

        const [userAccount, bump] = await PublicKey.findProgramAddress(
            [Buffer.from(cbs_name), Buffer.from(publicKey.toBuffer())],
            programId
        );

        const accountData = await program.account.userStateAccount.fetch(userStateAccount);
        return accountData;
    } catch (err) {
        console.log(err);
        return null;
    }
}