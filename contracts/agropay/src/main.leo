program agropay_v1.aleo {

    // ========== STRUCTS ==========

    struct CircleInfo {
        admin: address,
        contribution_amount: u64,  // In microcredits (1 credit = 1_000_000 microcredits)
        total_members: u8,         // 3 to 12
        frequency: u8,             // 0=weekly, 1=biweekly, 2=monthly (metadata, not time-enforced)
        status: u8,                // 0=pending, 1=active, 2=completed
        created_at: u32,           // block.height at creation
    }

    struct RoundState {
        current_round: u8,
        contributions_received: u8,
        pot_disbursed: bool,
        round_start: u32,
    }

    // ========== RECORDS (private state) ==========

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

    // ========== MAPPINGS (public state) ==========

    mapping circles:      field => CircleInfo;
    mapping rounds:       field => RoundState;
    // Tracks member count during pending phase; equals total_members when active.
    mapping members: field => u8;

    // ========== CONSTRUCTOR ==========

    // @noupgrade: this contract is immutable — no admin key, no upgrade path.
    // Leo auto-inserts the constructor body; the block must be empty.
    // Required by Aleo ConsensusVersion V9+.
    @noupgrade
    async constructor() {}

    // ========== TRANSITIONS ==========

    // --- CREATE CIRCLE ---
    // Caller becomes admin at position 0.
    // circle_id: generated on the frontend as a random field element.
    // Privacy: circle metadata → PUBLIC (mapping). Creator membership → PRIVATE (record).
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
        // Reject if circle_id already taken — prevents collisions.
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
    // position must equal current member_count (sequential, no gaps).
    // When the last member joins, the circle auto-activates and round 0 begins.
    // Privacy: that someone joined → PUBLIC (counter++). WHO joined → PRIVATE (record).
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
        let info: CircleInfo = Mapping::get(circles, circle_id);
        assert_eq(info.status, 0u8);
        assert_eq(info.contribution_amount, contribution_amount);
        assert_eq(info.total_members, total_members);

        let count: u8 = Mapping::get(members, circle_id);
        // position must equal current count — prevents position hijacking.
        assert_eq(position, count);

        let new_count: u8 = count + 1u8;
        Mapping::set(members, circle_id, new_count);

        // When all seats are filled, auto-activate and start round 0.
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
    // Increments the public contribution counter without linking the contributor's
    // address to the action — only the count is public, not WHO contributed.
    // Consumes and recreates Membership so each call proves continued membership.
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
        // Counter-level double-contribute guard. Nullifier-based per-address
        // enforcement is a future improvement once Aleo exposes nullifiers in Leo.
        assert(new_count <= info.total_members);

        Mapping::set(rounds, circle_id, RoundState {
            current_round: rstate.current_round,
            contributions_received: new_count,
            pot_disbursed: false,
            round_start: rstate.round_start,
        });
    }

    // --- CLAIM POT ---
    // Only the member whose position == current_round may claim.
    // All members must have contributed first.
    // Advances to the next round, or marks the circle complete on the final round.
    // Privacy: THAT the pot was claimed → PUBLIC. WHO received it → PRIVATE (Payout record).
    async transition claim_pot(
        membership: Membership,
        expected_round: u8,
    ) -> (Membership, Payout, Future) {
        // Transition-level check: caller owns a Membership at the correct position.
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
            // Final round — mark circle as completed.
            Mapping::set(circles, circle_id, CircleInfo {
                admin: info.admin,
                contribution_amount: info.contribution_amount,
                total_members: info.total_members,
                frequency: info.frequency,
                status: 2u8,
                created_at: info.created_at,
            });
        } else {
            // Advance to next round with a fresh contribution counter.
            Mapping::set(rounds, circle_id, RoundState {
                current_round: next,
                contributions_received: 0u8,
                pot_disbursed: false,
                round_start: block.height,
            });
        }
    }

    // --- CLAIM CREDENTIAL ---
    // After the circle completes, any member can claim a portable CompletionCredential.
    // Fully private — no public trace of who claimed it.
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
