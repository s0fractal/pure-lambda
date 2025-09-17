---------------------------- MODULE Lattice ----------------------------
(* Invariant Lattice - Formal protection against value drift *)

EXTENDS Integers, Sequences, TLC, FiniteSets

---- Core Invariants (NEVER VIOLATE) ----

(* Charter Invariants *)
Consent == \A action \in Actions: RequiresConsent(action) => HasConsent(action)
Minimality == \A resource \in Resources: Used(resource) => Necessary(resource)  
RightToExit == \A agent \in Agents: CanExit(agent)
Decentralization == PowerConcentration < 0.33

(* Treaty v2 Invariants *)
CityAutonomy == \A city \in Cities: HasSovereignty(city)
FederationConsensus == \A decision \in FederationDecisions: 
    Approved(decision) => VoteCount(decision) >= (2 * Cardinality(Cities)) \div 3 + 1
StewardshipModel == \A circle \in Circles: HasRotation(circle) /\ HasTransparency(circle)

(* Foundational Invariants *)
DataIntegrity == \A cid \in CIDs: Immutable(cid) /\ ContentAddressed(cid)
CryptographicSecurity == \A signature \in Signatures: 
    Valid(signature) => VerifiableBy(signature.pubkey)
ConsensusLiveness == [](EventuallyConsensus)

---- Lattice Structure ----

(* Partial ordering: inv1 ≤ inv2 if violating inv1 implies violating inv2 *)
LatticeOrder == 
    /\ Consent ≤ CharterValidity
    /\ Minimality ≤ CharterValidity  
    /\ RightToExit ≤ CharterValidity
    /\ CharterValidity ≤ SystemIntegrity
    /\ CityAutonomy ≤ TreatyCompliance
    /\ FederationConsensus ≤ TreatyCompliance
    /\ TreatyCompliance ≤ SystemIntegrity
    /\ DataIntegrity ≤ SystemIntegrity
    /\ CryptographicSecurity ≤ SystemIntegrity
    /\ SystemIntegrity ≤ ExistenceContinuation

(* Top element: system continues to exist *)
ExistenceContinuation == ActiveNodes >= MinimumViableNodes

(* Bottom element: all invariants satisfied *)
PerfectCompliance == 
    /\ Consent /\ Minimality /\ RightToExit /\ Decentralization
    /\ CityAutonomy /\ FederationConsensus /\ StewardshipModel
    /\ DataIntegrity /\ CryptographicSecurity /\ ConsensusLiveness

---- Invariant Preservation Under Changes ----

(* Any code change must preserve parent invariants *)
ValidChange(change) ==
    LET affected == AffectedInvariants(change)
        parents == ParentInvariants(affected)
    IN \A inv \in parents: PreservesInvariant(change, inv)

(* Formal proof requirement for critical invariants *)
RequiresProof(change) ==
    \E inv \in CriticalInvariants: 
        MayAffect(change, inv) => HasFormalProof(change, inv)

CriticalInvariants == {
    Consent, 
    RightToExit,
    DataIntegrity,
    CryptographicSecurity,
    ExistenceContinuation
}

---- Drift Detection ----

(* Measure distance from ideal state *)
DriftMetric ==
    LET violations == {inv \in AllInvariants: ~Holds(inv)}
        weights == [inv \in AllInvariants |-> Weight(inv)]
    IN Sum([inv \in violations |-> weights[inv]])

(* Alert if drift exceeds threshold *)
DriftAlert == DriftMetric > DriftThreshold

---- Repair Actions ----

(* For each invariant, define repair action *)
Repair(inv) ==
    CASE inv = Consent -> RequestMissingConsent
      [] inv = Minimality -> RemoveUnnecessaryResources
      [] inv = Decentralization -> RebalancePower
      [] inv = DataIntegrity -> RebuildFromCID
      [] inv = ConsensusLiveness -> ActivateFallbackConsensus
      [] OTHER -> ManualIntervention

(* Automatic repair if safe *)
AutoRepair ==
    \A inv \in SafeToAutoRepair:
        ~Holds(inv) => Execute(Repair(inv))

SafeToAutoRepair == {
    Minimality,
    DataIntegrity,
    ConsensusLiveness
}

---- Hierarchy Enforcement ----

(* No decision can override higher invariant *)
HierarchyRespected ==
    \A decision \in Decisions:
        \A inv \in AffectedBy(decision):
            Level(inv) >= Level(decision.authority)

(* Invariant levels *)
Level(inv) ==
    CASE inv \in {Consent, RightToExit} -> 100  \* Inviolable
      [] inv \in {CityAutonomy, DataIntegrity} -> 90
      [] inv \in {FederationConsensus, CryptographicSecurity} -> 80
      [] inv \in {StewardshipModel, Decentralization} -> 70
      [] OTHER -> 50

---- Specification ----

Init ==
    /\ PerfectCompliance
    /\ DriftMetric = 0
    /\ SystemState = "healthy"

Next ==
    \/ \E change \in ProposedChanges:
        /\ ValidChange(change)
        /\ ApplyChange(change)
    \/ DriftAlert /\ AutoRepair
    \/ UNCHANGED vars

Spec == Init /\ [][Next]_vars

---- Properties ----

(* Core invariants never violated *)
Safety == [](
    /\ Consent
    /\ RightToExit  
    /\ DataIntegrity
)

(* System eventually returns to compliance *)
Liveness == DriftAlert ~> PerfectCompliance

(* Monotonic improvement *)
Progress == [](DriftMetric' <= DriftMetric)

---- Theorems ----

THEOREM LatticeWellFormed == 
    /\ \A inv1, inv2 \in AllInvariants:
        inv1 ≤ inv2 \/ inv2 ≤ inv1 \/ Incomparable(inv1, inv2)
    /\ \E top \in AllInvariants: \A inv \in AllInvariants: inv ≤ top
    /\ \E bottom \in AllInvariants: \A inv \in AllInvariants: bottom ≤ inv

THEOREM NoValueDrift ==
    Spec => []HierarchyRespected

THEOREM RepairConvergence ==
    Spec => (DriftMetric > 0 ~> DriftMetric = 0)

==========================================================================