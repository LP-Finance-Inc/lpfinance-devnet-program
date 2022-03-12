import React from 'react'
import { BorrowComponent, Swap, Liqudate } from '../../components';
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
            <h1>Lp-finance</h1>
            <WalletModalProvider>
                {
                    publicKey ? 
                        <div>
                            <BorrowComponent /> 
                            <Swap />
                            <Liqudate />
                            <WalletDisconnectButton /> 
                        </div>
                    :
                        <WalletMultiButton />
                        
                }
            </WalletModalProvider>                
        </div>
    )
}
