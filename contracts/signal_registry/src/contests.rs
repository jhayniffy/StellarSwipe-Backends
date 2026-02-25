#![cfg_attr(target_family = "wasm", no_std)]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, Vec};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContestMetric {
    HighestROI = 0,
    BestSuccessRate = 1,
    MostVolume = 2,
    MostFollowers = 3,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContestStatus {
    Active = 0,
    Finalized = 1,
    Cancelled = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Contest {
    pub id: u64,
    pub name: soroban_sdk::String,
    pub start_time: u64,
    pub end_time: u64,
    pub metric: ContestMetric,
    pub min_signals: u32,
    pub prize_pool: i128,
    pub status: ContestStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContestEntry {
    pub provider: Address,
    pub signals_submitted: Vec<u64>,
    pub total_roi: i128,
    pub success_rate: u32,
    pub total_volume: i128,
    pub score: i128,
}

#[contract]
pub struct ContestRegistry;

#[contractimpl]
impl ContestRegistry {
    pub fn create_contest(
        env: Env,
        name: soroban_sdk::String,
        start_time: u64,
        end_time: u64,
        metric: ContestMetric,
        min_signals: u32,
        prize_pool: i128,
    ) -> u64 {
        let contest_id = Self::get_next_contest_id(&env);
        
        let contest = Contest {
            id: contest_id,
            name,
            start_time,
            end_time,
            metric,
            min_signals,
            prize_pool,
            status: ContestStatus::Active,
        };
        
        env.storage().persistent().set(&contest_id, &contest);
        
        let mut active_contests: Vec<u64> = env
            .storage()
            .persistent()
            .get(&soroban_sdk::symbol_short!("active"))
            .unwrap_or(Vec::new(&env));
        active_contests.push_back(contest_id);
        env.storage()
            .persistent()
            .set(&soroban_sdk::symbol_short!("active"), &active_contests);
        
        contest_id
    }

    pub fn submit_signal_to_contest(
        env: Env,
        contest_id: u64,
        provider: Address,
        signal_id: u64,
        roi: i128,
        volume: i128,
        is_successful: bool,
    ) {
        provider.require_auth();
        
        let contest: Contest = env
            .storage()
            .persistent()
            .get(&contest_id)
            .expect("Contest not found");
        
        let current_time = env.ledger().timestamp();
        assert!(
            current_time >= contest.start_time && current_time <= contest.end_time,
            "Contest not active"
        );
        
        let entry_key = (contest_id, provider.clone());
        let mut entry: ContestEntry = env
            .storage()
            .persistent()
            .get(&entry_key)
            .unwrap_or(ContestEntry {
                provider: provider.clone(),
                signals_submitted: Vec::new(&env),
                total_roi: 0,
                success_rate: 0,
                total_volume: 0,
                score: 0,
            });
        
        entry.signals_submitted.push_back(signal_id);
        entry.total_roi += roi;
        entry.total_volume += volume;
        
        let total_signals = entry.signals_submitted.len();
        let successful_count = if is_successful {
            (entry.success_rate * (total_signals - 1) / 100) + 1
        } else {
            entry.success_rate * (total_signals - 1) / 100
        };
        entry.success_rate = (successful_count * 100) / total_signals;
        
        entry.score = Self::calculate_score(&entry, contest.metric);
        
        env.storage().persistent().set(&entry_key, &entry);
    }

    pub fn finalize_contest(env: Env, contest_id: u64) -> Vec<Address> {
        let mut contest: Contest = env
            .storage()
            .persistent()
            .get(&contest_id)
            .expect("Contest not found");
        
        let current_time = env.ledger().timestamp();
        assert!(current_time >= contest.end_time, "Contest not ended");
        assert!(contest.status == ContestStatus::Active, "Already finalized");
        
        let entries = Self::get_qualified_entries(&env, contest_id, contest.min_signals);
        
        if entries.is_empty() {
            contest.status = ContestStatus::Finalized;
            env.storage().persistent().set(&contest_id, &contest);
            return Vec::new(&env);
        }
        
        let winners = Self::select_winners(&env, entries);
        Self::distribute_prizes(&env, contest_id, &winners, contest.prize_pool);
        
        contest.status = ContestStatus::Finalized;
        env.storage().persistent().set(&contest_id, &contest);
        
        let winners_key = (contest_id, soroban_sdk::symbol_short!("winners"));
        env.storage().persistent().set(&winners_key, &winners);
        
        winners
    }

    pub fn get_leaderboard(env: Env, contest_id: u64, limit: u32) -> Vec<ContestEntry> {
        let contest: Contest = env
            .storage()
            .persistent()
            .get(&contest_id)
            .expect("Contest not found");
        
        let mut entries = Self::get_all_entries(&env, contest_id);
        entries.sort_by(|a, b| b.score.cmp(&a.score));
        
        let mut result = Vec::new(&env);
        let max = limit.min(entries.len());
        for i in 0..max {
            if let Some(entry) = entries.get(i) {
                result.push_back(entry);
            }
        }
        result
    }

    pub fn get_contest(env: Env, contest_id: u64) -> Contest {
        env.storage()
            .persistent()
            .get(&contest_id)
            .expect("Contest not found")
    }

    fn calculate_score(entry: &ContestEntry, metric: ContestMetric) -> i128 {
        match metric {
            ContestMetric::HighestROI => entry.total_roi,
            ContestMetric::BestSuccessRate => entry.success_rate as i128,
            ContestMetric::MostVolume => entry.total_volume,
            ContestMetric::MostFollowers => 0, // Implement follower count logic
        }
    }

    fn get_qualified_entries(env: &Env, contest_id: u64, min_signals: u32) -> Vec<ContestEntry> {
        let entries = Self::get_all_entries(env, contest_id);
        let mut qualified = Vec::new(env);
        
        for entry in entries.iter() {
            if entry.signals_submitted.len() >= min_signals {
                qualified.push_back(entry);
            }
        }
        qualified
    }

    fn get_all_entries(env: &Env, contest_id: u64) -> Vec<ContestEntry> {
        let entries_key = (contest_id, soroban_sdk::symbol_short!("entries"));
        env.storage()
            .persistent()
            .get(&entries_key)
            .unwrap_or(Vec::new(env))
    }

    fn select_winners(env: &Env, mut entries: Vec<ContestEntry>) -> Vec<Address> {
        entries.sort_by(|a, b| b.score.cmp(&a.score));
        
        let mut winners = Vec::new(env);
        let max = 3.min(entries.len());
        for i in 0..max {
            if let Some(entry) = entries.get(i) {
                winners.push_back(entry.provider.clone());
            }
        }
        winners
    }

    fn distribute_prizes(env: &Env, contest_id: u64, winners: &Vec<Address>, prize_pool: i128) {
        if winners.is_empty() {
            return;
        }
        
        let prizes = [
            (prize_pool * 50) / 100, // 50%
            (prize_pool * 30) / 100, // 30%
            (prize_pool * 20) / 100, // 20%
        ];
        
        for i in 0..winners.len().min(3) {
            if let Some(winner) = winners.get(i) {
                let prize_key = (contest_id, winner.clone());
                env.storage().persistent().set(&prize_key, &prizes[i as usize]);
            }
        }
    }

    fn get_next_contest_id(env: &Env) -> u64 {
        let key = soroban_sdk::symbol_short!("next_id");
        let id: u64 = env.storage().persistent().get(&key).unwrap_or(1);
        env.storage().persistent().set(&key, &(id + 1));
        id
    }
}
