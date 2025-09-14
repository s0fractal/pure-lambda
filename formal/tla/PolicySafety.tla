---------------------------- MODULE PolicySafety ----------------------------
(* Formal specification of policy safety invariants *)
(* No action violates capabilities or declared I/O *)

EXTENDS Integers, Sequences, FiniteSets, TLC

CONSTANTS
    Agents,          \* Set of agent DIDs
    Humans,          \* Set of human DIDs  
    Resources,       \* Set of resources (files/intents/views)
    Operations,      \* Set of operations (read/write/execute)
    MaxActions       \* Maximum actions to model

VARIABLES
    actions,         \* Sequence of actions taken
    capabilities,    \* capabilities[actor] = set of allowed operations
    contracts,       \* Active contracts with declared I/O
    consents,        \* consents[human][resource] = granted operations
    violations,      \* Policy violations detected
    attestations     \* Attestations for actions

----

Init ==
    /\ actions = <<>>
    /\ capabilities = [a \in Agents \union Humans |-> {}]
    /\ contracts = {}
    /\ consents = [h \in Humans |-> [r \in Resources |-> {}]]
    /\ violations = {}
    /\ attestations = {}

----

\* Issue capability to actor
IssueCapability(issuer, subject, cap) ==
    /\ issuer \in Humans  \* Only humans can issue capabilities
    /\ capabilities' = [capabilities EXCEPT ![subject] = 
                        capabilities[subject] \union {cap}]
    /\ UNCHANGED <<actions, contracts, consents, violations, attestations>>

\* Create contract with declared I/O
CreateContract(issuer, assignee, inputs, outputs) ==
    /\ issuer \in Humans
    /\ assignee \in Agents
    /\ LET contract == [id |-> Cardinality(contracts) + 1,
                        issuer |-> issuer,
                        assignee |-> assignee,
                        inputs |-> inputs,
                        outputs |-> outputs,
                        status |-> "active"]
       IN contracts' = contracts \union {contract}
    /\ UNCHANGED <<actions, capabilities, consents, violations, attestations>>

\* Grant consent for resource access
GrantConsent(human, resource, ops) ==
    /\ human \in Humans
    /\ resource \in Resources
    /\ ops \subseteq Operations
    /\ consents' = [consents EXCEPT ![human][resource] = ops]
    /\ UNCHANGED <<actions, capabilities, contracts, violations, attestations>>

\* Agent performs action
AgentAction(agent, operation, resource) ==
    /\ agent \in Agents
    /\ operation \in Operations
    /\ resource \in Resources
    /\ LET action == [actor |-> agent, 
                      op |-> operation, 
                      resource |-> resource,
                      timestamp |-> Len(actions) + 1]
       IN actions' = Append(actions, action)
    /\ UNCHANGED <<capabilities, contracts, consents, violations, attestations>>

\* Check if action is authorized
IsAuthorized(action) ==
    LET actor == action.actor
        op == action.op
        resource == action.resource
    IN \/ \* Has capability
          [op |-> op, resource |-> resource] \in capabilities[actor]
       \/ \* Is in active contract
          \E c \in contracts :
              /\ c.status = "active"
              /\ c.assignee = actor
              /\ \/ (op = "read" /\ resource \in c.inputs)
                 \/ (op = "write" /\ resource \in c.outputs)
       \/ \* Has consent (for human resources)
          \E h \in Humans :
              op \in consents[h][resource]

\* Detect policy violation
DetectViolation(action) ==
    /\ ~IsAuthorized(action)
    /\ violations' = violations \union {[action |-> action, 
                                         type |-> "unauthorized"]}
    /\ UNCHANGED <<actions, capabilities, contracts, consents, attestations>>

\* Provide attestation for action
AttestAction(action, attester) ==
    /\ action \in Range(actions)
    /\ attester \in Agents
    /\ attestations' = attestations \union 
                       {[action |-> action, 
                         attester |-> attester,
                         valid |-> IsAuthorized(action)]}
    /\ UNCHANGED <<actions, capabilities, contracts, consents, violations>>

----

Next ==
    \/ \E issuer \in Humans, subject \in Agents \union Humans, 
          cap \in Operations \X Resources :
          IssueCapability(issuer, subject, [op |-> cap[1], resource |-> cap[2]])
    \/ \E issuer \in Humans, assignee \in Agents,
          inputs \in SUBSET Resources, outputs \in SUBSET Resources :
          CreateContract(issuer, assignee, inputs, outputs)
    \/ \E h \in Humans, r \in Resources, ops \in SUBSET Operations :
          GrantConsent(h, r, ops)
    \/ \E a \in Agents, op \in Operations, r \in Resources :
          AgentAction(a, op, r)
    \/ \E action \in Range(actions) :
          DetectViolation(action)
    \/ \E action \in Range(actions), attester \in Agents :
          AttestAction(action, attester)

----

\* INVARIANTS

\* No unauthorized actions
NoUnauthorizedActions ==
    \A i \in 1..Len(actions) :
        IsAuthorized(actions[i])

\* All violations are real violations
ValidViolations ==
    \A v \in violations :
        ~IsAuthorized(v.action)

\* Contracts respect declared I/O
ContractIORespected ==
    \A c \in contracts :
        \A i \in 1..Len(actions) :
            LET action == actions[i]
            IN (action.actor = c.assignee) =>
                \/ (action.op = "read" => action.resource \in c.inputs)
                \/ (action.op = "write" => action.resource \in c.outputs)
                \/ (action.op \notin {"read", "write"})

\* Consent is required for human data
ConsentRequired ==
    \A i \in 1..Len(actions) :
        LET action == actions[i]
        IN \A h \in Humans :
            (action.resource \in Resources /\ 
             action.op \in {"read", "write"}) =>
            (action.op \in consents[h][action.resource] \/
             ~(\E r \in Resources : action.resource = r))

\* Attestations are truthful
TruthfulAttestations ==
    \A att \in attestations :
        att.valid = IsAuthorized(att.action)

----

\* PROPERTIES

\* Eventually all actions are attested
EventualAttestation ==
    <>[](\A i \in 1..Len(actions) :
         \E att \in attestations : att.action = actions[i])

\* No escalation of privileges
NoPrivilegeEscalation ==
    [](\A a \in Agents :
        LET initial == capabilities[a]
        IN capabilities'[a] \subseteq capabilities[a] \union 
           {cap \in Operations \X Resources : 
            \E h \in Humans, c \in contracts : 
                c.issuer = h /\ c.assignee = a})

===============================================================================