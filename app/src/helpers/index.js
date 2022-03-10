import * as anchor from '@project-serum/anchor';
import idl from '../idls/cbs_protocol.json';
import { NETWORK, cbs_name } from '../constants';
const { PublicKey, Connection } = anchor.web3;

export const convert_to_wei = (val) => (parseFloat(val) * 1e9).toString();
export const convert_from_wei = (val) => parseFloat(val) / 1e9; 

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