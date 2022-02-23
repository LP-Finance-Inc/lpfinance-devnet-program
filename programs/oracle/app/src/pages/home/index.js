import React from 'react'
import { BorrowComponent } from '../../components';
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton,
} from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'

export default function Home() {    
    const wallet = useWallet()
    const { publicKey } = wallet;
    console.log("Connected wallet", publicKey)
    
    return (
        <div>
            CBS Protocal
            <WalletModalProvider>
                {
                    publicKey ? 
                        <div>
                            <BorrowComponent /> 
                            <WalletDisconnectButton /> 
                        </div>
                    :
                        <WalletMultiButton />
                        
                }
            </WalletModalProvider>                
        </div>
    )
}
