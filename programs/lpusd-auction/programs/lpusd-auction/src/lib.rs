use anchor_lang::prelude::*;
// use pyth_client;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Transfer, Token, TokenAccount }
};

use cbs_protocol::cpi::accounts::LiquidateCollateral;
use cbs_protocol::program::CbsProtocol;
use cbs_protocol::{self, UserAccount, StateAccount};

// use lpfinance_swap::cpi::accounts::SwapSOLToToken;
// use lpfinance_swap::cpi::accounts::SwapTokenToToken;
use lpfinance_swap::program::LpfinanceSwap;
use lpfinance_swap::{self};

declare_id!("6KS4ho2CDvr7MGofHU6F6WJfQ5j6DL8nhBWJtkhMTzqt");

// const DOMINATOR:u64 = 100;
// const DOMINATOR_PRICE:u64 = 1000000;

#[program]
pub mod lpusd_auction {
    use super::*;
    pub fn initialize(
        ctx: Context<Initialize>,
        auction_name: String,
        bumps: AuctionBumps
    ) -> Result<()> {
        msg!("INITIALIZE Auction");

        let state_account = &mut ctx.accounts.state_account;

        let name_bytes = auction_name.as_bytes();
        let mut name_data = [b' '; 10];
        name_data[..name_bytes.len()].copy_from_slice(name_bytes);

        state_account.auction_name = name_data;
        state_account.bumps = bumps;
        state_account.btc_mint = ctx.accounts.btc_mint.key();
        state_account.usdc_mint = ctx.accounts.usdc_mint.key();
        state_account.lpusd_mint = ctx.accounts.lpusd_mint.key();
        state_account.lpsol_mint = ctx.accounts.lpsol_mint.key();
        state_account.pool_btc = ctx.accounts.pool_btc.key();
        state_account.pool_usdc = ctx.accounts.pool_usdc.key();
        state_account.pool_lpsol = ctx.accounts.pool_lpsol.key();
        state_account.pool_lpusd = ctx.accounts.pool_lpusd.key();

        state_account.lpusd_amount = 0;
        state_account.lpsol_amount = 0;
        state_account.sol_amount = 0;
        state_account.btc_amount = 0;
        state_account.usdc_amount = 0;
        state_account.reward_percent = 100;

        state_account.owner = ctx.accounts.authority.key();

        Ok(())
    }

    // Init user account
    pub fn init_user_account(
        ctx: Context<InitUserAccount>, 
        bump: u8
    ) -> Result<()> {
        // Make as 1 string for pubkey

        let user_account = &mut ctx.accounts.user_account;
        user_account.owner = ctx.accounts.user_authority.key();
        user_account.bump = bump;

        user_account.lpusd_amount = 0;
        user_account.discount_reward = 0;
        Ok(())
    }

    pub fn deposit_lpusd(
        ctx: Context<DepositLpUSD>,
        amount: u64
    ) -> Result<()> {
        msg!("UserLpUSD Balance: !!{:?}!!", ctx.accounts.user_lpusd.amount);

        if ctx.accounts.user_lpusd.amount < amount {
            return Err(ErrorCode::InsufficientAmount.into());
        }

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_lpusd.to_account_info(),
            to: ctx.accounts.pool_lpusd.to_account_info(),
            authority: ctx.accounts.user_authority.to_account_info()
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        let user_account = &mut ctx.accounts.user_account;
        user_account.lpusd_amount = user_account.lpusd_amount + amount;

        let state_account = &mut ctx.accounts.state_account;
        state_account.lpusd_amount = state_account.lpusd_amount + amount;
        
        msg!("Reward Percent: !!{:?}!!", state_account.reward_percent);

        // Need to calcuate discount of reward
        let discount_value = (state_account.reward_percent - 100) * amount;
        user_account.discount_reward = user_account.discount_reward + discount_value / 100;

        Ok(())
    }

    pub fn liquidate (
        ctx: Context<Liquidate>
    ) -> Result<()> {
        msg!("Started liquidate");
        let liquidator = &mut ctx.accounts.liquidator;

        // NOTE: NEED to validate if liquidate can be run. Mainly LTV > 94
        let borrowed_lpusd = liquidator.borrowed_lpusd;       
        // let borrowed_lpsol = liquidator.borrowed_lpsol;
        // let btc_amount = liquidator.btc_amount;
        // let sol_amount = liquidator.sol_amount;
        // let usdc_amount = liquidator.usdc_amount;
        // let lpsol_amount = liquidator.lpsol_amount;
        // let lpsol_amount = liquidator.lpsol_amount;

        // Stop all diposit and withdraw in cbs
        ctx.accounts.cbs_account.liquidation_run = true;

        if borrowed_lpusd > ctx.accounts.auction_account.lpusd_amount || borrowed_lpusd > ctx.accounts.auction_lpusd.amount {
            return Err(ErrorCode::InsufficientPoolAmount.into());            
        }

        let seeds = &[
            ctx.accounts.auction_account.auction_name.as_ref(),
            &[ctx.accounts.auction_account.bumps.state_account],
        ];
        let signer = &[&seeds[..]];

        // Transfer lpusd from auction to cbs
        if borrowed_lpusd > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.auction_lpusd.to_account_info(),
                to: ctx.accounts.cbs_lpusd.to_account_info(),
                authority: ctx.accounts.auction_account.to_account_info()
            };
    
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, borrowed_lpusd)?;
        }


        // Transfer all collaterals from cbs to auction
        {
            let cpi_program = ctx.accounts.cbs_program.to_account_info();
            let cpi_accounts = LiquidateCollateral {
                user_account: ctx.accounts.liquidator.to_account_info(),
                state_account: ctx.accounts.cbs_account.to_account_info(),
                auction_account: ctx.accounts.auction_account.to_account_info(),
                auction_lpusd: ctx.accounts.auction_lpusd.to_account_info(),
                auction_lpsol: ctx.accounts.auction_lpsol.to_account_info(),
                auction_btc: ctx.accounts.auction_btc.to_account_info(),
                auction_usdc: ctx.accounts.auction_usdc.to_account_info(),
                cbs_lpusd: ctx.accounts.cbs_lpusd.to_account_info(),
                cbs_lpsol: ctx.accounts.cbs_lpsol.to_account_info(),
                cbs_usdc: ctx.accounts.cbs_usdc.to_account_info(),
                cbs_btc: ctx.accounts.cbs_btc.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info()
            };
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            cbs_protocol::cpi::liquidate_collateral(cpi_ctx)?;
        }

        // LpSOL liquidate
        // if borrowed_lpsol > 0 {
        //     let pyth_price_info = &ctx.accounts.pyth_sol_account;
        //     let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        //     let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);
        //     let sol_price = pyth_price.agg.price as u64;

        //     let pyth_price_info = &ctx.accounts.pyth_usdc_account;
        //     let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        //     let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);
        //     let usdc_price = pyth_price.agg.price as u64;
            
        //     let borrowable_lpsol = sol_price / usdc_price * borrowed_lpsol;

        //     let cpi_program = ctx.accounts.swap_program.to_account_info();
        //     let cpi_accounts = SwapTokenToToken {
        //         user_authority: ctx.accounts.user_authority.to_account_info(),
        //         state_account: ctx.accounts.auction_account.to_account_info(),
        //         user_quote: ctx.accounts.auction_lpusd.to_account_info(),
        //         quote_pool: ctx.accounts.swap_lpusd.to_account_info(),
        //         quote_mint: ctx.accounts.lpusd_mint.to_account_info(),
        //         user_dest: ctx.accounts.auction_lpsol.to_account_info(),
        //         dest_mint: ctx.accounts.lpsol_mint.to_account_info(),
        //         dest_pool: ctx.accounts.cbs_lpsol.to_account_info(), 
        //         pyth_quote_account: ctx.accounts.pyth_usdc_account.to_account_info(),
        //         pyth_dest_account: ctx.accounts.pyth_sol_account.to_account_info(),
        //         system_program: ctx.accounts.system_program.to_account_info(),
        //         token_program: ctx.accounts.token_program.to_account_info(),
        //         rent: ctx.accounts.rent.to_account_info()
        //     };
        //     let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        //     cbs_protocol::cpi::swap_token_to_token(cpi_ctx, borrowable_lpsol)?;

        //     let cpi_accounts = Transfer {
        //         from: ctx.accounts.auction_lpusd.to_account_info(),
        //         to: ctx.accounts.cbs_lpusd.to_account_info(),
        //         authority: ctx.accounts.user_authority.to_account_info()
        //     };
    
        //     let cpi_program = ctx.accounts.token_program.to_account_info();
        //     let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        //     token::transfer(cpi_ctx, borrowable_lpsol)?;
        // }

        // let mut total_price = 0;
        // let mut usdc_price = 0;

        // if btc_amount > 0 {
        //     let pyth_price_info = &ctx.accounts.pyth_btc_account;
        //     let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        //     // let pyth_price = <pyth_client::Price>::try_from(pyth_price_data);
        //     let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);
            
        //     let btc_price = pyth_price.agg.price as u64 / DOMINATOR_PRICE;
        //     total_price += btc_price * liquidator.btc_amount;

        //     let cpi_program = ctx.accounts.cbs_program.to_account_info();
        //     let cpi_accounts = SwapTokenToToken {
        //         user_authority: ctx.accounts.user_authority.to_account_info(),
        //         state_account: ctx.accounts.auction_account.to_account_info(),
        //         user_quote: ctx.accounts.auction_btc.to_account_info(),
        //         quote_pool: ctx.accounts.swap_btc.to_account_info(),
        //         quote_mint: ctx.accounts.btc_mint.to_account_info(),
        //         pyth_btc_account: ctx.accounts.pyth_btc_account.to_account_info(),
        //         pyth_usdc_account: ctx.accounts.pyth_usdc_account.to_account_info(),
        //         pyth_sol_account: ctx.accounts.pyth_sol_account.to_account_info(),
        //         system_program: ctx.accounts.system_program.to_account_info(),
        //         token_program: ctx.accounts.token_program.to_account_info(),
        //         rent: ctx.accounts.rent.to_account_info()
        //     };
        //     let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        //     cbs_protocol::cpi::swap_token_to_token(cpi_ctx, btc_amount)?;
        // }

        // // SOL price
        // if sol_amount > 0 {

        //     let pyth_price_info = &ctx.accounts.pyth_sol_account;
        //     let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        //     let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        //     let sol_price = pyth_price.agg.price as u64 / DOMINATOR_PRICE;
        //     total_price += sol_price * liquidator.sol_amount;
        //     // LpSOL
        //     total_price += sol_price * liquidator.lpsol_amount ;

        //     let cpi_program = ctx.accounts.cbs_program.to_account_info();

        //     {
        //         let cpi_accounts = SwapSOLToToken {
        //             user_authority: ctx.accounts.user_authority.to_account_info(),
        //             state_account: ctx.accounts.auction_account.to_account_info(),
        //             user_dest: ctx.accounts.auction_lpsol.to_account_info(),
        //             dest_pool: ctx.accounts.swap_lpsol.to_account_info(),
        //             swap_pool: ctx.accounts.swap_lpsol.to_account_info(),
        //             dest_mint: ctx.accounts.lpsol_mint.to_account_info(),
        //             pyth_btc_account: ctx.accounts.pyth_btc_account.to_account_info(),
        //             pyth_usdc_account: ctx.accounts.pyth_usdc_account.to_account_info(),
        //             pyth_sol_account: ctx.accounts.pyth_sol_account.to_account_info(),
        //             system_program: ctx.accounts.system_program.to_account_info(),
        //             token_program: ctx.accounts.token_program.to_account_info(),
        //             rent: ctx.accounts.rent.to_account_info()
        //         };
        //         let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        //         cbs_protocol::cpi::swap_token_to_token(cpi_ctx, sol_amount)?;
        //     }
        //     {
        //         let cpi_accounts = SwapTokenToToken {
        //             user_authority: ctx.accounts.user_authority.to_account_info(),
        //             state_account: ctx.accounts.auction_account.to_account_info(),
        //             user_quote: ctx.accounts.auction_lpsol.to_account_info(),
        //             quote_pool: ctx.accounts.swap_lpsol.to_account_info(),
        //             quote_mint: ctx.accounts.lpsol_mint.to_account_info(),
        //             pyth_btc_account: ctx.accounts.pyth_btc_account.to_account_info(),
        //             pyth_usdc_account: ctx.accounts.pyth_usdc_account.to_account_info(),
        //             pyth_sol_account: ctx.accounts.pyth_sol_account.to_account_info(),
        //             system_program: ctx.accounts.system_program.to_account_info(),
        //             token_program: ctx.accounts.token_program.to_account_info(),
        //             rent: ctx.accounts.rent.to_account_info()
        //         };
        //         let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        //         cbs_protocol::cpi::swap_token_to_token(cpi_ctx, lpsol_amount)?;
        //     }
        // }

        // // USDC price
        // if usdc_amount > 0 {
        //     let pyth_price_info = &ctx.accounts.pyth_usdc_account;
        //     let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        //     let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        //     usdc_price = pyth_price.agg.price as u64 / DOMINATOR_PRICE;        
        //     total_price += usdc_price * usdc_amount;
        //     // LpUSDC
        //     total_price += usdc_price * lpusd_amount;

        //     let cpi_program = ctx.accounts.swap_program.to_account_info();
        //     let cpi_accounts = SwapTokenToToken {
        //         user_authority: ctx.accounts.user_authority.to_account_info(),
        //         state_account: ctx.accounts.auction_account.to_account_info(),
        //         user_quote: ctx.accounts.auction_usdc.to_account_info(),
        //         quote_pool: ctx.accounts.swap_usdc.to_account_info(),
        //         quote_mint: ctx.accounts.usdc_mint.to_account_info(),
        //         user_dest: ctx.accounts.auction_lpusd.to_account_info(),
        //         dest_pool: ctx.accounts.swap_lpusd.to_account_info(),
        //         dest_mint: ctx.accounts.lpusd_mint.to_account_info(),
        //         pyth_quote_account: ctx.accounts.pyth_usdc_account.to_account_info(),
        //         pyth_dest_account: ctx.accounts.pyth_usdc_account.to_account_info(),
        //         system_program: ctx.accounts.system_program.to_account_info(),
        //         token_program: ctx.accounts.token_program.to_account_info(),
        //         rent: ctx.accounts.rent.to_account_info()
        //     };
        //     let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        //     cbs_protocol::cpi::swap_token_to_token(cpi_ctx, usdc_amount)?;
        // }
   
        // let reward = total_price - borrowed_lpusd * usdc_price;
        
        // let auction_account = &mut ctx.accounts.auction_account;
        // let auction_total = usdc_price * auction_account.lpusd_amount;
        // let auction_percent = auction_account.reward_percent + reward * 100 / auction_total;

        // Make CBS working again
        ctx.accounts.cbs_account.liquidation_run = false;

        Ok(())
    }

    pub fn withdraw_lpusd(
        ctx: Context<WithdrawLpUSD>
    ) -> Result<()> {
        // NOTE: check if able to withdraw

        let user_account = &mut ctx.accounts.user_account;
        let state_account = &mut ctx.accounts.state_account;

        let total_withdrawable_amount = user_account.lpusd_amount * state_account.reward_percent / 100- user_account.discount_reward;

        if ctx.accounts.pool_lpusd.amount < total_withdrawable_amount {
            return Err(ErrorCode::InsufficientPoolAmount.into());
        }

        let seeds = &[
            ctx.accounts.state_account.auction_name.as_ref(),
            &[ctx.accounts.state_account.bumps.state_account],
        ];
        let signer = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_lpusd.to_account_info(),
            to: ctx.accounts.user_lpusd.to_account_info(),
            authority: ctx.accounts.state_account.to_account_info()
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, total_withdrawable_amount)?;
        
        let state_account = &mut ctx.accounts.state_account;
        state_account.lpusd_amount = state_account.lpusd_amount - user_account.lpusd_amount;

        // Init user account
        user_account.lpusd_amount = 0;
        user_account.discount_reward = 0;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(auction_name: String, bumps: AuctionBumps)]
pub struct Initialize <'info>{
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init,
        seeds = [auction_name.as_bytes()],
        bump,
        payer = authority
    )]
    pub state_account: Box<Account<'info, AuctionStateAccount>>,
    pub usdc_mint: Box<Account<'info, Mint>>,
    pub btc_mint: Box<Account<'info, Mint>>,
    pub lpusd_mint: Box<Account<'info,Mint>>,
    pub lpsol_mint: Box<Account<'info,Mint>>,
    // USDC POOL
    #[account(
        init,
        token::mint = usdc_mint,
        token::authority = state_account,
        seeds = [auction_name.as_bytes(), b"pool_usdc".as_ref()],
        bump,
        payer = authority
    )]
    pub pool_usdc: Account<'info, TokenAccount>,
    // BTC POOL
    #[account(
        init,
        token::mint = btc_mint,
        token::authority = state_account,
        seeds = [auction_name.as_bytes(), b"pool_btc".as_ref()],
        bump,
        payer = authority
    )]
    pub pool_btc: Account<'info, TokenAccount>,
    // LpUSD POOL
    #[account(
        init,
        token::mint = lpusd_mint,
        token::authority = state_account,
        seeds = [auction_name.as_bytes(), b"pool_lpusd".as_ref()],
        bump,
        payer = authority
    )]
    pub pool_lpusd: Account<'info, TokenAccount>,
    // LpSOL POOL
    #[account(
        init,
        token::mint = lpsol_mint,
        token::authority = state_account,
        seeds = [auction_name.as_bytes(), b"pool_lpsol".as_ref()],
        bump,
        payer = authority
    )]
    pub pool_lpsol: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct InitUserAccount<'info> {
    // State account for each user/wallet
    #[account(
        init,
        seeds = [state_account.auction_name.as_ref(), user_authority.key().as_ref()],
        bump,
        payer = user_authority
    )]
    pub user_account: Account<'info, UserStateAccount>,
    #[account(mut)]
    pub state_account: Box<Account<'info, AuctionStateAccount>>,
    // Contract Authority accounts
    #[account(mut)]
    pub user_authority: Signer<'info>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositLpUSD<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(
        mut,
        constraint = user_lpusd.owner == user_authority.key(),
        constraint = user_lpusd.mint == lpusd_mint.key()
    )]
    pub user_lpusd: Box<Account<'info, TokenAccount>>,
    pub lpusd_mint: Account<'info, Mint>,
    #[account(mut,
        seeds = [state_account.auction_name.as_ref()],
        bump = state_account.bumps.state_account
    )]
    pub state_account: Box<Account<'info, AuctionStateAccount>>,
    #[account(mut,
        seeds = [state_account.auction_name.as_ref(), b"pool_lpusd".as_ref()],
        bump = state_account.bumps.pool_lpusd
    )]
    pub pool_lpusd: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = user_account.owner == user_authority.key()
    )]
    pub user_account: Box<Account<'info, UserStateAccount>>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct Liquidate<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(mut)]
    pub auction_account: Box<Account<'info, AuctionStateAccount>>,
    // UserAccount from CBS protocol
    #[account(mut)]
    pub liquidator: Box<Account<'info, UserAccount>>,
    #[account(mut)]
    pub cbs_account: Box<Account<'info, StateAccount>>,
    pub cbs_program: Program<'info, CbsProtocol>,
    pub swap_program: Program<'info, LpfinanceSwap>,
    pub swap_lpusd: Account<'info, TokenAccount>,
    pub swap_lpsol: Account<'info, TokenAccount>,
    pub swap_btc: Account<'info, TokenAccount>,
    pub swap_usdc: Account<'info, TokenAccount>,

    #[account(mut)]
    pub btc_mint: Account<'info,Mint>,
    #[account(mut)]
    pub usdc_mint: Account<'info,Mint>,
    #[account(mut)]
    pub lpsol_mint: Account<'info,Mint>,
    #[account(mut)]
    pub lpusd_mint: Account<'info,Mint>,

    pub auction_lpusd: Account<'info, TokenAccount>,
    pub auction_lpsol: Account<'info, TokenAccount>,
    pub auction_btc: Account<'info, TokenAccount>,
    pub auction_usdc: Account<'info, TokenAccount>,
    pub cbs_lpusd: Account<'info, TokenAccount>,
    pub cbs_lpsol: Account<'info, TokenAccount>,
    pub cbs_usdc: Account<'info, TokenAccount>,
    pub cbs_btc: Account<'info, TokenAccount>,
    // pyth
    pub pyth_btc_account: AccountInfo<'info>,
    pub pyth_usdc_account: AccountInfo<'info>,
    pub pyth_sol_account: AccountInfo<'info>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct WithdrawLpUSD<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(
        mut,
        constraint = user_lpusd.owner == user_authority.key(),
        constraint = user_lpusd.mint == lpusd_mint.key()
    )]
    pub user_lpusd: Box<Account<'info, TokenAccount>>,
    pub lpusd_mint: Account<'info, Mint>,
    #[account(mut,
        seeds = [state_account.auction_name.as_ref()],
        bump = state_account.bumps.state_account
    )]
    pub state_account: Box<Account<'info, AuctionStateAccount>>,
    #[account(mut,
        seeds = [state_account.auction_name.as_ref(), b"pool_lpusd".as_ref()],
        bump = state_account.bumps.pool_lpusd
    )]
    pub pool_lpusd: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = user_account.owner == user_authority.key()
    )]
    pub user_account: Box<Account<'info, UserStateAccount>>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

#[account]
#[derive(Default)]
pub struct UserStateAccount {
    // deposited lpusd
    // NOTE: only lpusd is able to be deposited
    pub lpusd_amount: u64,
    pub owner: Pubkey,
    pub bump: u8,
    // discount amount while withdraw
    pub discount_reward: u64
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct AuctionBumps{
    pub state_account: u8,
    pub pool_usdc: u8,
    pub pool_btc: u8,
    pub pool_lpusd: u8,
    pub pool_lpsol: u8,
}

#[account]
#[derive(Default)]
pub struct AuctionStateAccount {
    pub auction_name: [u8; 10],
    pub bumps: AuctionBumps,
    pub owner: Pubkey,
    pub lpsol_mint: Pubkey,
    pub lpusd_mint: Pubkey,
    pub btc_mint: Pubkey,
    pub usdc_mint: Pubkey,
    pub pool_btc: Pubkey,
    pub pool_usdc: Pubkey,
    pub pool_lpsol: Pubkey,
    pub pool_lpusd: Pubkey,
    pub lpusd_amount: u64,
    pub lpsol_amount: u64,
    pub sol_amount: u64,
    pub btc_amount: u64,
    pub usdc_amount: u64,
    pub reward_percent: u64,
    pub reward_denominator: u64
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient User's Amount")]
    InsufficientAmount,
    #[msg("Insufficient Pool's Amount")]
    InsufficientPoolAmount
}