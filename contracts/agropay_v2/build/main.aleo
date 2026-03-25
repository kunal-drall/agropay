program agropay_v2.aleo;

record Membership:
    owner as address.private;
    circle_id as field.private;
    position as u8.private;
    contribution_amount as u64.private;
    total_members as u8.private;

record ContributionReceipt:
    owner as address.private;
    circle_id as field.private;
    round as u8.private;
    amount as u64.private;

record Payout:
    owner as address.private;
    circle_id as field.private;
    round as u8.private;
    amount as u64.private;
    member_count as u8.private;

record Credential:
    owner as address.private;
    circle_id as field.private;
    total_rounds as u8.private;
    total_contributed as u64.private;
    total_received as u64.private;

struct CircleInfo:
    admin as address;
    contribution_amount as u64;
    total_members as u8;
    frequency as u8;
    status as u8;
    created_at as u32;

struct RoundState:
    current_round as u8;
    contributions_received as u8;
    pot_disbursed as boolean;
    round_start as u32;

mapping circles:
    key as field.public;
    value as CircleInfo.public;

mapping rounds:
    key as field.public;
    value as RoundState.public;

mapping members:
    key as field.public;
    value as u8.public;

mapping protocol_state:
    key as u8.public;
    value as boolean.public;

mapping protocol_admin:
    key as u8.public;
    value as address.public;

function set_paused:
    input r0 as boolean.private;
    async set_paused self.caller r0 into r1;
    output r1 as agropay_v2.aleo/set_paused.future;

finalize set_paused:
    input r0 as address.public;
    input r1 as boolean.public;
    get protocol_admin[0u8] into r2;
    assert.eq r0 r2;
    set r1 into protocol_state[1u8];

function create_circle:
    input r0 as field.private;
    input r1 as u64.private;
    input r2 as u8.private;
    input r3 as u8.private;
    gte r2 3u8 into r4;
    assert.eq r4 true;
    lte r2 12u8 into r5;
    assert.eq r5 true;
    gt r1 0u64 into r6;
    assert.eq r6 true;
    lte r3 2u8 into r7;
    assert.eq r7 true;
    async create_circle r0 self.caller r1 r2 r3 into r8;
    cast self.caller r0 0u8 r1 r2 into r9 as Membership.record;
    output r9 as Membership.record;
    output r8 as agropay_v2.aleo/create_circle.future;

finalize create_circle:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as u64.public;
    input r3 as u8.public;
    input r4 as u8.public;
    get.or_use protocol_state[1u8] false into r5;
    assert.eq r5 false;
    contains circles[r0] into r6;
    not r6 into r7;
    assert.eq r7 true;
    cast r1 r2 r3 r4 0u8 block.height into r8 as CircleInfo;
    set r8 into circles[r0];
    set 1u8 into members[r0];

function join_circle:
    input r0 as field.private;
    input r1 as u8.private;
    input r2 as u64.private;
    input r3 as u8.private;
    async join_circle r0 r1 r2 r3 into r4;
    cast self.caller r0 r1 r2 r3 into r5 as Membership.record;
    output r5 as Membership.record;
    output r4 as agropay_v2.aleo/join_circle.future;

finalize join_circle:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as u8.public;
    get.or_use protocol_state[1u8] false into r4;
    assert.eq r4 false;
    get circles[r0] into r5;
    assert.eq r5.status 0u8;
    assert.eq r5.contribution_amount r2;
    assert.eq r5.total_members r3;
    get members[r0] into r6;
    assert.eq r1 r6;
    add r6 1u8 into r7;
    set r7 into members[r0];
    is.eq r7 r5.total_members into r8;
    branch.eq r8 false to end_then_0_0;
    cast r5.admin r5.contribution_amount r5.total_members r5.frequency 1u8 r5.created_at into r9 as CircleInfo;
    set r9 into circles[r0];
    cast 0u8 0u8 false block.height into r10 as RoundState;
    set r10 into rounds[r0];
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;

function contribute:
    input r0 as Membership.record;
    async contribute r0.circle_id r0.contribution_amount into r1;
    cast r0.owner r0.circle_id r0.position r0.contribution_amount r0.total_members into r2 as Membership.record;
    cast r0.owner r0.circle_id 0u8 r0.contribution_amount into r3 as ContributionReceipt.record;
    output r2 as Membership.record;
    output r3 as ContributionReceipt.record;
    output r1 as agropay_v2.aleo/contribute.future;

finalize contribute:
    input r0 as field.public;
    input r1 as u64.public;
    get circles[r0] into r2;
    assert.eq r2.status 1u8;
    assert.eq r1 r2.contribution_amount;
    get rounds[r0] into r3;
    not r3.pot_disbursed into r4;
    assert.eq r4 true;
    add r3.contributions_received 1u8 into r5;
    lte r5 r2.total_members into r6;
    assert.eq r6 true;
    cast r3.current_round r5 false r3.round_start into r7 as RoundState;
    set r7 into rounds[r0];

function claim_pot:
    input r0 as Membership.record;
    input r1 as u8.private;
    assert.eq r0.position r1;
    cast r0.total_members into r2 as u64;
    mul r0.contribution_amount r2 into r3;
    async claim_pot r0.circle_id r1 r0.total_members into r4;
    cast r0.owner r0.circle_id r0.position r0.contribution_amount r0.total_members into r5 as Membership.record;
    cast r0.owner r0.circle_id r1 r3 r0.total_members into r6 as Payout.record;
    output r5 as Membership.record;
    output r6 as Payout.record;
    output r4 as agropay_v2.aleo/claim_pot.future;

finalize claim_pot:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    get circles[r0] into r3;
    assert.eq r3.status 1u8;
    get rounds[r0] into r4;
    assert.eq r4.current_round r1;
    assert.eq r4.contributions_received r3.total_members;
    not r4.pot_disbursed into r5;
    assert.eq r5 true;
    add r4.current_round 1u8 into r6;
    is.eq r6 r2 into r7;
    branch.eq r7 false to end_then_0_2;
    cast r3.admin r3.contribution_amount r3.total_members r3.frequency 2u8 r3.created_at into r8 as CircleInfo;
    set r8 into circles[r0];
    branch.eq true true to end_otherwise_0_3;
    position end_then_0_2;
    cast r6 0u8 false block.height into r9 as RoundState;
    set r9 into rounds[r0];
    position end_otherwise_0_3;

function claim_credential:
    input r0 as Membership.record;
    cast r0.total_members into r1 as u64;
    mul r0.contribution_amount r1 into r2;
    async claim_credential r0.circle_id into r3;
    cast r0.owner r0.circle_id r0.position r0.contribution_amount r0.total_members into r4 as Membership.record;
    cast r0.owner r0.circle_id r0.total_members r2 r2 into r5 as Credential.record;
    output r4 as Membership.record;
    output r5 as Credential.record;
    output r3 as agropay_v2.aleo/claim_credential.future;

finalize claim_credential:
    input r0 as field.public;
    get circles[r0] into r1;
    assert.eq r1.status 2u8;

constructor:
    get.or_use protocol_state[0u8] false into r0;
    assert.eq r0 false;
    set true into protocol_state[0u8];
    set program_owner into protocol_admin[0u8];
    set false into protocol_state[1u8];
