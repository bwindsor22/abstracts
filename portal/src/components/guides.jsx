import React from 'react';

// ── Shared SVG helpers ──────────────────────────────────────────────────────────
const W = 240, H = 140;
const Svg = ({ children }) => (
  <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="ah" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="#ffe066" />
      </marker>
      <marker id="ah-w" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="#f0eeff" />
      </marker>
    </defs>
    {children}
  </svg>
);

const arrow = (x1, y1, x2, y2, color) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2}
    stroke={color || '#ffe066'} strokeWidth={2}
    markerEnd={color ? 'url(#ah-w)' : 'url(#ah)'} />
);

const hexPts = (cx, cy, r) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 3 * i - Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');

const Hex = ({ cx, cy, r = 16, fill = 'none', stroke = 'rgba(153,66,240,0.3)', sw = 1 }) => (
  <polygon points={hexPts(cx, cy, r)} fill={fill} stroke={stroke} strokeWidth={sw} />
);

const Stone = ({ cx, cy, r = 10, fill = '#f5f5f5', stroke }) => (
  <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke || 'none'} strokeWidth={stroke ? 1.5 : 0} />
);

const Txt = ({ x, y, children, size = 10, fill = '#f0eeff', anchor = 'middle' }) => (
  <text x={x} y={y} textAnchor={anchor} dominantBaseline="middle"
    fill={fill} fontSize={size} fontFamily="'Space Grotesk',sans-serif" fontWeight="600">
    {children}
  </text>
);

const dim = 'rgba(153,66,240,0.25)';
const purple = '#9942f0';
const yellow = '#ffe066';
const white = '#f5f5f5';
const dark = '#444';
const board = 'rgba(42,31,69,0.5)';

// ── HEXES (Hex) ─────────────────────────────────────────────────────────────────
const hexesGuide = [
  {
    caption: 'Place one stone per turn on any empty hex.',
    svg: <Svg>
      {/* small hex grid */}
      {[[80,40],[120,40],[160,40],[60,75],[100,75],[140,75],[180,75],[80,110],[120,110],[160,110]].map(([x,y],i) =>
        <Hex key={i} cx={x} cy={y} />
      )}
      <Stone cx={120} cy={40} fill={white} />
      <Stone cx={140} cy={75} fill={dark} stroke="#333" />
      {/* new stone being placed */}
      <Stone cx={100} cy={75} fill={white} />
      <circle cx={100} cy={75} r={14} fill="none" stroke={yellow} strokeWidth={2} strokeDasharray="4 3" />
    </Svg>
  },
  {
    caption: 'Connect your two sides with an unbroken chain to win.',
    svg: <Svg>
      {/* borders */}
      <line x1={30} y1={15} x2={30} y2={125} stroke="#e74c3c" strokeWidth={4} strokeLinecap="round" />
      <line x1={210} y1={15} x2={210} y2={125} stroke="#e74c3c" strokeWidth={4} strokeLinecap="round" />
      <line x1={50} y1={12} x2={190} y2={12} stroke="#3498db" strokeWidth={4} strokeLinecap="round" />
      <line x1={50} y1={128} x2={190} y2={128} stroke="#3498db" strokeWidth={4} strokeLinecap="round" />
      {/* winning red path left→right */}
      {[[50,70],[80,55],[110,70],[140,55],[170,70],[200,55]].map(([x,y],i) =>
        <React.Fragment key={i}>
          <Stone cx={x} cy={y} r={11} fill="#e74c3c" />
          {i < 5 && <line x1={x+8} y1={y} x2={x+22} y2={y+(i%2?15:-15)} stroke={yellow} strokeWidth={1.5} />}
        </React.Fragment>
      )}
      <Txt x={120} y={128} size={9} fill="#5599dd">← blue connects top/bottom →</Txt>
    </Svg>
  },
  {
    caption: 'Block your opponent while building your own path.',
    svg: <Svg>
      {[[70,35],[110,35],[150,35],[50,70],[90,70],[130,70],[170,70],[70,105],[110,105],[150,105]].map(([x,y],i) =>
        <Hex key={i} cx={x} cy={y} />
      )}
      {/* red path going */}
      <Stone cx={70} cy={35} r={10} fill="#e74c3c" />
      <Stone cx={90} cy={70} r={10} fill="#e74c3c" />
      <Stone cx={110} cy={105} r={10} fill="#e74c3c" />
      {/* blue blocking */}
      <Stone cx={110} cy={35} r={10} fill="#3498db" />
      <Stone cx={130} cy={70} r={10} fill="#3498db" />
      {/* X on blocked path */}
      <Txt x={110} y={70} size={14} fill={yellow}>✕</Txt>
    </Svg>
  },
  {
    caption: 'After the first move, you may swap instead of placing.',
    svg: <Svg>
      {[[90,50],[130,50],[170,50],[70,85],[110,85],[150,85]].map(([x,y],i) =>
        <Hex key={i} cx={x} cy={y} />
      )}
      <Stone cx={130} cy={50} r={10} fill="#e74c3c" />
      <Txt x={130} y={50} size={8} fill="#191022">1</Txt>
      {/* swap arrows */}
      <path d="M 105,22 C 130,8 145,8 165,22" fill="none" stroke={yellow} strokeWidth={1.5} />
      <Txt x={135} y={15} size={9} fill={yellow}>swap?</Txt>
      {/* result */}
      <Stone cx={130} cy={100} r={8} fill="#3498db" />
      <Txt x={152} y={100} size={9} fill="rgba(240,238,255,0.5)" anchor="start">becomes yours</Txt>
    </Svg>
  },
];

// ── MARBLES (Abalone) ───────────────────────────────────────────────────────────
const marblesGuide = [
  {
    caption: 'Push 1, 2, or 3 of your marbles in a straight line.',
    svg: <Svg>
      <Stone cx={60} cy={70} r={14} fill={white} stroke="#ddd" />
      <Stone cx={95} cy={70} r={14} fill={white} stroke="#ddd" />
      <Stone cx={130} cy={70} r={14} fill={white} stroke="#ddd" />
      {arrow(155, 70, 190, 70)}
      <Txt x={120} y={110} size={9} fill="rgba(240,238,255,0.4)">select a line, push in that direction</Txt>
    </Svg>
  },
  {
    caption: 'Outnumber to push opponents off: 2 beats 1, 3 beats 2.',
    svg: <Svg>
      <Stone cx={50} cy={50} r={13} fill={white} stroke="#ddd" />
      <Stone cx={82} cy={50} r={13} fill={white} stroke="#ddd" />
      <Stone cx={114} cy={50} r={13} fill={dark} stroke="#333" />
      {arrow(132, 50, 160, 50)}
      <Txt x={172} y={50} size={9} fill={yellow}>2 → 1</Txt>
      <Stone cx={45} cy={95} r={13} fill={white} stroke="#ddd" />
      <Stone cx={77} cy={95} r={13} fill={white} stroke="#ddd" />
      <Stone cx={109} cy={95} r={13} fill={white} stroke="#ddd" />
      <Stone cx={141} cy={95} r={13} fill={dark} stroke="#333" />
      <Stone cx={173} cy={95} r={13} fill={dark} stroke="#333" />
      {arrow(191, 95, 210, 95)}
      <Txt x={225} y={95} size={9} fill={yellow}>3→2</Txt>
    </Svg>
  },
  {
    caption: 'Equal groups cannot push each other.',
    svg: <Svg>
      <Stone cx={60} cy={70} r={14} fill={white} stroke="#ddd" />
      <Stone cx={95} cy={70} r={14} fill={white} stroke="#ddd" />
      <Stone cx={135} cy={70} r={14} fill={dark} stroke="#333" />
      <Stone cx={170} cy={70} r={14} fill={dark} stroke="#333" />
      <Txt x={117} y={70} size={18} fill="#ff6b6b">✕</Txt>
      <Txt x={120} y={110} size={9} fill="rgba(240,238,255,0.4)">2 vs 2 — no push</Txt>
    </Svg>
  },
  {
    caption: 'Push 6 opponent marbles off the edge to win.',
    svg: <Svg>
      {/* board edge */}
      <path d="M 30,70 L 90,25 L 200,25 L 200,70" fill="none" stroke={dim} strokeWidth={2} />
      <Stone cx={120} cy={50} r={13} fill={white} stroke="#ddd" />
      <Stone cx={152} cy={50} r={13} fill={white} stroke="#ddd" />
      <Stone cx={184} cy={50} r={13} fill={dark} stroke="#333" />
      {arrow(200, 50, 220, 50)}
      {/* falling marble */}
      <Stone cx={225} cy={65} r={10} fill={dark} stroke="#333" />
      <Txt x={225} y={82} size={8} fill="#ff6b6b">off!</Txt>
      {/* score */}
      <Txt x={120} y={110} size={9} fill="rgba(240,238,255,0.5)">push 6 off to win</Txt>
    </Svg>
  },
];

// ── WALLS (Quoridor) ────────────────────────────────────────────────────────────
const wallsGuide = [
  {
    caption: 'Move your pawn one step in any direction.',
    svg: <Svg>
      {/* grid */}
      {[0,1,2,3,4].map(r => [0,1,2,3,4].map(c =>
        <rect key={`${r},${c}`} x={50+c*32} y={10+r*26} width={28} height={22}
          fill="rgba(42,31,69,0.4)" stroke={dim} strokeWidth={1} rx={3} />
      ))}
      {/* pawn */}
      <Stone cx={114} cy={73} r={9} fill={white} />
      {/* arrows */}
      {arrow(114, 60, 114, 30)}
      {arrow(114, 86, 114, 105)}
      {arrow(100, 73, 80, 73)}
      {arrow(128, 73, 148, 73)}
    </Svg>
  },
  {
    caption: 'Or place a wall to block your opponent\'s path.',
    svg: <Svg>
      {[0,1,2,3,4].map(r => [0,1,2,3,4].map(c =>
        <rect key={`${r},${c}`} x={50+c*32} y={10+r*26} width={28} height={22}
          fill="rgba(42,31,69,0.4)" stroke={dim} strokeWidth={1} rx={3} />
      ))}
      <Stone cx={114} cy={21} r={8} fill={dark} stroke="#333" />
      <Stone cx={114} cy={99} r={8} fill={white} />
      {/* wall */}
      <rect x={108} y={54} width={60} height={5} rx={2} fill={yellow} />
      <Txt x={165} y={43} size={9} fill={yellow}>wall</Txt>
    </Svg>
  },
  {
    caption: 'Walls can\'t fully block — a path must always remain.',
    svg: <Svg>
      {[0,1,2,3].map(r => [0,1,2,3].map(c =>
        <rect key={`${r},${c}`} x={55+c*36} y={15+r*30} width={32} height={26}
          fill="rgba(42,31,69,0.4)" stroke={dim} strokeWidth={1} rx={3} />
      ))}
      {/* walls blocking most paths */}
      <rect x={85} y={40} width={70} height={4} rx={2} fill="rgba(255,100,100,0.6)" />
      <rect x={55} y={70} width={70} height={4} rx={2} fill="rgba(255,100,100,0.6)" />
      {/* path still exists */}
      <path d="M 107,25 L 107,38 L 160,38 L 160,68 L 130,68 L 130,95 L 107,95 L 107,125"
        fill="none" stroke={yellow} strokeWidth={1.5} strokeDasharray="4 3" />
      <Txt x={195} y={70} size={9} fill={yellow}>path ok</Txt>
    </Svg>
  },
  {
    caption: 'First pawn to reach the opposite side wins.',
    svg: <Svg>
      {/* simplified board */}
      <rect x={50} y={15} width={145} height={110} fill="rgba(42,31,69,0.3)" rx={6} stroke={dim} />
      {/* goal rows */}
      <rect x={50} y={15} width={145} height={22} fill="rgba(100,100,255,0.12)" rx={6} />
      <rect x={50} y={103} width={145} height={22} fill="rgba(255,255,255,0.06)" rx={6} />
      <Txt x={122} y={26} size={8} fill="rgba(100,100,255,0.5)">opponent's goal</Txt>
      <Txt x={122} y={114} size={8} fill="rgba(240,238,255,0.3)">your goal</Txt>
      {/* pawns */}
      <Stone cx={90} cy={92} r={8} fill={dark} stroke="#333" />
      {arrow(90, 82, 90, 40)}
      <Stone cx={155} cy={48} r={8} fill={white} />
      {arrow(155, 58, 155, 100)}
    </Svg>
  },
];

// ── BUGS (Hive) ─────────────────────────────────────────────────────────────────
const bugsGuide = [
  {
    caption: 'Place new pieces touching only your own color.',
    svg: <Svg>
      <Hex cx={100} cy={70} r={20} fill="rgba(255,255,255,0.12)" stroke="#ddd" sw={1.5} />
      <Hex cx={140} cy={70} r={20} fill="rgba(255,255,255,0.12)" stroke="#ddd" sw={1.5} />
      <Hex cx={120} cy={36} r={20} fill="rgba(80,80,80,0.3)" stroke="#555" sw={1.5} />
      <Txt x={100} y={70} size={11}>A</Txt>
      <Txt x={140} y={70} size={11}>Q</Txt>
      <Txt x={120} y={36} size={11} fill="#aaa">G</Txt>
      {/* new piece placed touching white only */}
      <Hex cx={80} cy={36} r={20} fill="rgba(255,255,255,0.12)" stroke={yellow} sw={2} />
      <Txt x={80} y={36} size={11} fill={yellow}>S</Txt>
      <Txt x={80} y={15} size={8} fill={yellow}>new</Txt>
      {/* X on touching opponent */}
      <Hex cx={160} cy={36} r={20} fill="none" stroke="rgba(255,100,100,0.4)" sw={1.5} strokeDasharray="4 3" />
      <Txt x={160} y={36} size={14} fill="#ff6b6b">✕</Txt>
    </Svg>
  },
  {
    caption: 'Your Queen must be placed by your 4th turn.',
    svg: <Svg>
      <Hex cx={120} cy={70} r={24} fill="rgba(255,215,0,0.15)" stroke="#FFD700" sw={2} />
      <Txt x={120} y={65} size={16} fill="#FFD700">Q</Txt>
      <Txt x={120} y={85} size={8} fill="rgba(240,238,255,0.5)">Queen</Txt>
      <Txt x={120} y={115} size={9} fill="rgba(240,238,255,0.4)">must place before turn 5</Txt>
      <Txt x={120} y={30} size={9} fill="rgba(240,238,255,0.4)">moves 1 space — protect her!</Txt>
    </Svg>
  },
  {
    caption: 'Surround the opponent\'s Queen on all 6 sides to win.',
    svg: <Svg>
      {/* center queen */}
      <Hex cx={120} cy={70} r={18} fill="rgba(80,80,80,0.3)" stroke="#555" sw={1.5} />
      <Txt x={120} y={70} size={12} fill="#aaa">Q</Txt>
      {/* surrounding pieces */}
      {[[120,38],[152,54],[152,86],[120,102],[88,86],[88,54]].map(([x,y],i) =>
        <React.Fragment key={i}>
          <Hex cx={x} cy={y} r={18} fill={i<4 ? 'rgba(255,255,255,0.12)' : 'rgba(80,80,80,0.3)'} stroke={i<4 ? '#ddd' : '#555'} sw={1.5} />
          <Txt x={x} y={y} size={10} fill={i<4 ? '#f0eeff' : '#aaa'}>{['A','B','S','G','A','B'][i]}</Txt>
        </React.Fragment>
      )}
      <Txt x={120} y={130} size={9} fill={yellow}>surrounded — you win!</Txt>
    </Svg>
  },
  {
    caption: 'A piece can\'t move if removing it would split the hive.',
    svg: <Svg>
      {/* chain of pieces */}
      {[[60,70],[95,70],[130,70],[165,70],[200,70]].map(([x,y],i) =>
        <Hex key={i} cx={x} cy={y} r={18} fill="rgba(255,255,255,0.12)" stroke="#ddd" sw={1.5} />
      )}
      <Hex cx={95} cy={38} r={18} fill="rgba(80,80,80,0.3)" stroke="#555" sw={1.5} />
      {/* bridge piece can't move */}
      <Hex cx={130} cy={70} r={18} fill="rgba(255,100,100,0.15)" stroke="#ff6b6b" sw={2} />
      <Txt x={130} y={70} size={10}>A</Txt>
      <Txt x={130} y={105} size={8} fill="#ff6b6b">can't move</Txt>
      {/* break indicator */}
      <line x1={130} y1={55} x2={130} y2={30} stroke="#ff6b6b" strokeWidth={1} strokeDasharray="3 3" />
      <Txt x={130} y={22} size={8} fill="#ff6b6b">would split!</Txt>
    </Svg>
  },
  {
    caption: 'Ant: any distance. Spider: exactly 3. Beetle: climbs. Hopper: jumps.',
    svg: <Svg>
      {/* Ant */}
      <Hex cx={40} cy={35} r={14} fill="rgba(52,152,219,0.2)" stroke="#3498db" sw={1.5} />
      <Txt x={40} y={35} size={10} fill="#3498db">A</Txt>
      <path d="M 58,35 Q 80,15 100,35 Q 120,55 100,75" fill="none" stroke="#3498db" strokeWidth={1.5} strokeDasharray="3 3" />
      <Txt x={80} y={22} size={7} fill="#3498db">unlimited</Txt>
      {/* Spider */}
      <Hex cx={140} cy={35} r={14} fill="rgba(230,126,34,0.2)" stroke="#e67e22" sw={1.5} />
      <Txt x={140} y={35} size={10} fill="#e67e22">S</Txt>
      <Txt x={182} y={35} size={8} fill="#e67e22">3 steps</Txt>
      {/* Beetle */}
      <Hex cx={40} cy={105} r={14} fill="rgba(155,89,182,0.2)" stroke="#9b59b6" sw={1.5} />
      <Txt x={40} y={105} size={10} fill="#9b59b6">B</Txt>
      <Txt x={78} y={105} size={8} fill="#9b59b6" anchor="start">climbs on top</Txt>
      {/* Grasshopper */}
      <Hex cx={140} cy={105} r={14} fill="rgba(46,204,113,0.2)" stroke="#2ecc71" sw={1.5} />
      <Txt x={140} y={105} size={10} fill="#2ecc71">G</Txt>
      <Txt x={178} y={105} size={8} fill="#2ecc71" anchor="start">jumps over</Txt>
    </Svg>
  },
];

// ── CIRCLES (YINSH) ─────────────────────────────────────────────────────────────
const circlesGuide = [
  {
    caption: 'Move a ring — it leaves a marker behind and flips markers it crosses.',
    svg: <Svg>
      {/* BEFORE label */}
      <Txt x={60} y={12} size={8} fill="rgba(240,238,255,0.35)">BEFORE</Txt>
      {/* before: ring at left, two dark markers in the way */}
      <circle cx={30} cy={35} r={12} fill="none" stroke={white} strokeWidth={2.5} />
      <Stone cx={60} cy={35} r={6} fill={dark} stroke="#333" />
      <Stone cx={90} cy={35} r={6} fill={dark} stroke="#333" />
      <circle cx={120} cy={35} r={4} fill="none" stroke={dim} strokeWidth={1} />
      {/* arrow */}
      {arrow(135, 35, 155, 65)}
      {/* AFTER label */}
      <Txt x={60} y={72} size={8} fill="rgba(240,238,255,0.35)">AFTER</Txt>
      {/* after: marker left behind at ring's origin, flipped markers, ring at new spot */}
      <Stone cx={30} cy={95} r={6} fill={white} />
      <Txt x={30} y={110} size={7} fill="rgba(240,238,255,0.3)">left behind</Txt>
      <Stone cx={60} cy={95} r={6} fill={white} />
      <Txt x={75} y={88} size={7} fill={yellow}>flipped</Txt>
      <Stone cx={90} cy={95} r={6} fill={white} />
      <circle cx={120} cy={95} r={12} fill="none" stroke={white} strokeWidth={2.5} />
      <Txt x={120} y={115} size={7} fill="rgba(240,238,255,0.3)">ring moved</Txt>
    </Svg>
  },
  {
    caption: 'Get 5 of your color in a row.',
    svg: <Svg>
      {[0,1,2,3,4].map(i =>
        <Stone key={i} cx={55 + i * 34} cy={65} r={10} fill={white} />
      )}
      {/* highlight bracket */}
      <line x1={45} y1={85} x2={193} y2={85} stroke={yellow} strokeWidth={2} />
      <Txt x={120} y={100} size={10} fill={yellow}>5 in a row!</Txt>
      {/* some opponent markers scattered */}
      <Stone cx={70} cy={35} r={7} fill={dark} stroke="#333" />
      <Stone cx={140} cy={35} r={7} fill={dark} stroke="#333" />
    </Svg>
  },
  {
    caption: 'Remove the 5 markers and one of your rings.',
    svg: <Svg>
      {/* 5 markers fading out */}
      {[0,1,2,3,4].map(i =>
        <Stone key={i} cx={55 + i * 34} cy={45} r={9} fill={white} stroke="rgba(255,255,255,0.3)" />
      )}
      <line x1={40} y1={45} x2={200} y2={45} stroke="#ff6b6b" strokeWidth={1.5} />
      <Txt x={215} y={45} size={8} fill="#ff6b6b">gone</Txt>
      {/* ring removed */}
      <circle cx={120} cy={95} r={14} fill="none" stroke={white} strokeWidth={3} />
      {arrow(138, 95, 180, 95)}
      <Txt x={200} y={95} size={9} fill={yellow}>+1 ring</Txt>
    </Svg>
  },
  {
    caption: 'First to remove 3 rings wins.',
    svg: <Svg>
      {/* 3 collected rings */}
      {[0,1,2].map(i =>
        <circle key={i} cx={85 + i * 35} cy={60} r={14} fill="none" stroke={white} strokeWidth={3} />
      )}
      <Txt x={120} y={95} size={11} fill={yellow}>3 rings removed = victory!</Txt>
      {/* check marks */}
      {[0,1,2].map(i =>
        <Txt key={i} x={85 + i * 35} y={60} size={14} fill={yellow}>✓</Txt>
      )}
    </Svg>
  },
];

// ── STACKS (Tak) ────────────────────────────────────────────────────────────────
const stacksGuide = [
  {
    caption: 'Place flat stones — they form your road.',
    svg: <Svg>
      {/* 5x3 grid to show board context */}
      {[0,1,2].map(r => [0,1,2,3,4].map(c =>
        <rect key={`${r}${c}`} x={30+c*38} y={25+r*32} width={34} height={28} fill={board} stroke={dim} rx={3} />
      ))}
      {/* flat stones on some cells */}
      <rect x={37} y={30} width={20} height={6} fill={white} rx={2} />
      <rect x={75} y={30} width={20} height={6} fill={white} rx={2} />
      <rect x={113} y={30} width={20} height={6} fill={dark} rx={2} />
      {/* new stone being placed */}
      <rect x={151} y={30} width={20} height={6} fill={white} rx={2} />
      <circle cx={161} cy={33} r={18} fill="none" stroke={yellow} strokeWidth={1.5} strokeDasharray="3 3" />
      <Txt x={120} y={120} size={9} fill="rgba(240,238,255,0.4)">flat stones are road pieces</Txt>
    </Svg>
  },
  {
    caption: 'Standing stones block roads and movement.',
    svg: <Svg>
      {[0,1,2,3].map(c =>
        <rect key={c} x={45+c*42} y={55} width={38} height={30} fill={board} stroke={dim} rx={3} />
      )}
      <rect x={60} y={58} width={24} height={6} fill={white} rx={2} />
      {/* standing stone */}
      <rect x={106} y={42} width={6} height={24} fill={white} rx={2} />
      <Txt x={108} y={32} size={8} fill={yellow}>wall</Txt>
      <rect x={148} y={58} width={24} height={6} fill={dark} rx={2} />
      {/* X showing blocked */}
      <Txt x={108} y={70} size={12} fill="#ff6b6b">✕</Txt>
    </Svg>
  },
  {
    caption: 'Pick up a stack and drop pieces as you move.',
    svg: <Svg>
      {[0,1,2,3].map(c =>
        <rect key={c} x={40+c*48} y={55} width={44} height={32} fill={board} stroke={dim} rx={3} />
      )}
      {/* stack on first cell */}
      {[0,1,2].map(i =>
        <rect key={i} x={48} y={64-i*7} width={28} height={6} fill={i===2 ? white : dark} rx={2} />
      )}{/* arrow showing carry */}
      {arrow(82, 60, 98, 60)}
      {/* dropped pieces */}
      <rect x={96} y={64} width={28} height={6} fill={dark} rx={2} />
      <rect x={144} y={64} width={28} height={6} fill={dark} rx={2} />
      <rect x={192} y={64} width={28} height={6} fill={white} rx={2} />
      <Txt x={120} y={110} size={9} fill="rgba(240,238,255,0.4)">carry up to stack height, drop 1+ per cell</Txt>
    </Svg>
  },
  {
    caption: 'Connect two sides with an unbroken line of flat stones to win.',
    svg: <Svg>
      {/* borders */}
      <line x1={35} y1={20} x2={35} y2={120} stroke={white} strokeWidth={3} strokeLinecap="round" />
      <line x1={205} y1={20} x2={205} y2={120} stroke={white} strokeWidth={3} strokeLinecap="round" />
      {/* 5x5 grid simplified */}
      {[0,1,2,3,4].map(r => [0,1,2,3,4].map(c =>
        <rect key={`${r}${c}`} x={40+c*33} y={20+r*20} width={30} height={18} fill={board} stroke={dim} rx={2} />
      ))}
      {/* road path */}
      {[[0,1],[1,1],[2,2],[3,2],[4,2]].map(([c,r]) =>
        <rect key={`r${c}${r}`} x={43+c*33} y={23+r*20} width={24} height={5} fill={yellow} rx={2} />
      )}
    </Svg>
  },
];

// ── TOWERS (Santorini) ──────────────────────────────────────────────────────────
const towersGuide = [
  {
    caption: 'Move one worker to any adjacent space.',
    svg: <Svg>
      {[0,1,2].map(r => [0,1,2].map(c =>
        <rect key={`${r}${c}`} x={60+c*42} y={20+r*38} width={38} height={34} fill={board} stroke={dim} rx={4} />
      ))}
      {/* worker */}
      <Stone cx={122} cy={75} r={10} fill={white} />
      {/* arrows to adjacent */}
      {arrow(122, 60, 122, 42)}
      {arrow(108, 68, 90, 55)}
      {arrow(136, 68, 155, 55)}
      {arrow(108, 82, 90, 98)}
    </Svg>
  },
  {
    caption: 'After moving, build one level on any adjacent space.',
    svg: <Svg>
      {[0,1,2].map(r => [0,1,2].map(c =>
        <rect key={`${r}${c}`} x={60+c*42} y={25+r*36} width={38} height={32} fill={board} stroke={dim} rx={4} />
      ))}
      {/* worker at center */}
      <Stone cx={122} cy={77} r={10} fill={white} />
      {/* level being built */}
      <rect x={145} y={55} width={30} height={8} fill={yellow} rx={2} />
      <Txt x={160} y={50} size={8} fill={yellow}>+1 level</Txt>
      {/* existing level on another cell */}
      <rect x={63} y={52} width={32} height={8} fill="rgba(240,238,255,0.2)" rx={2} />
      <Txt x={79} y={47} size={7} fill="rgba(240,238,255,0.4)">lv 1</Txt>
    </Svg>
  },
  {
    caption: 'Climb up only 1 level at a time. Domes block entry.',
    svg: <Svg>
      {/* stepped tower */}
      {[0,1,2,3].map(i =>
        <React.Fragment key={i}>
          <rect x={40+i*48} y={85-i*15} width={40} height={12+i*15} fill="rgba(42,31,69,0.4)" stroke={dim} rx={3} />
          <Txt x={60+i*48} y={92} size={8} fill="rgba(240,238,255,0.4)">{i}</Txt>
        </React.Fragment>
      )}
      {/* worker climbing */}
      <Stone cx={60} cy={72} r={8} fill={white} />
      {arrow(72, 65, 95, 58)}
      <Txt x={105} y={50} size={8} fill={yellow}>ok: +1</Txt>
      {/* can't jump 2 */}
      <line x1={70} y1={60} x2={150} y2={38} stroke="#ff6b6b" strokeWidth={1.5} strokeDasharray="3 3" />
      <Txt x={150} y={30} size={8} fill="#ff6b6b">too high</Txt>
      {/* dome */}
      <path d="M 178,43 Q 188,28 198,43" fill="rgba(100,100,255,0.3)" stroke="rgba(100,100,255,0.6)" strokeWidth={1.5} />
      <Txt x={188} y={25} size={7} fill="rgba(100,100,255,0.6)">dome</Txt>
    </Svg>
  },
  {
    caption: 'Step onto level 3 to win!',
    svg: <Svg>
      {/* tower of 3 levels */}
      <rect x={90} y={30} width={60} height={80} fill="rgba(42,31,69,0.4)" stroke={dim} rx={4} />
      <rect x={95} y={85} width={50} height={20} fill="rgba(240,238,255,0.1)" rx={2} />
      <rect x={98} y={65} width={44} height={20} fill="rgba(240,238,255,0.15)" rx={2} />
      <rect x={101} y={45} width={38} height={20} fill="rgba(240,238,255,0.2)" rx={2} />
      <Txt x={120} y={95} size={8}>1</Txt>
      <Txt x={120} y={75} size={8}>2</Txt>
      <Txt x={120} y={55} size={8}>3</Txt>
      {/* worker on top */}
      <Stone cx={120} cy={38} r={9} fill={white} />
      <Txt x={120} y={22} size={10} fill={yellow}>you win!</Txt>
    </Svg>
  },
];

// ── TREES (Photosynthesis) ──────────────────────────────────────────────────────
const treesGuide = [
  {
    caption: 'Trees in sunlight earn light points each round.',
    svg: <Svg>
      {/* sun */}
      <circle cx={30} cy={35} r={18} fill="#FFD700" opacity={0.8} />
      <Txt x={30} y={35} size={14} fill="#191022">☀</Txt>
      {/* light rays */}
      {[50,70,90].map(y =>
        <line key={y} x1={48} y1={y-15} x2={80} y2={y} stroke="rgba(255,215,0,0.3)" strokeWidth={1.5} />
      )}
      {/* trees of different sizes */}
      <rect x={85} y={75} width={4} height={20} fill="#8B4513" />
      <circle cx={87} cy={68} r={10} fill="#2d8a4e" />
      <Txt x={87} y={100} size={7} fill="rgba(240,238,255,0.4)">+1 LP</Txt>
      <rect x={130} y={60} width={6} height={35} fill="#8B4513" />
      <circle cx={133} cy={50} r={16} fill="#2d8a4e" />
      <Txt x={133} y={100} size={7} fill="rgba(240,238,255,0.4)">+2 LP</Txt>
      <rect x={180} y={45} width={8} height={50} fill="#8B4513" />
      <circle cx={184} cy={32} r={22} fill="#2d8a4e" />
      <Txt x={184} y={100} size={7} fill="rgba(240,238,255,0.4)">+3 LP</Txt>
    </Svg>
  },
  {
    caption: 'Spend light points to buy seeds and trees from your store.',
    svg: <Svg>
      {/* LP tokens */}
      <circle cx={40} cy={40} r={15} fill="rgba(255,215,0,0.2)" stroke="#FFD700" strokeWidth={1.5} />
      <Txt x={40} y={40} size={11} fill="#FFD700">LP</Txt>
      {arrow(60, 40, 85, 40)}
      {/* store items */}
      <rect x={92} y={25} width={130} height={35} fill={board} stroke={dim} rx={6} />
      <circle cx={115} cy={42} r={5} fill="#8B4513" />
      <Txt x={115} y={55} size={7} fill="rgba(240,238,255,0.4)">seed</Txt>
      <circle cx={150} cy={38} r={8} fill="#2d8a4e" />
      <Txt x={150} y={55} size={7} fill="rgba(240,238,255,0.4)">small</Txt>
      <circle cx={190} cy={35} r={12} fill="#2d8a4e" />
      <Txt x={190} y={55} size={7} fill="rgba(240,238,255,0.4)">large</Txt>
      <Txt x={120} y={95} size={9} fill="rgba(240,238,255,0.4)">buy from store, then place on the board</Txt>
    </Svg>
  },
  {
    caption: 'Grow your trees: seed → small → medium → large.',
    svg: <Svg>
      {/* growth chain */}
      <circle cx={35} cy={65} r={5} fill="#8B4513" />
      <Txt x={35} y={82} size={7} fill="rgba(240,238,255,0.4)">seed</Txt>
      {arrow(45, 65, 65, 65)}
      <rect x={72} y={60} width={3} height={15} fill="#8B4513" />
      <circle cx={74} cy={55} r={8} fill="#2d8a4e" />
      <Txt x={74} y={82} size={7} fill="rgba(240,238,255,0.4)">small</Txt>
      {arrow(87, 65, 107, 65)}
      <rect x={116} y={50} width={5} height={25} fill="#8B4513" />
      <circle cx={119} cy={43} r={13} fill="#2d8a4e" />
      <Txt x={119} y={82} size={7} fill="rgba(240,238,255,0.4)">med</Txt>
      {arrow(137, 65, 157, 65)}
      <rect x={168} y={38} width={7} height={37} fill="#8B4513" />
      <circle cx={172} cy={28} r={18} fill="#2d8a4e" />
      <Txt x={172} y={82} size={7} fill="rgba(240,238,255,0.4)">large</Txt>
      <Txt x={120} y={115} size={9} fill={yellow}>spend LP to grow each stage</Txt>
    </Svg>
  },
  {
    caption: 'Harvest a large tree for victory points. Most VP wins!',
    svg: <Svg>
      {/* large tree */}
      <rect x={55} y={40} width={7} height={45} fill="#8B4513" />
      <circle cx={59} cy={28} r={20} fill="#2d8a4e" />
      {arrow(82, 55, 120, 55)}
      {/* VP token */}
      <circle cx={145} cy={55} r={20} fill="rgba(153,66,240,0.2)" stroke={purple} strokeWidth={2} />
      <Txt x={145} y={55} size={11} fill={purple}>VP</Txt>
      <Txt x={120} y={105} size={9} fill="rgba(240,238,255,0.4)">center hexes score higher VP</Txt>
    </Svg>
  },
];

// ── BRIDGES (TwixT) ─────────────────────────────────────────────────────────────
const bridgesGuide = [
  {
    caption: 'Place pegs on the board, one per turn.',
    svg: <Svg>
      {/* dot grid */}
      {[0,1,2,3,4].map(r => [0,1,2,3,4].map(c =>
        <circle key={`${r}${c}`} cx={50+c*36} cy={20+r*26} r={3} fill={dim} />
      ))}
      {/* placed pegs */}
      <Stone cx={86} cy={46} r={7} fill={white} />
      <Stone cx={122} cy={72} r={7} fill={dark} stroke="#333" />
      {/* new peg */}
      <Stone cx={158} cy={46} r={7} fill={white} />
      <circle cx={158} cy={46} r={11} fill="none" stroke={yellow} strokeWidth={1.5} strokeDasharray="3 3" />
    </Svg>
  },
  {
    caption: 'Pegs a knight\'s move apart link automatically.',
    svg: <Svg>
      {/* dot grid */}
      {[0,1,2,3].map(r => [0,1,2,3,4].map(c =>
        <circle key={`${r}${c}`} cx={40+c*40} cy={20+r*32} r={3} fill={dim} />
      ))}
      {/* two pegs with link: 2 cols apart, 1 row apart = knight move */}
      <Stone cx={80} cy={52} r={7} fill={white} />
      <Stone cx={160} cy={20} r={7} fill={white} />
      <line x1={80} y1={52} x2={160} y2={20} stroke={white} strokeWidth={2.5} />
      {/* knight move annotation: 2 wide × 1 tall */}
      <rect x={80} y={20} width={80} height={32} fill="none" stroke={yellow} strokeWidth={1} strokeDasharray="3 3" />
      <Txt x={120} y={100} size={8} fill={yellow}>2 across, 1 up</Txt>
    </Svg>
  },
  {
    caption: 'Bridges cannot cross each other.',
    svg: <Svg>
      <Stone cx={60} cy={40} r={7} fill={white} />
      <Stone cx={100} cy={80} r={7} fill={white} />
      <line x1={60} y1={40} x2={100} y2={80} stroke={white} strokeWidth={2.5} />
      <Stone cx={100} cy={40} r={7} fill={dark} stroke="#333" />
      <Stone cx={60} cy={80} r={7} fill={dark} stroke="#333" />
      <line x1={100} y1={40} x2={60} y2={80} stroke={dark} strokeWidth={2.5} strokeDasharray="4 4" />
      <Txt x={80} y={60} size={16} fill="#ff6b6b">✕</Txt>
      <Txt x={170} y={60} size={9} fill="rgba(240,238,255,0.4)">links can't cross</Txt>
    </Svg>
  },
  {
    caption: 'Connect your two sides with an unbroken chain of bridges to win.',
    svg: <Svg>
      {/* borders — red top/bottom, blue left/right */}
      <line x1={25} y1={15} x2={25} y2={125} stroke="#3498db" strokeWidth={3} strokeLinecap="round" />
      <line x1={215} y1={15} x2={215} y2={125} stroke="#3498db" strokeWidth={3} strokeLinecap="round" />
      <line x1={35} y1={12} x2={205} y2={12} stroke="#e74c3c" strokeWidth={3} strokeLinecap="round" />
      <line x1={35} y1={128} x2={205} y2={128} stroke="#e74c3c" strokeWidth={3} strokeLinecap="round" />
      {/* chain of pegs and links */}
      {[[35,90],[65,60],[105,50],[135,30],[175,20],[205,50]].map(([x,y],i,a) =>
        <React.Fragment key={i}>
          <Stone cx={x} cy={y} r={6} fill={white} />
          {i < a.length-1 && <line x1={x} y1={y} x2={a[i+1][0]} y2={a[i+1][1]} stroke={yellow} strokeWidth={2} />}
        </React.Fragment>
      )}
    </Svg>
  },
];

// ── STONES (Pente) / PAIRS ──────────────────────────────────────────────────────
const stonesGuide = [
  {
    caption: 'Place stones on intersections, one per turn.',
    svg: <Svg>
      {/* grid lines */}
      {[0,1,2,3,4].map(i => <React.Fragment key={i}>
        <line x1={40+i*40} y1={15} x2={40+i*40} y2={125} stroke={dim} strokeWidth={1} />
        <line x1={40} y1={15+i*28} x2={200} y2={15+i*28} stroke={dim} strokeWidth={1} />
      </React.Fragment>)}
      <Stone cx={120} cy={71} r={10} fill={white} />
      <Stone cx={80} cy={43} r={10} fill={dark} stroke="#333" />
      <Stone cx={160} cy={43} r={10} fill={white} />
      {/* new stone */}
      <Stone cx={80} cy={71} r={10} fill={dark} stroke="#333" />
      <circle cx={80} cy={71} r={14} fill="none" stroke={yellow} strokeWidth={1.5} strokeDasharray="3 3" />
    </Svg>
  },
  {
    caption: 'Five in a row wins the game.',
    svg: <Svg>
      {[0,1,2,3,4].map(i => <React.Fragment key={i}>
        <line x1={30+i*40} y1={20} x2={30+i*40} y2={120} stroke={dim} strokeWidth={1} />
        <line x1={30} y1={20+i*25} x2={190} y2={20+i*25} stroke={dim} strokeWidth={1} />
      </React.Fragment>)}
      {/* five white in a row */}
      {[0,1,2,3,4].map(i =>
        <Stone key={i} cx={30+i*40} cy={70} r={11} fill={white} />
      )}
      <line x1={20} y1={82} x2={200} y2={82} stroke={yellow} strokeWidth={2} />
      <Txt x={120} y={110} size={10} fill={yellow}>five in a row!</Txt>
    </Svg>
  },
  {
    caption: 'Sandwich two opponent stones between yours to capture them.',
    svg: <Svg>
      {[0,1,2,3,4].map(i =>
        <line key={i} x1={30+i*45} y1={25} x2={30+i*45} y2={115} stroke={dim} strokeWidth={1} />
      )}
      <line x1={30} y1={70} x2={210} y2={70} stroke={dim} strokeWidth={1} />
      {/* capture: white-black-black-white */}
      <Stone cx={30} cy={70} r={12} fill={white} />
      <Stone cx={75} cy={70} r={12} fill={dark} stroke="#333" />
      <Stone cx={120} cy={70} r={12} fill={dark} stroke="#333" />
      <Stone cx={165} cy={70} r={12} fill={white} />
      {/* capture arrows */}
      {arrow(45, 70, 62, 70)}
      {arrow(150, 70, 133, 70)}
      {/* captured indicator */}
      <Txt x={97} y={95} size={9} fill="#ff6b6b">captured!</Txt>
    </Svg>
  },
  {
    caption: 'Five pair captures also wins the game.',
    svg: <Svg>
      {/* captured pairs */}
      {[0,1,2,3,4].map(i =>
        <React.Fragment key={i}>
          <Stone cx={35+i*40} cy={55} r={8} fill={dark} stroke="#333" />
          <Stone cx={50+i*40} cy={55} r={8} fill={dark} stroke="#333" />
          <Txt x={42+i*40} y={72} size={7} fill="rgba(240,238,255,0.4)">pair {i+1}</Txt>
        </React.Fragment>
      )}
      <Txt x={120} y={105} size={10} fill={yellow}>5 captures = win!</Txt>
    </Svg>
  },
];

// ── SOWING (Omweso) ─────────────────────────────────────────────────────────────
const pit = (cx, cy, count, highlight) => (
  <g>
    <circle cx={cx} cy={cy} r={13} fill="rgba(26,11,46,0.8)"
      stroke={highlight ? yellow : 'rgba(153,66,240,0.25)'} strokeWidth={highlight ? 2 : 1} />
    {count > 0 && <Txt x={cx} y={cy} size={9}>{count}</Txt>}
  </g>
);

const sowingGuide = [
  {
    caption: 'Pick up all seeds (2+) from any pit on your side.',
    svg: <Svg>
      {/* player's 2 rows (inner + outer), 4 pits each shown */}
      <Txt x={120} y={18} size={8} fill="rgba(240,238,255,0.3)">your two rows</Txt>
      {[0,1,2,3].map(c => pit(50+c*40, 50, 2))}
      {[0,1,2,3].map(c => pit(50+c*40, 80, c===1 ? 0 : 2, c===1))}
      {/* picked up */}
      <circle cx={90} cy={80} r={13} fill="none" stroke={yellow} strokeWidth={2} />
      {arrow(90, 95, 90, 115)}
      <Txt x={90} y={125} size={9} fill={yellow}>pick up 2</Txt>
    </Svg>
  },
  {
    caption: 'Sow one seed per pit, counter-clockwise around your rows.',
    svg: <Svg>
      <Txt x={120} y={15} size={8} fill="rgba(240,238,255,0.3)">outer row</Txt>
      {/* outer row - left to right is actually right to left for sowing */}
      {[0,1,2,3,4,5].map(c => pit(25+c*38, 38, c===0 ? 3 : c===5 ? 3 : 2))}
      <Txt x={120} y={62} size={8} fill="rgba(240,238,255,0.3)">inner row</Txt>
      {[0,1,2,3,4,5].map(c => pit(25+c*38, 80, c===2 ? 0 : c===3 ? 3 : c===4 ? 3 : 2, c===2))}
      {/* sow direction arrows */}
      <path d="M 101,80 L 63,80 L 63,50 L 25,50 L 25,38" fill="none" stroke={yellow} strokeWidth={1.5} strokeDasharray="4 3" />
      {arrow(63, 80, 63, 50, '#ffe066')}
      <Txt x={120} y={115} size={8} fill={yellow}>↺ counter-clockwise</Txt>
    </Svg>
  },
  {
    caption: 'Last seed in a 2+ pit? Pick up and keep sowing (relay).',
    svg: <Svg>
      {[0,1,2,3,4].map(c => pit(35+c*42, 45, [0,3,1,2,2][c], c===1))}
      {[0,1,2,3,4].map(c => pit(35+c*42, 85, [2,2,0,2,2][c]))}
      {/* last seed landed in pit with 3 → relay */}
      <circle cx={77} cy={45} r={16} fill="none" stroke={yellow} strokeWidth={2} strokeDasharray="4 3" />
      <Txt x={77} y={25} size={8} fill={yellow}>3 seeds → relay!</Txt>
      {arrow(77, 60, 77, 75)}
      <Txt x={120} y={120} size={9} fill="rgba(240,238,255,0.4)">pick up all 3 and keep sowing</Txt>
    </Svg>
  },
  {
    caption: 'Last seed on your inner row? Capture opponent\'s opposite seeds.',
    svg: <Svg>
      <Txt x={120} y={12} size={8} fill="rgba(240,238,255,0.3)">opponent's inner row</Txt>
      {[0,1,2,3,4].map(c => pit(35+c*42, 32, [2,2,4,2,2][c], c===2))}
      <line x1={20} y1={55} x2={220} y2={55} stroke="rgba(153,66,240,0.3)" strokeWidth={1.5} />
      <Txt x={120} y={68} size={8} fill="rgba(240,238,255,0.3)">your inner row</Txt>
      {[0,1,2,3,4].map(c => pit(35+c*42, 85, [2,2,1,2,2][c], c===2))}
      {/* capture arrow */}
      {arrow(119, 75, 119, 45)}
      <Txt x={170} y={55} size={8} fill={yellow}>capture 4!</Txt>
      <Txt x={120} y={120} size={9} fill="rgba(240,238,255,0.4)">seeds removed from opponent's pit</Txt>
    </Svg>
  },
];

// ── MILLS (Nine Men's Morris) ────────────────────────────────────────────────────
const millsGuide = [
  {
    caption: 'Take turns placing pieces on the intersections.',
    svg: <Svg>
      {/* three concentric squares */}
      <rect x={40} y={20} width={160} height={100} fill="none" stroke={dim} strokeWidth={1.5} rx={2} />
      <rect x={70} y={40} width={100} height={60} fill="none" stroke={dim} strokeWidth={1.5} rx={2} />
      <rect x={100} y={55} width={40} height={30} fill="none" stroke={dim} strokeWidth={1.5} rx={2} />
      {/* connecting lines */}
      <line x1={120} y1={20} x2={120} y2={55} stroke={dim} strokeWidth={1.5} />
      <line x1={120} y1={85} x2={120} y2={120} stroke={dim} strokeWidth={1.5} />
      <line x1={40} y1={70} x2={100} y2={70} stroke={dim} strokeWidth={1.5} />
      <line x1={140} y1={70} x2={200} y2={70} stroke={dim} strokeWidth={1.5} />
      {/* some pieces placed */}
      <Stone cx={40} cy={20} r={8} fill={white} />
      <Stone cx={120} cy={20} r={8} fill={dark} stroke="#333" />
      <Stone cx={70} cy={40} r={8} fill={white} />
      {/* new piece */}
      <Stone cx={170} cy={40} r={8} fill={dark} stroke="#333" />
      <circle cx={170} cy={40} r={12} fill="none" stroke={yellow} strokeWidth={1.5} strokeDasharray="3 3" />
    </Svg>
  },
  {
    caption: 'Form a line of 3 (a mill) to remove an opponent\'s piece.',
    svg: <Svg>
      <rect x={40} y={20} width={160} height={100} fill="none" stroke={dim} strokeWidth={1.5} rx={2} />
      <rect x={70} y={40} width={100} height={60} fill="none" stroke={dim} strokeWidth={1.5} rx={2} />
      <line x1={120} y1={20} x2={120} y2={40} stroke={dim} strokeWidth={1.5} />
      <line x1={40} y1={70} x2={70} y2={70} stroke={dim} strokeWidth={1.5} />
      {/* mill: 3 whites on top row */}
      <Stone cx={40} cy={20} r={9} fill={white} />
      <Stone cx={120} cy={20} r={9} fill={white} />
      <Stone cx={200} cy={20} r={9} fill={white} />
      <line x1={40} y1={8} x2={200} y2={8} stroke={yellow} strokeWidth={2} />
      <Txt x={120} y={5} size={8} fill={yellow}>mill!</Txt>
      {/* remove opponent piece */}
      <Stone cx={70} cy={100} r={9} fill={dark} stroke="#333" />
      <Txt x={70} y={115} size={8} fill="#ff6b6b">remove one</Txt>
      <line x1={62} y1={92} x2={78} y2={108} stroke="#ff6b6b" strokeWidth={1.5} />
      <line x1={78} y1={92} x2={62} y2={108} stroke="#ff6b6b" strokeWidth={1.5} />
    </Svg>
  },
  {
    caption: 'Once all pieces are placed, slide to adjacent empty spots.',
    svg: <Svg>
      <rect x={50} y={25} width={140} height={90} fill="none" stroke={dim} strokeWidth={1.5} rx={2} />
      <rect x={80} y={45} width={80} height={50} fill="none" stroke={dim} strokeWidth={1.5} rx={2} />
      <line x1={120} y1={25} x2={120} y2={45} stroke={dim} strokeWidth={1.5} />
      <line x1={50} y1={70} x2={80} y2={70} stroke={dim} strokeWidth={1.5} />
      <line x1={160} y1={70} x2={190} y2={70} stroke={dim} strokeWidth={1.5} />
      <line x1={120} y1={95} x2={120} y2={115} stroke={dim} strokeWidth={1.5} />
      {/* piece sliding */}
      <Stone cx={80} cy={45} r={8} fill={white} />
      {arrow(92, 45, 112, 45)}
      <circle cx={120} cy={45} r={5} fill="none" stroke={yellow} strokeWidth={1} strokeDasharray="3 3" />
      <Txt x={120} y={130} size={9} fill="rgba(240,238,255,0.4)">move one step to adjacent empty spot</Txt>
    </Svg>
  },
  {
    caption: 'Reduce your opponent to 2 pieces to win.',
    svg: <Svg>
      {/* small board for context */}
      <rect x={70} y={20} width={100} height={70} fill="none" stroke={dim} strokeWidth={1.5} rx={2} />
      <rect x={90} y={35} width={60} height={40} fill="none" stroke={dim} strokeWidth={1.5} rx={2} />
      {/* your pieces */}
      <Stone cx={70} cy={20} r={7} fill={white} />
      <Stone cx={170} cy={20} r={7} fill={white} />
      <Stone cx={70} cy={90} r={7} fill={white} />
      <Stone cx={120} cy={55} r={7} fill={white} />
      {/* opponent's 2 remaining */}
      <Stone cx={90} cy={35} r={7} fill={dark} stroke="#333" />
      <Stone cx={150} cy={75} r={7} fill={dark} stroke="#333" />
      <Txt x={120} y={110} size={9} fill="rgba(240,238,255,0.4)">opponent has only 2 left</Txt>
      <Txt x={120} y={128} size={10} fill={yellow}>you win!</Txt>
    </Svg>
  },
];

// ── BLOCKS (Blokus) ─────────────────────────────────────────────────────────────
const bSz = 10; // cell size for blocks guide
const bRect = (r, c, fill) => (
  <rect key={`${r}-${c}`} x={c * bSz} y={r * bSz} width={bSz - 1} height={bSz - 1} fill={fill} rx={1} />
);
const blocksGuide = [
  {
    caption: 'Place polyomino pieces on a 20×20 grid. First piece must cover your corner.',
    svg: <Svg>
      {/* Mini board corner */}
      {[0,1,2,3,4].map(r => [0,1,2,3,4].map(c =>
        <rect key={`g${r}${c}`} x={40+c*18} y={20+r*18} width={17} height={17} fill="rgba(42,31,69,0.5)" rx={1} />
      ))}
      {/* Blue L-piece in corner */}
      {[[0,0],[1,0],[2,0],[2,1]].map(([r,c]) =>
        <rect key={`b${r}${c}`} x={40+c*18} y={20+r*18} width={17} height={17} fill="#3B82F6" rx={1} />
      )}
      <Txt x={40} y={12} size={8} fill="rgba(240,238,255,0.5)" anchor="start">corner</Txt>
      {arrow(37, 18, 37, 32)}
      {/* Piece tray hint */}
      <Txt x={160} y={40} size={10}>21 pieces</Txt>
      <Txt x={160} y={55} size={10}>per color</Txt>
      {/* Mini pieces */}
      {[[0,0]].map(([r,c]) => <rect key="p1" x={140} y={70} width={9} height={9} fill="#3B82F6" rx={1} />)}
      {[[0,0],[0,1]].map(([r,c],i) => <rect key={`p2${i}`} x={155+c*10} y={70+r*10} width={9} height={9} fill="#3B82F6" rx={1} />)}
      {[[0,0],[0,1],[0,2]].map(([r,c],i) => <rect key={`p3${i}`} x={140+c*10} y={85+r*10} width={9} height={9} fill="#3B82F6" rx={1} />)}
    </Svg>
  },
  {
    caption: 'Each new piece must touch your color diagonally — never along an edge.',
    svg: <Svg>
      {/* Two pieces showing corner connection */}
      {[[0,0],[0,1],[1,0]].map(([r,c],i) =>
        <rect key={`a${i}`} x={60+c*20} y={30+r*20} width={19} height={19} fill="#3B82F6" rx={1} />
      )}
      {[[0,0],[0,1],[1,1]].map(([r,c],i) =>
        <rect key={`b${i}`} x={100+c*20} y={70+r*20} width={19} height={19} fill="#3B82F6" rx={1} />
      )}
      {/* Corner touch indicator */}
      <circle cx={100} cy={70} r={3} fill="#ffe066" />
      <Txt x={100} y={58} size={8} fill={yellow}>diagonal OK</Txt>
      {/* Edge touch X */}
      <rect x={160} y={40} width={19} height={19} fill="#3B82F6" rx={1} />
      <rect x={180} y={40} width={19} height={19} fill="#3B82F6" rx={1} />
      <Txt x={180} y={72} size={8} fill="#f07070">edge = NO</Txt>
      <line x1={175} y1={34} x2={205} y2={65} stroke="#f07070" strokeWidth={2} />
    </Svg>
  },
  {
    caption: 'Different colors CAN touch edges. Rotate and flip pieces to fit.',
    svg: <Svg>
      {/* Blue and yellow touching edges — OK */}
      {[[0,0],[0,1]].map(([r,c],i) =>
        <rect key={`bl${i}`} x={50+c*20} y={40+r*20} width={19} height={19} fill="#3B82F6" rx={1} />
      )}
      {[[0,0],[0,1]].map(([r,c],i) =>
        <rect key={`yl${i}`} x={90+c*20} y={40+r*20} width={19} height={19} fill="#FACC15" rx={1} />
      )}
      <Txt x={95} y={35} size={8} fill="rgba(240,238,255,0.5)">different colors: OK</Txt>
      {/* Rotation arrows */}
      <Txt x={180} y={50} size={9}>rotate</Txt>
      <Txt x={180} y={65} size={9}>+ flip</Txt>
      <Txt x={180} y={80} size={9}>to fit</Txt>
      {/* T-piece in two orientations */}
      {[[0,0],[0,1],[0,2],[1,1]].map(([r,c],i) =>
        <rect key={`t1${i}`} x={40+c*12} y={85+r*12} width={11} height={11} fill="#22C55E" rx={1} />
      )}
      {arrow(85, 95, 100, 95)}
      {[[0,0],[1,0],[1,1],[2,0]].map(([r,c],i) =>
        <rect key={`t2${i}`} x={110+c*12} y={82+r*12} width={11} height={11} fill="#22C55E" rx={1} />
      )}
    </Svg>
  },
  {
    caption: 'Game ends when no one can place. Fewest remaining squares wins!',
    svg: <Svg>
      <Txt x={120} y={30} size={11}>scoring</Txt>
      <Txt x={120} y={55} size={9} fill="rgba(240,238,255,0.6)">count squares left in hand</Txt>
      <Txt x={120} y={75} size={9} fill="rgba(240,238,255,0.6)">fewer = better</Txt>
      <Txt x={120} y={100} size={9} fill={yellow}>place ALL pieces = +15 bonus</Txt>
      <Txt x={120} y={118} size={8} fill="rgba(240,238,255,0.4)">play big pieces early!</Txt>
    </Svg>
  },
];

// ── Export all guides ───────────────────────────────────────────────────────────
export const GUIDES = {
  hexes: hexesGuide,
  marbles: marblesGuide,
  walls: wallsGuide,
  bugs: bugsGuide,
  circles: circlesGuide,
  stacks: stacksGuide,
  towers: towersGuide,
  trees: treesGuide,
  bridges: bridgesGuide,
  stones: stonesGuide,
  pairs: stonesGuide,   // pairs uses stones game
  sowing: sowingGuide,
  mills: millsGuide,
  blocks: blocksGuide,
};
