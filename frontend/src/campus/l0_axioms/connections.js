// User-confirmed connectivity, not OSM ways. Anchors are existing mapped nodes;
// the straight segment between them is schematic, with no asserted floor or stair type.
export const confirmedConnections = [
  { id: 'cym-west-east', from: '4525548835', to: '6580279796',
    anchorWayIds: [182203615, 182208633], label: 'CYM west-to-east connection',
    source: 'user-confirmed', reportedOn: '2026-11-18',
    evidence: 'User describes KK → CYM → CYCP/CYPP and requests direct connections.' },
  { id: 'cym-southwest-east', from: '4525548836', to: '6580279796',
    anchorWayIds: [707832734, 182208633], label: 'CYM southwest-to-east connection',
    source: 'user-confirmed', reportedOn: '2026-11-18',
    evidence: 'User requests direct CYM → CYCP/CYPP connectivity; west entrance links are schematic.' },
  { id: 'cym-cycp-plaza', from: '1925517661', to: '6580279801',
    anchorWayIds: [182208633, 700710033], label: 'CYM walkway to CYCP connection',
    source: 'user-confirmed', reportedOn: '2026-11-18',
    evidence: 'User confirms CYM is next to CYCP/CYPP and requests a direct connection.' },
];
