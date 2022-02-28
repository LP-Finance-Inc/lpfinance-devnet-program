use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction };
use pyth_client;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Transfer, Token, TokenAccount }
};
declare_id!("3YhaNLN3oYUaAXjK9yRqVVNUYhqPsVqB5q9GEJ1vWcTM");

const LP_TOKEN_DECIMALS: u8 = 9;

const LTV:u64 = 85;
const DOMINATOR:u64 = 100;

#[program]
pub mod cbs_protocol {
    use super::*;
    pub fn initialize(
        ctx: Context<Initialize>,
        protocol_name: String,
        bumps: ProtocolBumps,
    ) -> Result<()> {
        msg!("INITIALIZE PROTOCAL");

        let state_account = &mut ctx.accounts.state_account;

        let name_bytes = protocol_name.as_bytes();
        let mut name_data = [b' '; 10];
        name_data[..name_bytes.len()].copy_from_slice(name_bytes);

        state_account.protocol_name = name_data;
        state_account.bumps = bumps;
        state_account.btc_mint = ctx.accounts.btc_mint.key();
        state_account.usdc_mint = ctx.accounts.usdc_mint.key();
        state_account.lpusd_mint = ctx.accounts.lpusd_mint.key();
        state_account.lpsol_mint = ctx.accounts.lpsol_mint.key();
        state_account.pool_btc = ctx.accounts.pool_btc.key();
        state_account.pool_usdc = ctx.accounts.pool_usdc.key();
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
        Ok(())
    }

    pub fn deposit_collateral(
        ctx: Context<DepositCollateral>,
        amount: u64
    )-> Result<()> {
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
        token::transfer(cpi_ctx, amount)?;

        let user_account =&mut ctx.accounts.user_account;

        if ctx.accounts.user_collateral.mint == ctx.accounts.state_account.btc_mint {
            user_account.btc_amount = user_account.btc_amount + amount;
        }

        if ctx.accounts.user_collateral.mint == ctx.accounts.state_account.usdc_mint {
            user_account.usdc_amount = user_account.usdc_amount + amount;
        }

        if ctx.accounts.user_collateral.mint == ctx.accounts.state_account.lpusd_mint {
            user_account.lpusd_amount = user_account.lpusd_amount + amount;
        }

        if ctx.accounts.user_collateral.mint == ctx.accounts.state_account.lpsol_mint {
            user_account.lpsol_amount = user_account.lpsol_amount + amount;
        }

        Ok(())
    }

    pub fn deposit_sol(
        ctx: Context<DepositSOL>,
        amount: u64
    ) -> Result<()> {
        msg!("Deposit SOL");

        if **ctx.accounts.user_authority.lamports.borrow() < amount {
            return Err(ErrorCode::InsufficientAmount.into());
        }

        invoke(
            &system_instruction::transfer(
                ctx.accounts.user_authority.key,
                ctx.accounts.state_account.to_account_info().key,
                amount
            ),
            &[
                ctx.accounts.user_authority.to_account_info().clone(),
                ctx.accounts.state_account.to_account_info().clone(),
                ctx.accounts.system_program.to_account_info().clone()
            ]
        )?;

        let user_account = &mut ctx.accounts.user_account;
        user_account.sol_amount = user_account.sol_amount + amount;

        Ok(())
    }

    pub fn borrow_lptoken(
        ctx: Context<BorrowLpToken>,
        islpusd: bool,
        amount: u64
    ) -> Result<()> {
        msg!("Borrow LpToken");

        // Borrowable TotalPrice. Need to be calculated with LTV
        let mut total_price = 0;
        let user_account = &mut ctx.accounts.user_account;

        // BTC price
        let pyth_price_info = &ctx.accounts.pyth_btc_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        // let pyth_price = <pyth_client::Price>::try_from(pyth_price_data);
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);
        
        let btc_price = pyth_price.agg.price as u64;
        total_price += btc_price * user_account.btc_amount;

        // SOL price
        let pyth_price_info = &ctx.accounts.pyth_sol_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let sol_price = pyth_price.agg.price as u64;
        total_price += sol_price * user_account.sol_amount;

        // USDC price
        let pyth_price_info = &ctx.accounts.pyth_usdc_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let usdc_price = pyth_price.agg.price as u64;        
        total_price += usdc_price * user_account.usdc_amount;

        // LpUSD price
        let lpusd_price = usdc_price;        
        total_price += lpusd_price * user_account.lpusd_amount;

        // LpSOL price
        let lpsol_price = sol_price;
        total_price += lpsol_price * user_account.lpsol_amount ;

        let mut borrow_value = amount;
        msg!("Request amount: !!{:?}!!", amount.to_string());
        if islpusd {
            borrow_value = borrow_value * lpusd_price;
        } else {
            borrow_value = borrow_value * lpsol_price;
        }

        msg!("Price SOL: !!{:?}!!", sol_price.to_string());
        msg!("Price USDC: !!{:?}!!", usdc_price.to_string());
        msg!("Price BTC: !!{:?}!!", btc_price.to_string());

        msg!("Borrow Value: !!{:?}!!", borrow_value.to_string());
        msg!("Total Value: !!{:?}!!", total_price.to_string());

        if total_price * LTV / DOMINATOR > borrow_value {
            // Mint
            let seeds = &[
                ctx.accounts.state_account.protocol_name.as_ref(),
                &[ctx.accounts.state_account.bumps.state_account]
            ];
            let signer = &[&seeds[..]];
            let cpi_accounts = MintTo {
                mint: ctx.accounts.collateral_mint.to_account_info(),
                to: ctx.accounts.user_collateral.to_account_info(),
                authority: ctx.accounts.state_account.to_account_info(),
            };

            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

            token::mint_to(cpi_ctx, amount)?;

            // LpUSD
            if user_account.lpusd_amount > 0 && borrow_value  > 0 {
                if lpusd_price * user_account.lpusd_amount >= borrow_value * DOMINATOR / LTV {
                    user_account.lpusd_amount = user_account.lpusd_amount - borrow_value / lpusd_price * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - lpusd_price * user_account.lpusd_amount * LTV / DOMINATOR;
                    user_account.lpusd_amount = 0;
                }
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
                if usdc_price * user_account.usdc_amount >= borrow_value * DOMINATOR / LTV  {
                    user_account.usdc_amount = user_account.usdc_amount - borrow_value / usdc_price * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - usdc_price * user_account.usdc_amount * LTV / DOMINATOR;
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
        } else {
            return Err(ErrorCode::BorrowExceed.into());
        }

        msg!("LeftCash: !!{:?}!!", borrow_value.to_string());
        if borrow_value > 0 {
            return Err(ErrorCode::BorrowFailed.into());
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(protocol_name: String, bumps: ProtocolBumps)]
pub struct Initialize<'info> {
    // Token program authority
    #[account(mut)]
    pub authority: Signer<'info>,
    // State Accounts
    #[account(init,
        seeds = [protocol_name.as_bytes()],
        bump,
        payer = authority
    )]
    pub state_account: Box<Account<'info, StateAccount>>,
    
    pub usdc_mint: Box<Account<'info, Mint>>,
    pub btc_mint: Box<Account<'info, Mint>>,
    // USDC POOL
    #[account(
        init,
        token::mint = usdc_mint,
        token::authority = state_account,
        seeds = [protocol_name.as_bytes(), b"pool_usdc".as_ref()],
        bump,
        payer = authority
    )]
    pub pool_usdc: Account<'info, TokenAccount>,
    // BTC POOL
    #[account(
        init,
        token::mint = usdc_mint,
        token::authority = state_account,
        seeds = [protocol_name.as_bytes(), b"pool_btc".as_ref()],
        bump,
        payer = authority
    )]
    pub pool_btc: Account<'info, TokenAccount>,
    #[account(init,
        mint::decimals = LP_TOKEN_DECIMALS,
        mint::authority = state_account,
        seeds = [protocol_name.as_bytes(), b"lpsol_mint".as_ref()],
        bump,
        payer = authority
    )]
    pub lpsol_mint: Box<Account<'info, Mint>>,

    #[account(init,
        mint::decimals = LP_TOKEN_DECIMALS,
        mint::authority = state_account,
        seeds = [protocol_name.as_bytes(), b"lpusd_mint".as_ref()],
        bump,
        payer = authority
    )]
    pub lpusd_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}


#[derive(Accounts)]
#[instruction(bumps: ProtocolBumps, pool_bump: u8, pool_seed: String)]
pub struct DepositCollateral<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(
        mut,
        constraint = user_collateral.owner == user_authority.key(),
        constraint = user_collateral.mint == collateral_mint.key()
    )]
    pub user_collateral : Box<Account<'info,TokenAccount>>,
    #[account(mut)]
    pub collateral_mint: Account<'info,Mint>,
    // state account for user's wallet
    #[account(mut,
        seeds = [state_account.protocol_name.as_ref()],
        bump= state_account.bumps.state_account
    )]
    pub state_account: Box<Account<'info, StateAccount>>,
    #[account(
        mut,
        seeds = [state_account.protocol_name.as_ref(), pool_seed.as_ref()],
        bump = pool_bump)]
    pub collateral_pool: Box<Account<'info, TokenAccount>>,
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
#[instruction(bumps: ProtocolBumps)]
pub struct DepositSOL<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(mut,
        seeds = [state_account.protocol_name.as_ref()],
        bump= state_account.bumps.state_account
    )]
    pub state_account: Box<Account<'info, StateAccount>>,
    // state account for user's wallet
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
pub struct BorrowLpToken<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    // state account for user's wallet
    #[account(
        mut,
        constraint = user_account.owner == user_authority.key()
    )]
    pub user_account: Box<Account<'info, UserAccount>>,
    #[account(mut,
        seeds = [state_account.protocol_name.as_ref()],
        bump= state_account.bumps.state_account
    )]
    pub state_account: Box<Account<'info, StateAccount>>,
    #[account(
        mut,
        constraint = user_collateral.owner == user_authority.key(),
        constraint = user_collateral.mint == collateral_mint.key()
    )]
    pub user_collateral : Box<Account<'info,TokenAccount>>,
    #[account(mut)]
    pub collateral_mint: Account<'info,Mint>,
    pub pyth_btc_account: AccountInfo<'info>,
    pub pyth_usdc_account: AccountInfo<'info>,
    pub pyth_sol_account: AccountInfo<'info>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct InitUserAccount<'info> {
    // State account for each user/wallet
    #[account(
        init,
        seeds = [state_account.protocol_name.as_ref(), user_authority.key().as_ref()],
        bump,
        payer = user_authority
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(init,
        payer = user_authority,
        associated_token::mint = lpusd_mint,
        associated_token::authority = user_authority,
        space = 8 + 42
    )]
    pub user_lpusd: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub lpusd_mint: Account<'info,Mint>,
    #[account(init,
        payer = user_authority,
        associated_token::mint = lpsol_mint,
        associated_token::authority = user_authority,
        space = 8 + 42
    )]
    pub user_lpsol: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub lpsol_mint: Account<'info,Mint>,
    #[account(mut)]
    pub state_account: Box<Account<'info, StateAccount>>,
    // Contract Authority accounts
    #[account(mut)]
    pub user_authority: Signer<'info>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
#[derive(Default)]
pub struct StateAccount {
    pub protocol_name: [u8; 10],
    pub bumps: ProtocolBumps,
    pub owner: Pubkey,
    pub lpsol_mint: Pubkey,
    pub lpusd_mint: Pubkey,
    pub btc_mint: Pubkey,
    pub usdc_mint: Pubkey,
    pub pool_btc: Pubkey,
    pub pool_usdc: Pubkey
}

#[account]
#[derive(Default)]
pub struct UserAccount {
    pub btc_amount: u64,
    pub sol_amount: u64,
    pub usdc_amount: u64,
    pub lpsol_amount: u64,
    pub lpusd_amount: u64,
    pub owner: Pubkey,
    pub bump: u8
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct ProtocolBumps{
    pub state_account: u8,
    pub lpusd_mint: u8,
    pub lpsol_mint: u8,
    pub pool_usdc: u8,
    pub pool_btc: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient Amount")]
    InsufficientAmount,
    #[msg("Borrow Failed")]
    BorrowFailed,
    #[msg("Borrow Exceed")]
    BorrowExceed
}