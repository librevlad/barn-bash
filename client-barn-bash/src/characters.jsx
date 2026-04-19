// Cute animal characters — detailed SVG avatars with blush, highlights, accessories.
// Each character has a consistent body silhouette with unique head features.

const CharShapes = {
  // --- PIG --- chubby, blush, curled tail
  Pig: ({ c = "#f4a8c0" }) => (
    <g>
      {/* body */}
      <ellipse cx="50" cy="68" rx="32" ry="20" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* belly highlight */}
      <ellipse cx="50" cy="72" rx="20" ry="10" fill="#fff" opacity=".35"/>
      {/* feet */}
      <rect x="32" y="82" width="10" height="8" rx="3" fill="#d89ab0" stroke="#2a1a10" strokeWidth="2.5"/>
      <rect x="58" y="82" width="10" height="8" rx="3" fill="#d89ab0" stroke="#2a1a10" strokeWidth="2.5"/>
      {/* head */}
      <circle cx="50" cy="40" r="26" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* ears */}
      <path d="M 28 18 Q 24 8 36 20 Z" fill={c} stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M 72 18 Q 76 8 64 20 Z" fill={c} stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M 30 16 Q 30 12 33 16" fill="#e590ac"/>
      <path d="M 70 16 Q 70 12 67 16" fill="#e590ac"/>
      {/* blush */}
      <ellipse cx="33" cy="46" rx="5" ry="3" fill="#e5708c" opacity=".7"/>
      <ellipse cx="67" cy="46" rx="5" ry="3" fill="#e5708c" opacity=".7"/>
      {/* snout */}
      <ellipse cx="50" cy="48" rx="13" ry="9" fill="#e590ac" stroke="#2a1a10" strokeWidth="3"/>
      <ellipse cx="45" cy="48" rx="2" ry="2.5" fill="#2a1a10"/>
      <ellipse cx="55" cy="48" rx="2" ry="2.5" fill="#2a1a10"/>
      {/* eyes closed happy */}
      <circle cx="41" cy="35" r="4" fill="#fff" stroke="#2a1a10" strokeWidth="2"/>
      <circle cx="59" cy="35" r="4" fill="#fff" stroke="#2a1a10" strokeWidth="2"/>
      <circle cx="42" cy="36" r="2" fill="#2a1a10"/>
      <circle cx="60" cy="36" r="2" fill="#2a1a10"/>
      <circle cx="43" cy="35" r=".8" fill="#fff"/>
      <circle cx="61" cy="35" r=".8" fill="#fff"/>
    </g>
  ),

  // --- FOX --- pointy ears, mask, white chest, fluffy cheeks
  Fox: ({ c = "#f08a3a" }) => (
    <g>
      <ellipse cx="50" cy="68" rx="30" ry="20" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* white chest */}
      <path d="M 36 62 Q 50 84 64 62 Q 60 76 50 78 Q 40 76 36 62" fill="#fff" stroke="#2a1a10" strokeWidth="2.5"/>
      {/* feet */}
      <rect x="32" y="82" width="10" height="8" rx="2" fill="#2a1a10"/>
      <rect x="58" y="82" width="10" height="8" rx="2" fill="#2a1a10"/>
      {/* ears */}
      <path d="M 26 24 L 34 4 L 44 26 Z" fill={c} stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M 74 24 L 66 4 L 56 26 Z" fill={c} stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M 30 22 L 34 10 L 40 24 Z" fill="#2a1a10"/>
      <path d="M 70 22 L 66 10 L 60 24 Z" fill="#2a1a10"/>
      {/* head */}
      <circle cx="50" cy="40" r="24" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* cheeks */}
      <circle cx="30" cy="46" r="8" fill="#fff" stroke="#2a1a10" strokeWidth="2.5"/>
      <circle cx="70" cy="46" r="8" fill="#fff" stroke="#2a1a10" strokeWidth="2.5"/>
      {/* muzzle */}
      <path d="M 38 44 Q 50 62 62 44 L 60 52 Q 50 58 40 52 Z" fill="#fff" stroke="#2a1a10" strokeWidth="2.5"/>
      {/* nose */}
      <ellipse cx="50" cy="46" rx="4" ry="3" fill="#2a1a10"/>
      <ellipse cx="49" cy="45" rx="1.5" ry="1" fill="#fff"/>
      {/* eyes */}
      <circle cx="40" cy="34" r="5" fill="#fff" stroke="#2a1a10" strokeWidth="2.5"/>
      <circle cx="60" cy="34" r="5" fill="#fff" stroke="#2a1a10" strokeWidth="2.5"/>
      <circle cx="41" cy="35" r="2.5" fill="#2a1a10"/>
      <circle cx="61" cy="35" r="2.5" fill="#2a1a10"/>
      <circle cx="42" cy="34" r="1" fill="#fff"/>
      <circle cx="62" cy="34" r="1" fill="#fff"/>
    </g>
  ),

  // --- BEAR --- round ears, muzzle, round cheeks
  Bear: ({ c = "#a0723f" }) => (
    <g>
      <ellipse cx="50" cy="68" rx="32" ry="22" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* tummy */}
      <ellipse cx="50" cy="72" rx="18" ry="12" fill="#e4c9a3" stroke="#2a1a10" strokeWidth="2.5"/>
      <rect x="30" y="82" width="12" height="10" rx="3" fill="#7e572c" stroke="#2a1a10" strokeWidth="2.5"/>
      <rect x="58" y="82" width="12" height="10" rx="3" fill="#7e572c" stroke="#2a1a10" strokeWidth="2.5"/>
      {/* head */}
      <circle cx="50" cy="38" r="26" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* ears */}
      <circle cx="28" cy="18" r="10" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      <circle cx="72" cy="18" r="10" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      <circle cx="28" cy="18" r="5" fill="#7e572c"/>
      <circle cx="72" cy="18" r="5" fill="#7e572c"/>
      {/* blush */}
      <ellipse cx="32" cy="46" rx="5" ry="3" fill="#d88466" opacity=".6"/>
      <ellipse cx="68" cy="46" rx="5" ry="3" fill="#d88466" opacity=".6"/>
      {/* muzzle */}
      <ellipse cx="50" cy="48" rx="14" ry="10" fill="#e4c9a3" stroke="#2a1a10" strokeWidth="3"/>
      <ellipse cx="50" cy="44" rx="4.5" ry="3.5" fill="#2a1a10"/>
      <path d="M 50 48 L 50 52 M 50 52 Q 46 55 44 53 M 50 52 Q 54 55 56 53" stroke="#2a1a10" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* eyes */}
      <circle cx="40" cy="32" r="3.5" fill="#2a1a10"/>
      <circle cx="60" cy="32" r="3.5" fill="#2a1a10"/>
      <circle cx="41" cy="31" r="1.2" fill="#fff"/>
      <circle cx="61" cy="31" r="1.2" fill="#fff"/>
    </g>
  ),

  // --- RABBIT --- long ears, buckteeth, blush
  Rabbit: ({ c = "#d9c4a0" }) => (
    <g>
      <ellipse cx="50" cy="70" rx="28" ry="18" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* tummy */}
      <ellipse cx="50" cy="72" rx="16" ry="10" fill="#fff" opacity=".6"/>
      <rect x="32" y="82" width="12" height="8" rx="3" fill={c} stroke="#2a1a10" strokeWidth="2.5"/>
      <rect x="56" y="82" width="12" height="8" rx="3" fill={c} stroke="#2a1a10" strokeWidth="2.5"/>
      {/* ears */}
      <ellipse cx="38" cy="14" rx="7" ry="16" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      <ellipse cx="62" cy="14" rx="7" ry="16" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      <ellipse cx="38" cy="16" rx="3" ry="10" fill="#f4b5c7"/>
      <ellipse cx="62" cy="16" rx="3" ry="10" fill="#f4b5c7"/>
      {/* head */}
      <circle cx="50" cy="42" r="22" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* blush */}
      <ellipse cx="32" cy="46" rx="5" ry="3" fill="#e58ba0" opacity=".7"/>
      <ellipse cx="68" cy="46" rx="5" ry="3" fill="#e58ba0" opacity=".7"/>
      {/* eyes */}
      <circle cx="42" cy="38" r="5" fill="#fff" stroke="#2a1a10" strokeWidth="2.5"/>
      <circle cx="58" cy="38" r="5" fill="#fff" stroke="#2a1a10" strokeWidth="2.5"/>
      <circle cx="43" cy="39" r="2.5" fill="#2a1a10"/>
      <circle cx="59" cy="39" r="2.5" fill="#2a1a10"/>
      <circle cx="44" cy="38" r="1" fill="#fff"/>
      <circle cx="60" cy="38" r="1" fill="#fff"/>
      {/* nose */}
      <path d="M 46 48 Q 50 52 54 48 Q 52 51 50 51 Q 48 51 46 48 Z" fill="#f28bbd" stroke="#2a1a10" strokeWidth="2"/>
      {/* teeth */}
      <rect x="46.5" y="51" width="3" height="6" fill="#fff" stroke="#2a1a10" strokeWidth="1.5"/>
      <rect x="50.5" y="51" width="3" height="6" fill="#fff" stroke="#2a1a10" strokeWidth="1.5"/>
      {/* whiskers */}
      <line x1="22" y1="50" x2="32" y2="50" stroke="#6b4a2e" strokeWidth="1.5"/>
      <line x1="68" y1="50" x2="78" y2="50" stroke="#6b4a2e" strokeWidth="1.5"/>
    </g>
  ),

  // --- CHICKEN --- comb, wattle, beak, wings
  Chicken: ({ c = "#fff8ea" }) => (
    <g>
      {/* body feathered */}
      <ellipse cx="50" cy="66" rx="28" ry="22" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* feather layers */}
      <path d="M 25 62 Q 30 72 25 80" stroke="#2a1a10" strokeWidth="2" fill="none"/>
      <path d="M 75 62 Q 70 72 75 80" stroke="#2a1a10" strokeWidth="2" fill="none"/>
      {/* wing */}
      <path d="M 26 60 Q 36 52 42 64 Q 36 74 26 72 Z" fill="#f2e6c8" stroke="#2a1a10" strokeWidth="2.5"/>
      {/* feet */}
      <path d="M 40 86 L 40 92 M 37 92 L 43 92 M 40 92 L 36 96 M 40 92 L 44 96" stroke="#e08a2a" strokeWidth="3" strokeLinecap="round"/>
      <path d="M 60 86 L 60 92 M 57 92 L 63 92 M 60 92 L 56 96 M 60 92 L 64 96" stroke="#e08a2a" strokeWidth="3" strokeLinecap="round"/>
      {/* head */}
      <circle cx="50" cy="36" r="22" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* comb */}
      <path d="M 38 18 Q 42 10 46 18 Q 50 8 54 18 Q 58 10 62 18 L 62 24 L 38 24 Z" fill="#e04b3b" stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
      {/* wattle */}
      <path d="M 46 52 Q 48 60 52 60 Q 56 60 54 52 Z" fill="#e04b3b" stroke="#2a1a10" strokeWidth="2.5"/>
      {/* beak */}
      <path d="M 62 40 L 78 44 L 62 48 Z" fill="#ffc93c" stroke="#2a1a10" strokeWidth="2.5" strokeLinejoin="round"/>
      <line x1="64" y1="44" x2="76" y2="44" stroke="#2a1a10" strokeWidth="1.5"/>
      {/* eye */}
      <circle cx="46" cy="38" r="5" fill="#fff" stroke="#2a1a10" strokeWidth="2.5"/>
      <circle cx="47" cy="39" r="2.5" fill="#2a1a10"/>
      <circle cx="48" cy="38" r="1" fill="#fff"/>
      {/* blush */}
      <ellipse cx="38" cy="46" rx="4" ry="2.5" fill="#e58ba0" opacity=".6"/>
    </g>
  ),

  // --- BADGER --- distinctive B&W face stripes
  Badger: ({ c = "#c7c2b5" }) => (
    <g>
      <ellipse cx="50" cy="68" rx="30" ry="20" fill="#5a564e" stroke="#2a1a10" strokeWidth="3"/>
      <ellipse cx="50" cy="72" rx="18" ry="10" fill={c}/>
      <rect x="32" y="82" width="12" height="10" rx="3" fill="#3a352e" stroke="#2a1a10" strokeWidth="2.5"/>
      <rect x="56" y="82" width="12" height="10" rx="3" fill="#3a352e" stroke="#2a1a10" strokeWidth="2.5"/>
      {/* head white base */}
      <circle cx="50" cy="40" r="24" fill="#f5f0e4" stroke="#2a1a10" strokeWidth="3"/>
      {/* black stripes */}
      <path d="M 26 36 L 40 18 L 44 40 Q 40 44 34 42 Z" fill="#2a1a10"/>
      <path d="M 74 36 L 60 18 L 56 40 Q 60 44 66 42 Z" fill="#2a1a10"/>
      {/* ears */}
      <circle cx="30" cy="20" r="6" fill="#2a1a10"/>
      <circle cx="70" cy="20" r="6" fill="#2a1a10"/>
      <circle cx="30" cy="20" r="3" fill="#e4a0a0"/>
      <circle cx="70" cy="20" r="3" fill="#e4a0a0"/>
      {/* eyes (in stripe) */}
      <circle cx="38" cy="36" r="3.5" fill="#fff"/>
      <circle cx="62" cy="36" r="3.5" fill="#fff"/>
      <circle cx="39" cy="37" r="2" fill="#2a1a10"/>
      <circle cx="63" cy="37" r="2" fill="#2a1a10"/>
      {/* muzzle */}
      <ellipse cx="50" cy="50" rx="10" ry="7" fill="#fff8ea" stroke="#2a1a10" strokeWidth="2.5"/>
      <ellipse cx="50" cy="48" rx="3" ry="2" fill="#2a1a10"/>
      <path d="M 50 50 L 50 54 M 50 54 Q 47 57 45 55 M 50 54 Q 53 57 55 55" stroke="#2a1a10" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    </g>
  ),

  // --- CAT --- tabby stripes, pointy ears, whiskers
  Cat: ({ c = "#e8b866" }) => (
    <g>
      <ellipse cx="50" cy="68" rx="28" ry="20" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      <ellipse cx="50" cy="72" rx="16" ry="10" fill="#fff" opacity=".5"/>
      {/* tabby stripes on body */}
      <path d="M 30 62 Q 28 68 30 74" stroke="#9c7838" strokeWidth="2.5" fill="none"/>
      <path d="M 70 62 Q 72 68 70 74" stroke="#9c7838" strokeWidth="2.5" fill="none"/>
      <rect x="32" y="82" width="12" height="8" rx="3" fill={c} stroke="#2a1a10" strokeWidth="2.5"/>
      <rect x="56" y="82" width="12" height="8" rx="3" fill={c} stroke="#2a1a10" strokeWidth="2.5"/>
      {/* ears */}
      <path d="M 26 22 L 36 4 L 46 26 Z" fill={c} stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M 74 22 L 64 4 L 54 26 Z" fill={c} stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M 30 22 L 36 12 L 42 24 Z" fill="#f28bbd"/>
      <path d="M 70 22 L 64 12 L 58 24 Z" fill="#f28bbd"/>
      {/* head */}
      <circle cx="50" cy="40" r="22" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* tabby stripes on forehead */}
      <path d="M 42 22 Q 42 26 44 28" stroke="#9c7838" strokeWidth="2" fill="none"/>
      <path d="M 50 20 Q 50 26 50 28" stroke="#9c7838" strokeWidth="2" fill="none"/>
      <path d="M 58 22 Q 58 26 56 28" stroke="#9c7838" strokeWidth="2" fill="none"/>
      {/* eyes (closed smug) */}
      <path d="M 36 36 Q 42 32 48 36" stroke="#2a1a10" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M 52 36 Q 58 32 64 36" stroke="#2a1a10" strokeWidth="3" fill="none" strokeLinecap="round"/>
      {/* nose */}
      <path d="M 46 46 L 50 50 L 54 46 Z" fill="#f28bbd" stroke="#2a1a10" strokeWidth="2"/>
      <path d="M 50 50 Q 48 54 46 54 M 50 50 Q 52 54 54 54" stroke="#2a1a10" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* whiskers */}
      <line x1="22" y1="46" x2="42" y2="48" stroke="#2a1a10" strokeWidth="1.5"/>
      <line x1="22" y1="52" x2="42" y2="52" stroke="#2a1a10" strokeWidth="1.5"/>
      <line x1="78" y1="46" x2="58" y2="48" stroke="#2a1a10" strokeWidth="1.5"/>
      <line x1="78" y1="52" x2="58" y2="52" stroke="#2a1a10" strokeWidth="1.5"/>
    </g>
  ),

  // --- OWL --- huge eyes, feathered chest, beak
  Owl: ({ c = "#9b7653" }) => (
    <g>
      <ellipse cx="50" cy="62" rx="32" ry="28" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* chest feather pattern */}
      <path d="M 32 62 Q 40 68 32 76 M 40 66 Q 48 72 40 80 M 50 64 Q 58 70 50 78 M 60 66 Q 52 72 60 80 M 68 62 Q 60 68 68 76"
        stroke="#6b4a2e" strokeWidth="2" fill="none"/>
      {/* lighter chest oval */}
      <ellipse cx="50" cy="62" rx="18" ry="20" fill="#c9a576" opacity=".7"/>
      {/* ear tufts */}
      <path d="M 26 26 L 32 12 L 38 26 Z" fill={c} stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M 74 26 L 68 12 L 62 26 Z" fill={c} stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
      {/* facial disk */}
      <ellipse cx="50" cy="40" rx="22" ry="18" fill="#d4b388" stroke="#2a1a10" strokeWidth="2.5"/>
      {/* eyes big */}
      <circle cx="38" cy="40" r="11" fill="#fff" stroke="#2a1a10" strokeWidth="3"/>
      <circle cx="62" cy="40" r="11" fill="#fff" stroke="#2a1a10" strokeWidth="3"/>
      <circle cx="38" cy="40" r="7" fill="#ffc93c"/>
      <circle cx="62" cy="40" r="7" fill="#ffc93c"/>
      <circle cx="38" cy="40" r="4" fill="#2a1a10"/>
      <circle cx="62" cy="40" r="4" fill="#2a1a10"/>
      <circle cx="39" cy="38" r="1.4" fill="#fff"/>
      <circle cx="63" cy="38" r="1.4" fill="#fff"/>
      {/* beak */}
      <path d="M 46 52 L 54 52 L 50 62 Z" fill="#ffc93c" stroke="#2a1a10" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* feet */}
      <path d="M 40 86 L 40 92 M 37 92 L 43 92" stroke="#e08a2a" strokeWidth="3" strokeLinecap="round"/>
      <path d="M 60 86 L 60 92 M 57 92 L 63 92" stroke="#e08a2a" strokeWidth="3" strokeLinecap="round"/>
    </g>
  ),

  // --- SHEEP --- NEW! fluffy cloud body, black face
  Sheep: ({ c = "#fff8ea" }) => (
    <g>
      {/* fluffy body made of circles */}
      {[[30,64,12],[46,58,13],[62,58,12],[74,64,11],[38,72,11],[54,74,12],[68,72,11]].map(([x,y,r],i)=>(
        <circle key={i} cx={x} cy={y} r={r} fill={c} stroke="#2a1a10" strokeWidth="2.5"/>
      ))}
      <ellipse cx="50" cy="66" rx="26" ry="14" fill={c}/>
      {/* legs */}
      <rect x="34" y="82" width="8" height="10" rx="2" fill="#2a1a10"/>
      <rect x="58" y="82" width="8" height="10" rx="2" fill="#2a1a10"/>
      {/* head */}
      <ellipse cx="50" cy="40" rx="20" ry="22" fill="#3a352e" stroke="#2a1a10" strokeWidth="3"/>
      {/* fluff on top of head */}
      <circle cx="36" cy="22" r="8" fill={c} stroke="#2a1a10" strokeWidth="2.5"/>
      <circle cx="50" cy="16" r="9" fill={c} stroke="#2a1a10" strokeWidth="2.5"/>
      <circle cx="64" cy="22" r="8" fill={c} stroke="#2a1a10" strokeWidth="2.5"/>
      {/* ears */}
      <ellipse cx="26" cy="38" rx="5" ry="8" fill="#3a352e" stroke="#2a1a10" strokeWidth="2.5" transform="rotate(-30 26 38)"/>
      <ellipse cx="74" cy="38" rx="5" ry="8" fill="#3a352e" stroke="#2a1a10" strokeWidth="2.5" transform="rotate(30 74 38)"/>
      {/* eyes */}
      <circle cx="42" cy="40" r="3" fill="#fff"/>
      <circle cx="58" cy="40" r="3" fill="#fff"/>
      <circle cx="42" cy="41" r="1.5" fill="#2a1a10"/>
      <circle cx="58" cy="41" r="1.5" fill="#2a1a10"/>
      {/* nose */}
      <ellipse cx="50" cy="50" rx="3" ry="2" fill="#fff"/>
      <path d="M 50 52 Q 48 55 46 54 M 50 52 Q 52 55 54 54" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    </g>
  ),

  // --- FROG --- NEW! bulgy eyes on top, wide grin
  Frog: ({ c = "#6cc24a" }) => (
    <g>
      <ellipse cx="50" cy="66" rx="34" ry="22" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* belly */}
      <ellipse cx="50" cy="70" rx="22" ry="12" fill="#c8e8a8" stroke="#2a1a10" strokeWidth="2"/>
      {/* legs webbed */}
      <path d="M 20 72 Q 12 84 22 90 Q 30 86 30 80" fill={c} stroke="#2a1a10" strokeWidth="2.5"/>
      <path d="M 80 72 Q 88 84 78 90 Q 70 86 70 80" fill={c} stroke="#2a1a10" strokeWidth="2.5"/>
      {/* head (same as body top) */}
      <ellipse cx="50" cy="42" rx="28" ry="20" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      {/* spots */}
      <circle cx="32" cy="50" r="3" fill="#4a8c3e"/>
      <circle cx="68" cy="48" r="2.5" fill="#4a8c3e"/>
      <circle cx="50" cy="56" r="3" fill="#4a8c3e"/>
      {/* big bulgy eyes on top */}
      <circle cx="36" cy="20" r="12" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      <circle cx="64" cy="20" r="12" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      <circle cx="36" cy="18" r="8" fill="#fff" stroke="#2a1a10" strokeWidth="2"/>
      <circle cx="64" cy="18" r="8" fill="#fff" stroke="#2a1a10" strokeWidth="2"/>
      <circle cx="37" cy="20" r="4" fill="#2a1a10"/>
      <circle cx="63" cy="20" r="4" fill="#2a1a10"/>
      <circle cx="38" cy="18" r="1.5" fill="#fff"/>
      <circle cx="64" cy="18" r="1.5" fill="#fff"/>
      {/* wide smile */}
      <path d="M 30 46 Q 50 62 70 46" stroke="#2a1a10" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M 30 46 L 70 46" stroke="#2a1a10" strokeWidth="2" fill="none" opacity=".5"/>
    </g>
  ),
};

const CHARACTERS = [
  { id: 'pig',     name: 'Pinky',     kind: 'Pig',     color: '#f4a8c0', tag: 'The Muddy Menace' },
  { id: 'fox',     name: 'Ember',     kind: 'Fox',     color: '#f08a3a', tag: 'Sly & Nimble' },
  { id: 'bear',    name: 'Biggs',     kind: 'Bear',    color: '#a0723f', tag: 'Heavy Hitter' },
  { id: 'rabbit',  name: 'Hopper',    kind: 'Rabbit',  color: '#e8dcc0', tag: 'Speedy Scamp' },
  { id: 'chicken', name: 'Clucks',    kind: 'Chicken', color: '#fff8ea', tag: 'Egg-cellent' },
  { id: 'badger',  name: 'Bramble',   kind: 'Badger',  color: '#c7c2b5', tag: 'Grumpy Digger' },
  { id: 'cat',     name: 'Marmalade', kind: 'Cat',     color: '#e8b866', tag: 'Cool Customer' },
  { id: 'owl',     name: 'Professor', kind: 'Owl',     color: '#9b7653', tag: 'Wise Guy' },
  { id: 'sheep',   name: 'Woolly',    kind: 'Sheep',   color: '#fff8ea', tag: 'Fluff Unit' },
  { id: 'frog',    name: 'Ribbit',    kind: 'Frog',    color: '#6cc24a', tag: 'Hop Star' },
];

function Avatar({ char, size = 80, bob = false, extra = '' }) {
  const Shape = CharShapes[char.kind];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}
         className={(bob ? 'bob ' : '') + extra}
         style={{ overflow:'visible', filter:'drop-shadow(0 4px 0 rgba(0,0,0,.25))' }}>
      <Shape c={char.color} />
    </svg>
  );
}

window.CHARACTERS = CHARACTERS;
window.Avatar = Avatar;
window.CharShapes = CharShapes;
