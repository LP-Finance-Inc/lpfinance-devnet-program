use anchor_lang::prelude::*;
use std::ops::DerefMut;

declare_id!("CaBy6Mh16bVQpnqY7Crt13hU4Zyv8QbW55GfTvVFwxYh");

const MAX_LEN: usize = 5000;

#[program]
pub mod lpfinance_accounts {
    use super::*;
    pub fn initialize(
        ctx: Context<Initialize>,
        cbsprogram: Pubkey
    ) -> Result<()> {
        msg!("INITIALIZE PROGRAM");
        let config_account = &mut ctx.accounts.config;
        config_account.authority = ctx.accounts.authority.key();
        config_account.whitelist = ctx.accounts.whitelist.key();
        config_account.counter = 0;
        config_account.whitelist_on = true;
        config_account.cbsprogram = cbsprogram;

        // first: init the whitelist data account
        let mut whitelist = ctx.accounts.whitelist.load_init()?;
        let data = whitelist.deref_mut();
        data.addresses = [Pubkey::default(); MAX_LEN];

        Ok(())
    }

    pub fn add_whitelist_addresses(
        ctx: Context<AddWhiteListAddresses>,
        addresses: Vec<Pubkey>
    ) -> Result<()> {
        msg!("ADD WALLET");
        let config = &mut ctx.accounts.config;
        let mut whitelist = ctx.accounts.whitelist.load_mut()?;
        
        if !config.whitelist.eq(&ctx.accounts.whitelist.key()){
            msg!("Wrong whitelist: {}", &ctx.accounts.whitelist.key());
            return Err(ErrorCode::WrongWhiteList.into());
        }

        let length = addresses.len();
        let counter = config.counter as usize;

        // Check that new addresses don't exceed remaining space
        if length + counter > MAX_LEN {
            return Err(ErrorCode::NotEnoughSpace.into());
        }        

        msg!("counter: {}", counter);
        for i in 0..length {
            if whitelist.addresses.contains(&addresses[i]) {
                return Err(ErrorCode::AlreadyExist.into());
            }
            whitelist.addresses[counter + i] = addresses[i];
        }

        config.counter = counter as u16 + addresses.len() as u16;
        msg!("new counter: {}", config.counter);

        Ok(())
    }

    pub fn add_from_cbs_program(
        ctx: Context<AddFromCbsProgram>,
        address: Pubkey
    ) -> Result<()> {
        msg!("ADD WALLET FROM CBS");
        let config = &mut ctx.accounts.config;
        let mut whitelist = ctx.accounts.whitelist.load_mut()?;
        
        if !config.whitelist.eq(&ctx.accounts.whitelist.key()){
            msg!("Wrong whitelist: {}", &ctx.accounts.whitelist.key());
            return Err(ErrorCode::WrongWhiteList.into());
        }

        let counter = config.counter as usize;

        // Check that new addresses don't exceed remaining space
        if 1 + counter > MAX_LEN {
            return Err(ErrorCode::NotEnoughSpace.into());
        }        

        if whitelist.addresses.contains(&address) {
            return Err(ErrorCode::AlreadyExist.into());
        }
        whitelist.addresses[counter + 1] = address;

        config.counter = counter as u16 + 1;
        msg!("new counter: {}", config.counter);

        Ok(())
    }
}


#[derive(Accounts)]
pub struct Initialize<'info> {
    // Token program owner
    #[account(mut)]
    pub authority: Signer<'info>,
    // State Accounts
    #[account(init,
        payer = authority
    )]
    pub config: Box<Account<'info, Config>>,
    #[account(zero)]
    whitelist: AccountLoader<'info, WhiteList>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}

#[account]
#[derive(Default)]
pub struct Config {
    whitelist_on: bool,
    authority: Pubkey,
    whitelist: Pubkey,
    cbsprogram: Pubkey,
    counter: u16
}

#[derive(Accounts)]
pub struct AddWhiteListAddresses<'info> {
    #[account(mut, has_one = authority)]
    config: Account<'info, Config>,
    #[account(mut)]
    whitelist: AccountLoader<'info, WhiteList>,
    authority: Signer<'info>
}

#[derive(Accounts)]
pub struct AddFromCbsProgram<'info> {
    #[account(mut, has_one = cbsprogram)]
    config: Account<'info, Config>,
    #[account(mut)]
    whitelist: AccountLoader<'info, WhiteList>,
    cbsprogram: AccountInfo<'info>
}

#[account(zero_copy)]
pub struct WhiteList {
    pub addresses: [Pubkey; 5000]
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid Amount")]
    InvalidAmount,
    #[msg("Wrong whitelist")]
    WrongWhiteList,
    #[msg("Not enough space left in whitelist!")]
    NotEnoughSpace,
    #[msg("Address already exist")]
    AlreadyExist
}