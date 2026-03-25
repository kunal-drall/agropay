// agropay_v2.aleo — AGROPAY v2 with @custom constructor and emergency pause
//
// Constructor strategy comparison:
//
//   @noupgrade                 → used in v1. Immutable forever. assert.eq edition 0u16 auto-inserted.
//   @admin(address: "aleo1…")  → auto-inserts upgrade auth check. Named address can redeploy.
//   @checksum(mapping: "…", key: "0field") → upgrade gated by mapping value (on-chain governance).
//   @custom                    → body is YOURS. Cannot be empty. Full init logic here.
//
// v2 uses @custom to:
//   1. Record the deployer as `protocol_admin` (stored in a mapping).
//   2. Set a `paused` flag to false — enabling emergency stop without requiring a full upgrade.
//   3. Enforce single-initialization via a `deployed` boolean guard.
//
// The pause mechanism means circle creation and joining can be halted if a critical
// bug is found, without losing existing active circle state.
//
// NOTE: agropay_v1.aleo is already live on testnet. This is the planned v2 contract.
// Deploy as "agropay_v2.aleo" — program name must match program.json.

program agropay_v2.aleo {

    // ========== STRUCTS ==========

    struct CircleInfo {
        admin: address,
        contribution_amount: u64,
        total_members: u8,
        frequency: u8,
        status: u8,
        created_at: u32,
    }

    struct RoundState {
        current_round: u8,
        contributions_received: u8,
        pot_disbursed: bool,
        round_start: u32,
    }

    // ========== RECORDS ==========

    record Membership {
        owner: address,
        circle_id: field,
        position: u8,
        contribution_amount: u64,
        total_members: u8,
    }

    record ContributionReceipt {
        owner: address,
        circle_id: field,
        round: u8,
        amount: u64,
    }

    record Payout {
        owner: address,
        circle_id: field,
        round: u8,
        amount: u64,
        member_count: u8,
    }

    record Credential {
        owner: address,
        circle_id: field,
        total_rounds: u8,
        total_contributed: u64,
        total_received: u64,
    }

    // ========== MAPPINGS ==========

    mapping circles:        field => CircleInfo;
    mapping rounds:         field => RoundState;
    mapping members:        field => u8;

    // v2 additions
    mapping protocol_state: u8 => bool;    // key 0u8 = deployed, key 1u8 = paused
    mapping protocol_admin: u8 => address; // key 0u8 = admin address

    // ========== CONSTRUCTOR ==========

    // @custom: we own the entire constructor body.
    // Rules:
    //   - Must NOT be empty (compiler error if you leave it empty).
    //   - Cannot call finalize — constructor IS the finalize context.
    //   - Cannot have an async block inside it.
    //   - Has access to: block.height, self.caller, self.signer,
    //     self.program_owner, self.edition, self.checksum, Mapping::*.
    //
    // What this constructor does:
    //   - Guards against double-initialization (deployed flag).
    //   - Stores self.caller as the protocol admin.
    //   - Sets paused = false so the contract is live immediately.
    @custom
    async constructor() {
        // Guard: can only be called once
        let already_deployed: bool = Mapping::get_or_use(protocol_state, 0u8, false);
        assert_eq(already_deployed, false);

        // Mark as deployed
        Mapping::set(protocol_state, 0u8, true);

        // Store the deployer as protocol admin.
        // self.program_owner is the address that signed the deployment transaction.
        // self.caller is not available in the async constructor body.
        Mapping::set(protocol_admin, 0u8, self.program_owner);

        // Contract starts unpaused
        Mapping::set(protocol_state, 1u8, false);
    }

    // ========== PAUSE CONTROL (v2 addition) ==========

    // Only the protocol_admin can pause/unpause.
    // Circles already active are unaffected — pause only blocks new creates and joins.
    async transition set_paused(paused: bool) -> Future {
        return finalize_set_paused(self.caller, paused);
    }

    async function finalize_set_paused(caller: address, paused: bool) {
        let admin: address = Mapping::get(protocol_admin, 0u8);
        assert_eq(caller, admin);
        Mapping::set(protocol_state, 1u8, paused);
    }

    // ========== TRANSITIONS ==========

    // --- CREATE CIRCLE ---
    async transition create_circle(
        circle_id: field,
        contribution_amount: u64,
        total_members: u8,
        frequency: u8,
    ) -> (Membership, Future) {
        assert(total_members >= 3u8);
        assert(total_members <= 12u8);
        assert(contribution_amount > 0u64);
        assert(frequency <= 2u8);

        let f: Future = finalize_create_circle(circle_id, self.caller, contribution_amount, total_members, frequency);
        return (
            Membership {
                owner: self.caller,
                circle_id: circle_id,
                position: 0u8,
                contribution_amount: contribution_amount,
                total_members: total_members,
            },
            f
        );
    }

    async function finalize_create_circle(
        circle_id: field,
        admin: address,
        contribution_amount: u64,
        total_members: u8,
        frequency: u8,
    ) {
        // Pause check — new circles blocked while paused
        let paused: bool = Mapping::get_or_use(protocol_state, 1u8, false);
        assert_eq(paused, false);

        assert(!Mapping::contains(circles, circle_id));

        Mapping::set(circles, circle_id, CircleInfo {
            admin: admin,
            contribution_amount: contribution_amount,
            total_members: total_members,
            frequency: frequency,
            status: 0u8,
            created_at: block.height,
        });
        Mapping::set(members, circle_id, 1u8);
    }

    // --- JOIN CIRCLE ---
    async transition join_circle(
        circle_id: field,
        position: u8,
        contribution_amount: u64,
        total_members: u8,
    ) -> (Membership, Future) {
        let f: Future = finalize_join_circle(circle_id, position, contribution_amount, total_members);
        return (
            Membership {
                owner: self.caller,
                circle_id: circle_id,
                position: position,
                contribution_amount: contribution_amount,
                total_members: total_members,
            },
            f
        );
    }

    async function finalize_join_circle(
        circle_id: field,
        position: u8,
        contribution_amount: u64,
        total_members: u8,
    ) {
        // Pause check — new joins blocked while paused
        let paused: bool = Mapping::get_or_use(protocol_state, 1u8, false);
        assert_eq(paused, false);

        let info: CircleInfo = Mapping::get(circles, circle_id);
        assert_eq(info.status, 0u8);
        assert_eq(info.contribution_amount, contribution_amount);
        assert_eq(info.total_members, total_members);

        let count: u8 = Mapping::get(members, circle_id);
        assert_eq(position, count);

        let new_count: u8 = count + 1u8;
        Mapping::set(members, circle_id, new_count);

        if (new_count == info.total_members) {
            Mapping::set(circles, circle_id, CircleInfo {
                admin: info.admin,
                contribution_amount: info.contribution_amount,
                total_members: info.total_members,
                frequency: info.frequency,
                status: 1u8,
                created_at: info.created_at,
            });
            Mapping::set(rounds, circle_id, RoundState {
                current_round: 0u8,
                contributions_received: 0u8,
                pot_disbursed: false,
                round_start: block.height,
            });
        }
    }

    // --- CONTRIBUTE ---
    // Pause does NOT block contributions — in-flight circles must be able to complete.
    async transition contribute(
        membership: Membership,
    ) -> (Membership, ContributionReceipt, Future) {
        let f: Future = finalize_contribute(membership.circle_id, membership.contribution_amount);
        return (
            Membership {
                owner: membership.owner,
                circle_id: membership.circle_id,
                position: membership.position,
                contribution_amount: membership.contribution_amount,
                total_members: membership.total_members,
            },
            ContributionReceipt {
                owner: membership.owner,
                circle_id: membership.circle_id,
                round: 0u8,
                amount: membership.contribution_amount,
            },
            f
        );
    }

    async function finalize_contribute(circle_id: field, amount: u64) {
        let info: CircleInfo = Mapping::get(circles, circle_id);
        assert_eq(info.status, 1u8);
        assert_eq(amount, info.contribution_amount);

        let rstate: RoundState = Mapping::get(rounds, circle_id);
        assert(!rstate.pot_disbursed);

        let new_count: u8 = rstate.contributions_received + 1u8;
        assert(new_count <= info.total_members);

        Mapping::set(rounds, circle_id, RoundState {
            current_round: rstate.current_round,
            contributions_received: new_count,
            pot_disbursed: false,
            round_start: rstate.round_start,
        });
    }

    // --- CLAIM POT ---
    async transition claim_pot(
        membership: Membership,
        expected_round: u8,
    ) -> (Membership, Payout, Future) {
        assert_eq(membership.position, expected_round);

        let pot: u64 = membership.contribution_amount * (membership.total_members as u64);
        let f: Future = finalize_claim_pot(membership.circle_id, expected_round, membership.total_members);
        return (
            Membership {
                owner: membership.owner,
                circle_id: membership.circle_id,
                position: membership.position,
                contribution_amount: membership.contribution_amount,
                total_members: membership.total_members,
            },
            Payout {
                owner: membership.owner,
                circle_id: membership.circle_id,
                round: expected_round,
                amount: pot,
                member_count: membership.total_members,
            },
            f
        );
    }

    async function finalize_claim_pot(circle_id: field, expected_round: u8, total_members: u8) {
        let info: CircleInfo = Mapping::get(circles, circle_id);
        assert_eq(info.status, 1u8);

        let rstate: RoundState = Mapping::get(rounds, circle_id);
        assert_eq(rstate.current_round, expected_round);
        assert_eq(rstate.contributions_received, info.total_members);
        assert(!rstate.pot_disbursed);

        let next: u8 = rstate.current_round + 1u8;

        if (next == total_members) {
            Mapping::set(circles, circle_id, CircleInfo {
                admin: info.admin,
                contribution_amount: info.contribution_amount,
                total_members: info.total_members,
                frequency: info.frequency,
                status: 2u8,
                created_at: info.created_at,
            });
        } else {
            Mapping::set(rounds, circle_id, RoundState {
                current_round: next,
                contributions_received: 0u8,
                pot_disbursed: false,
                round_start: block.height,
            });
        }
    }

    // --- CLAIM CREDENTIAL ---
    async transition claim_credential(
        membership: Membership,
    ) -> (Membership, Credential, Future) {
        let total: u64 = membership.contribution_amount * (membership.total_members as u64);
        let f: Future = finalize_claim_credential(membership.circle_id);
        return (
            Membership {
                owner: membership.owner,
                circle_id: membership.circle_id,
                position: membership.position,
                contribution_amount: membership.contribution_amount,
                total_members: membership.total_members,
            },
            Credential {
                owner: membership.owner,
                circle_id: membership.circle_id,
                total_rounds: membership.total_members,
                total_contributed: total,
                total_received: total,
            },
            f
        );
    }

    async function finalize_claim_credential(circle_id: field) {
        let info: CircleInfo = Mapping::get(circles, circle_id);
        assert_eq(info.status, 2u8);
    }
}
