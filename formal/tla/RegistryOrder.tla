---------------------------- MODULE RegistryOrder ----------------------------
(* Formal specification of registry total order invariant *)
(* All cities must see the same sequence of registry heads *)

EXTENDS Integers, Sequences, FiniteSets, TLC

CONSTANTS 
    Cities,          \* Set of city names
    MaxTime,         \* Maximum time steps
    MaxDivergence    \* Maximum allowed divergence (should be 0)

VARIABLES
    time,            \* Current time
    registryHeads,   \* registryHeads[c] = sequence of heads seen by city c
    messages,        \* Messages in transit
    cityStates,      \* State of each city (online/offline)
    bftCommittee,    \* Current BFT committee members
    signatures       \* Signatures on registry heads

----

Init == 
    /\ time = 0
    /\ registryHeads = [c \in Cities |-> <<>>]
    /\ messages = {}
    /\ cityStates = [c \in Cities |-> "online"]
    /\ bftCommittee = CHOOSE S \in SUBSET Cities : Cardinality(S) >= 9
    /\ signatures = [h \in {} |-> {}]

----

\* City proposes new registry head
ProposeHead(city) ==
    /\ cityStates[city] = "online"
    /\ LET newHead == [cid |-> "Qm" \o ToString(time), 
                       proposer |-> city,
                       timestamp |-> time]
       IN messages' = messages \union {[type |-> "propose", 
                                        from |-> city, 
                                        head |-> newHead]}
    /\ UNCHANGED <<time, registryHeads, cityStates, bftCommittee, signatures>>

\* BFT committee signs proposed head
SignHead(committee_member, head) ==
    /\ committee_member \in bftCommittee
    /\ cityStates[committee_member] = "online"
    /\ \E msg \in messages : 
        /\ msg.type = "propose"
        /\ msg.head = head
    /\ signatures' = [signatures EXCEPT ![head] = 
                      signatures[head] \union {committee_member}]
    /\ UNCHANGED <<time, registryHeads, messages, cityStates, bftCommittee>>

\* City accepts head with sufficient signatures (2/3 of committee)
AcceptHead(city, head) ==
    /\ cityStates[city] = "online"
    /\ head \in DOMAIN signatures
    /\ Cardinality(signatures[head]) >= (2 * Cardinality(bftCommittee)) \div 3 + 1
    /\ registryHeads' = [registryHeads EXCEPT ![city] = 
                         Append(registryHeads[city], head)]
    /\ UNCHANGED <<time, messages, cityStates, bftCommittee, signatures>>

\* Network delivers message (may reorder/delay)
DeliverMessage(msg) ==
    /\ msg \in messages
    /\ messages' = messages \ {msg}
    /\ UNCHANGED <<time, registryHeads, cityStates, bftCommittee, signatures>>

\* City goes offline (fault)
CityOffline(city) ==
    /\ cityStates[city] = "online"
    /\ cityStates' = [cityStates EXCEPT ![city] = "offline"]
    /\ UNCHANGED <<time, registryHeads, messages, bftCommittee, signatures>>

\* City comes back online
CityOnline(city) ==
    /\ cityStates[city] = "offline"
    /\ cityStates' = [cityStates EXCEPT ![city] = "online"]
    /\ UNCHANGED <<time, registryHeads, messages, bftCommittee, signatures>>

\* Time advances
Tick ==
    /\ time < MaxTime
    /\ time' = time + 1
    /\ UNCHANGED <<registryHeads, messages, cityStates, bftCommittee, signatures>>

----

Next == 
    \/ \E c \in Cities : ProposeHead(c)
    \/ \E c \in Cities, h \in DOMAIN signatures : SignHead(c, h)
    \/ \E c \in Cities, h \in DOMAIN signatures : AcceptHead(c, h)
    \/ \E msg \in messages : DeliverMessage(msg)
    \/ \E c \in Cities : CityOffline(c)
    \/ \E c \in Cities : CityOnline(c)
    \/ Tick

----

\* INVARIANTS

\* All online cities eventually converge to same registry sequence
RegistryConvergence ==
    \A c1, c2 \in Cities :
        (cityStates[c1] = "online" /\ cityStates[c2] = "online") =>
        (Len(registryHeads[c1]) = Len(registryHeads[c2]) =>
         registryHeads[c1] = registryHeads[c2])

\* No divergence beyond threshold
NoDivergence ==
    \A c1, c2 \in Cities :
        LET minLen == Min(Len(registryHeads[c1]), Len(registryHeads[c2]))
        IN \A i \in 1..minLen :
            registryHeads[c1][i] = registryHeads[c2][i]

\* BFT threshold is maintained
BFTThreshold ==
    \A h \in DOMAIN signatures :
        (Cardinality(signatures[h]) >= (2 * Cardinality(bftCommittee)) \div 3 + 1) \/
        (Cardinality(signatures[h]) < Cardinality(bftCommittee))

\* Safety: no conflicting heads at same position
NoConflictingHeads ==
    \A c1, c2 \in Cities :
        \A i \in 1..Min(Len(registryHeads[c1]), Len(registryHeads[c2])) :
            registryHeads[c1][i] = registryHeads[c2][i]

----

\* PROPERTIES

\* Liveness: cities make progress
EventualProgress ==
    <>[](\E c \in Cities : cityStates[c] = "online" => 
         <>(Len(registryHeads[c]) > 0))

\* Total order is eventually achieved
EventualTotalOrder ==
    <>[](\A c1, c2 \in Cities :
         cityStates[c1] = "online" /\ cityStates[c2] = "online" =>
         registryHeads[c1] = registryHeads[c2])

===============================================================================