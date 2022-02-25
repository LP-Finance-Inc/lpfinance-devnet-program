import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { CbsProtocal } from '../target/types/cbs_protocal';

describe('cbs-protocal', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.CbsProtocal as Program<CbsProtocal>;

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });
});
