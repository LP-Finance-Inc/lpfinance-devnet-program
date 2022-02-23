use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, program::invoke_signed, system_instruction };
use anchor_spl::token::{self, CloseAccount, Mint, SetAuthority, MintTo, TokenAccount, Transfer};
use pyth_client;
use std::mem::size_of;
use tokens::{self, token_mint_to, token_burn, token_transfer, TokenMintTo };

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Mainnet-beta data
const BTC_MINT:Pubkey = new Pubkey('9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E');
const USDC_MINT:Pubkey = new Pubkey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const LpSOL_MINT:Pubkey = new Pubkey('9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E');
const LpUSD_MINT:Pubkey = new Pubkey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

const LTV:u64 = 85;
const DOMINATOR:u64 = 100;

#[program]
pub mod oracle {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }

    pub fn deposit_collateral(
        ctx: Context<DepositCollateral>,
        amount: u64
    )-> ProgramResult {
        msg!("Deposit BTC");
        
        if ctx.accounts.user_collateral.amount < amount {
            return Err(ErrorCode::InsufficientAmount.into());
        }

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_collateral.to_account_info(),
            to: ctx.accounts.collateral_pool.to_account_info(),
            authority: ctx.accounts.user_authority.to_account_info()
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount);

        let user_account =&mut ctx.accounts.user_account;

        if ctx.accounts.user_collateral.mint == BTC_MINT {
            user_account.btc_amount = user_account.btc_amount + amount;
        }

        if ctx.accounts.user_collateral.mint == USDC_MINT {
            user_account.usdc_amount = user_account.usdc_amount + amount;
        }

        if ctx.accounts.user_collateral.mint == LpUSD_MINT {
            user_account.lpusd_amount = user_account.lpusd_amount + amount;
        }

        if ctx.accounts.user_collateral.mint == LpSOL_MINT {
            user_account.lpsol_amount = user_account.lpsol_amount + amount;
        }

        Ok(())
    }

    pub fn deposit_sol(
        ctx: Context<DepositSOL>,
        amount: u64
    ) -> ProgramResult {
        msg!("Deposit SOL");

        if **ctx.accounts.user_signer.lamports.borrow() < amount {
            msg!("Insufficient SOL");
            return;
        }

        invoke(
            &system_instruction::transfer(
                ctx.accounts.user_signer.key,
                ctx.accounts.collateral_pool.key,
                amount
            ),
            &[
                ctx.accounts.user_signer.to_account_info().clone(),
                ctx.accounts.collateral_pool.clone(),
                ctx.accounts.system_program.clone()
            ]
        )?;

        let user_account = &mut ctx.accounts.user_account;
        user_account.sol_amount = user_account.sol_amount + amount;

        Ok(())
    }

    pub fn borrow_lpusd(
        ctx: Context<BorrowLpToken>,
        amount: u64
    ) -> ProgramResult {
        msg!("Borrow LpUSD");

        // Borrowable TotalPrice. Need to be calculated with LTV
        let &mut total_price = 0;
        let user_account = &mut ctx.accounts.user_account;

        // BTC price
        let pyth_price_info = &ctx.accounts.pyth_btc_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let btc_price = pyth_price.agg.price as u64;

        total_price += btc_price * user_account.btc_amount * LTV / DOMINATOR;

        // SOL price
        let pyth_price_info = &ctx.accounts.pyth_sol_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let sol_price = pyth_price.agg.price as u64;

        total_price += sol_price * user_account.sol_amount * LTV / DOMINATOR;

        // USDC price
        let pyth_price_info = &ctx.accounts.pyth_usdc_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let usdc_price = pyth_price.agg.price as u64;
        // We think LTV as 100% because of same kind of assets
        total_price += usdc_price * user_account.usdc_amount;

        // LpUSD price
        // We think LTV as 100% because of same kind of assets
        let lpusd_price = usdc_price;        
        total_price += lpusd_price * user_account.lpusd_amount;

        // LpBTC price
        let lpsol_price = btc_price;
        total_price += lpsol_price * user_account.lpsol_amount * LTV / DOMINATOR;

        let &mut borrow_value = lpusd_price * amount;
        if total_price > borrow_value {
            // Mint
            let cpi_program = ctx.accounts.tokens_program.to_account_info();
            let cpi_accounts = TokenMintTo {

            }
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            tokens::cpi::token_mint_to(cpi_context, amount);

            // LpUSD
            if user_account.lpusd_amount > 0 && borrow_value  > 0 {
                if lpusd_price * user_account.lpusd_amount >= borrow_value {
                    user_account.lpusd_amount = user_account.lpusd_amount - borrow_value / lpusd_price;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - lpusd_price * user_account.lpusd_amount;
                    user_account.lpusd_amount = 0;
                }
                // Burn with repayment
            }

            // LpSOL
            if user_account.lpsol_amount > 0 && borrow_value  > 0 {
                if lpsol_price * user_account.lpsol_amount >= borrow_value * DOMINATOR / LTV {
                    user_account.lpsol_amount = user_account.lpsol_amount - borrow_value / lpsol_price  * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - lpsol_price * user_account.lpsol_amount * LTV / DOMINATOR;
                    user_account.lpsol_amount = 0;
                }
            }

            // UDSC
            if user_account.usdc_amount > 0 && borrow_value  > 0 {
                if usdc_price * user_account.usdc_amount >= borrow_value {
                    user_account.usdc_amount = user_account.usdc_amount - borrow_value / usdc_price;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - usdc_price * user_account.usdc_amount;
                    user_account.usdc_amount = 0;
                }
            }

            // SOL
            if user_account.sol_amount > 0 && borrow_value  > 0 {
                if sol_price * user_account.sol_amount >= borrow_value * DOMINATOR / LTV {
                    user_account.sol_amount = user_account.sol_amount - borrow_value / sol_price * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - sol_price * user_account.sol_amount* LTV / DOMINATOR;
                    user_account.sol_amount = 0;
                }
            }

            // BTC
            if user_account.btc_amount > 0 && borrow_value  > 0 {
                if btc_price * user_account.btc_amount >= borrow_value * DOMINATOR / LTV {
                    user_account.btc_amount = user_account.btc_amount - borrow_value / btc_price * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - btc_price * user_account.btc_amount;
                    user_account.btc_amount = 0;
                }
            }
        }
    }

    pub fn borrow_lpsol(
        ctx: Context<BorrowLpToken>,
        amount: u64
    ) -> ProgramResult {
        msg!("Borrow LpBTC");

        // Borrowable TotalPrice. Need to be calculated with LTV
        let &mut total_price = 0;
        let user_account = &mut ctx.accounts.user_account;

        // BTC price
        let pyth_price_info = &ctx.accounts.pyth_btc_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let btc_price = pyth_price.agg.price as u64;

        total_price += btc_price * user_account.btc_amount;

        // SOL price
        let pyth_price_info = &ctx.accounts.pyth_sol_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let sol_price = pyth_price.agg.price as u64;

        total_price += sol_price * user_account.sol_amount * LTV / DOMINATOR;

        // USDC price
        let pyth_price_info = &ctx.accounts.pyth_usdc_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let usdc_price = pyth_price.agg.price as u64;
        // We think LTV as 100% because of same kind of assets
        total_price += usdc_price * user_account.usdc_amount * LTV / DOMINATOR;

        // LpUSD price
        // We think LTV as 100% because of same kind of assets
        let lpusd_price = usdc_price;        
        total_price += lpusd_price * user_account.lpusd_amount * LTV / DOMINATOR;

        // LpBTC price
        let lpsol_price = btc_price;
        total_price += lpsol_price * user_account.lpsol_amount;

        let &mut borrow_value = lpsol_price * amount;

        if total_price > borrow_value {
            // Mint
            let cpi_program = ctx.accounts.tokens_program.to_account_info();
            let cpi_accounts = TokenMintTo {

            }
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            tokens::cpi::token_mint_to(cpi_context, amount);

            // LpUSD
            if user_account.lpusd_amount > 0 && borrow_value  > 0 {
                if lpusd_price * user_account.lpusd_amount >= borrow_value * DOMINATOR / LTV {
                    user_account.lpusd_amount = user_account.lpusd_amount - borrow_value / lpusd_price * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - lpusd_price * user_account.lpusd_amount * LTV / DOMINATOR;
                    user_account.lpusd_amount = 0;
                }
                // Burn with repayment
            }

            // LpSOL
            if user_account.lpsol_amount > 0 && borrow_value  > 0 {
                if lpsol_price * user_account.lpsol_amount >= borrow_value {
                    user_account.lpsol_amount = user_account.lpsol_amount - borrow_value / lpsol_price;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - lpsol_price * user_account.lpsol_amount;
                    user_account.lpsol_amount = 0;
                }
            }

            // UDSC
            if user_account.usdc_amount > 0 && borrow_value  > 0 {
                if usdc_price * user_account.usdc_amount >= borrow_value * DOMINATOR / LTV {
                    user_account.usdc_amount = user_account.usdc_amount - borrow_value / usdc_price * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - usdc_price * user_account.usdc_amount * LTV / DOMINATOR;
                    user_account.usdc_amount = 0;
                }
            }

            // SOL
            if user_account.sol_amount > 0 && borrow_value  > 0 {
                if sol_price * user_account.sol_amount >= borrow_value {
                    user_account.sol_amount = user_account.sol_amount - borrow_value / sol_price * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - sol_price * user_account.sol_amount * LTV / DOMINATOR;
                    user_account.sol_amount = 0;
                }
            }

            // BTC
            if user_account.btc_amount > 0 && borrow_value  > 0 {
                if btc_price * user_account.btc_amount >= borrow_value  * DOMINATOR / LTV {
                    user_account.btc_amount = user_account.btc_amount - borrow_value / btc_price * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - btc_price * user_account.btc_amount * LTV / DOMINATOR;
                    user_account.btc_amount = 0;
                }
            }
        }        
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[account]
#[derive(Default)]
pub struct UserAccount {
    pub btc_amount: u64,
    pub sol_amount: u64,
    pub usdc_amount: u64,
    pub lpsol_amount: u64,
    pub lpusd_amount: u64,
    pub owner: Pubkey
}

#[account]
#[derive(Default)]
pub struct StateAccount {
    pub bumps: PoolBumps,
    pub pool_title: String
}

#[derive(Accounts)]
#[instruction(bump: u8, seed0: String, seed1: String)]
pub struct SetUserAccount<'info> {
    // State account for each user/wallet
    #[account(
        init,
        seeds = [state_account.pool_title.as_ref(), seed0.as_ref(), seed1.as_ref()],
        bump = bump,
        payer = user_authority
    )]
    pub user_account: Account<'info, UserAccount>,
    pub state_account: Account<'info, StateAccount>,
    // Contract Authority accounts
    #[account(mut)]
    pub user_authority: Signer<'info>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(bumps: PoolBumps)]
pub struct DepositCollateral<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(
        mut,
        constraint = user_collateral.owner == user_authority.key(),
        constraint = user_collateral.mint == collateral_mint.key()
    )]
    pub user_collateral : Account<'info,TokenAccount>,
    #[account(mut)]
    pub collateral_mint: Account<'info,Mint>,
    // state account for user's wallet
    #[account(mut,
        seeds = [state_account.pool_title.as_ref().trim_ascii_whitespace()],
        bump= state_account.bumps.state_account
    )]
    pub state_account: Box<Account<'info, StateAccount>>,
    #[account(
        mut,
        seeds = [state_account.pool_title.as_ref().trim_ascii_whitespace(), b"collateral_pool".as_ref()],
        bump = state_account.bumps.collateral_pool)]
    pub collateral_pool: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_account.owner == user_authority.key()
    )]
    pub user_account: Box<Account<'info, UserAccount>>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
#[instruction(bumps: PoolBumps)]
pub struct DepositSOL<'info> {
    #[account(mut)]
    pub user_signer: Signer<'info>,
    #[account(mut,
        seeds = [state_account.pool_title.as_ref().trim_ascii_whitespace()],
        bump= state_account.bumps.state_account
    )]
    pub state_account: Box<Account<'info, StateAccount>>,
    // state account for user's wallet
    #[account(
        mut,
        constraint = user_account.owner == user_signer.key()
    )]
    pub user_account: Box<Account<'info, UserAccount>>,
    #[account(
        mut,
        seeds = [state_account.pool_title.as_ref().trim_ascii_whitespace(), b"collateral_pool".as_ref()],
        bump = state_account.bumps.collateral_pool)]
    pub collateral_pool: Account<'info, TokenAccount>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct BorrowLpToken<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    // state account for user's wallet
    #[account(
        mut,
        constraint = user_account.owner == user_authority.key()
    )]
    pub user_account: Box<Account<'info, UserAccount>>,
    pub pyth_btc_account: AccountInfo<'info>,
    pub pyth_usdc_account: AccountInfo<'info>,
    pub pyth_sol_account: AccountInfo<'info>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct PoolBumps{
    pub state_account: u8,
    pub collateral_pool: u8
}

#[error]
pub enum ErrorCode {
    #[msg("Insufficient Amount")]
    InsufficientAmount
}