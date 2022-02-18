import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Oracle } from '../target/types/oracle';

describe('oracle', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Oracle as Program<Oracle>;

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });
});
