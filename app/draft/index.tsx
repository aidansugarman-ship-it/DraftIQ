import { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
  SlideInRight,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { useUserStore } from '@store/useUserStore';

// ─── Mock data ────────────────────────────────────────────────────────────────

type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';

interface DraftPlayer {
  id:       string;
  name:     string;
  team:     string;
  pos:      Position;
  adp:      number;
  score:    number;
  bye:      number;
  injury?:  string;
}

interface Pick {
  pick:    number;
  round:   number;
  slot:    number;
  team:    string;
  player:  DraftPlayer;
  isUser:  boolean;
  grade?:  'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  comment?: string;
}

const MOCK_POOL: DraftPlayer[] = [
  { id: '1',  name: 'Christian McCaffrey', team: 'SF',  pos: 'RB',  adp: 1.0,  score: 98, bye: 9 },
  { id: '2',  name: 'CeeDee Lamb',         team: 'DAL', pos: 'WR',  adp: 2.0,  score: 96, bye: 7 },
  { id: '3',  name: 'Tyreek Hill',          team: 'MIA', pos: 'WR',  adp: 3.1,  score: 94, bye: 10 },
  { id: '4',  name: 'Justin Jefferson',    team: 'MIN', pos: 'WR',  adp: 4.0,  score: 93, bye: 6 },
  { id: '5',  name: 'Ja\'Marr Chase',       team: 'CIN', pos: 'WR',  adp: 5.2,  score: 92, bye: 7 },
  { id: '6',  name: 'Breece Hall',         team: 'NYJ', pos: 'RB',  adp: 6.0,  score: 90, bye: 12 },
  { id: '7',  name: 'Travis Kelce',        team: 'KC',  pos: 'TE',  adp: 7.0,  score: 89, bye: 6 },
  { id: '8',  name: 'Davante Adams',       team: 'LV',  pos: 'WR',  adp: 8.1,  score: 88, bye: 13 },
  { id: '9',  name: 'Austin Ekeler',       team: 'LAC', pos: 'RB',  adp: 9.0,  score: 87, bye: 5 },
  { id: '10', name: 'Bijan Robinson',      team: 'ATL', pos: 'RB',  adp: 10.0, score: 86, bye: 11 },
  { id: '11', name: 'Stefon Diggs',        team: 'BUF', pos: 'WR',  adp: 11.2, score: 85, bye: 13 },
  { id: '12', name: 'Tony Pollard',        team: 'DAL', pos: 'RB',  adp: 12.0, score: 84, bye: 7 },
  { id: '13', name: 'DeAndre Hopkins',     team: 'TEN', pos: 'WR',  adp: 13.4, score: 82, bye: 6 },
  { id: '14', name: 'Josh Allen',          team: 'BUF', pos: 'QB',  adp: 14.0, score: 95, bye: 13 },
  { id: '15', name: 'Sam LaPorta',         team: 'DET', pos: 'TE',  adp: 15.0, score: 80, bye: 6 },
  { id: '16', name: 'Lamar Jackson',       team: 'BAL', pos: 'QB',  adp: 16.0, score: 94, bye: 14 },
  { id: '17', name: 'Puka Nacua',          team: 'LAR', pos: 'WR',  adp: 17.1, score: 79, bye: 6 },
  { id: '18', name: 'James Cook',          team: 'BUF', pos: 'RB',  adp: 18.0, score: 78, bye: 13 },
  { id: '19', name: 'DK Metcalf',          team: 'SEA', pos: 'WR',  adp: 19.3, score: 77, bye: 5 },
  { id: '20', name: 'Josh Jacobs',         team: 'GB',  pos: 'RB',  adp: 20.0, score: 76, bye: 6 },
  { id: '21', name: 'Tank Dell',           team: 'HOU', pos: 'WR',  adp: 21.2, score: 75, bye: 14 },
  { id: '22', name: 'Amon-Ra St. Brown',   team: 'DET', pos: 'WR',  adp: 22.0, score: 83, bye: 6 },
  { id: '23', name: 'Kyren Williams',      team: 'LAR', pos: 'RB',  adp: 23.0, score: 74, bye: 6 },
  { id: '24', name: 'Patrick Mahomes',     team: 'KC',  pos: 'QB',  adp: 24.0, score: 92, bye: 6 },
  { id: '25', name: 'Michael Pittman',     team: 'IND', pos: 'WR',  adp: 25.1, score: 73, bye: 14 },
  { id: '26', name: 'Tua Tagovailoa',      team: 'MIA', pos: 'QB',  adp: 26.0, score: 85, bye: 10 },
  { id: '27', name: 'Romeo Doubs',         team: 'GB',  pos: 'WR',  adp: 27.3, score: 70, bye: 6 },
  { id: '28', name: 'Aaron Jones',         team: 'MIN', pos: 'RB',  adp: 28.0, score: 71, bye: 6 },
  { id: '29', name: 'Keenan Allen',        team: 'CHI', pos: 'WR',  adp: 29.0, score: 72, bye: 7 },
  { id: '30', name: 'Evan Engram',         team: 'JAX', pos: 'TE',  adp: 30.0, score: 75, bye: 11 },
  { id: '31', name: 'George Pickens',      team: 'PIT', pos: 'WR',  adp: 31.2, score: 74, bye: 9 },
  { id: '32', name: 'Alvin Kamara',        team: 'NO',  pos: 'RB',  adp: 32.0, score: 73, bye: 12 },
  { id: '33', name: 'Chris Olave',         team: 'NO',  pos: 'WR',  adp: 33.1, score: 72, bye: 12 },
  { id: '34', name: 'Gus Edwards',         team: 'LAC', pos: 'RB',  adp: 34.0, score: 68, bye: 5 },
  { id: '35', name: 'Tyler Lockett',       team: 'SEA', pos: 'WR',  adp: 35.2, score: 67, bye: 5 },
  { id: '36', name: 'Rachaad White',       team: 'TB',  pos: 'RB',  adp: 36.0, score: 66, bye: 11 },
  { id: '37', name: 'Jordan Addison',      team: 'MIN', pos: 'WR',  adp: 37.3, score: 65, bye: 6 },
  { id: '38', name: 'Dallas Goedert',      team: 'PHI', pos: 'TE',  adp: 38.0, score: 78, bye: 5 },
  { id: '39', name: 'Jaylen Waddle',       team: 'MIA', pos: 'WR',  adp: 39.1, score: 76, bye: 10 },
  { id: '40', name: 'Rhamondre Stevenson', team: 'NE',  pos: 'RB',  adp: 40.0, score: 64, bye: 14 },
  { id: '41', name: 'Jake Ferguson',       team: 'DAL', pos: 'TE',  adp: 41.2, score: 74, bye: 7 },
  { id: '42', name: 'Calvin Ridley',       team: 'TEN', pos: 'WR',  adp: 42.0, score: 63, bye: 6 },
  { id: '43', name: 'Brian Robinson Jr.',  team: 'WSH', pos: 'RB',  adp: 43.0, score: 62, bye: 14 },
  { id: '44', name: 'Rashee Rice',         team: 'KC',  pos: 'WR',  adp: 44.3, score: 77, bye: 6 },
  { id: '45', name: 'Derrick Henry',       team: 'BAL', pos: 'RB',  adp: 45.0, score: 61, bye: 14 },
  { id: '46', name: 'Mark Andrews',        team: 'BAL', pos: 'TE',  adp: 46.0, score: 79, bye: 14 },
  { id: '47', name: 'Skyy Moore',          team: 'KC',  pos: 'WR',  adp: 47.2, score: 58, bye: 6 },
  { id: '48', name: 'Tyjae Spears',        team: 'TEN', pos: 'RB',  adp: 48.0, score: 60, bye: 6 },
  { id: '49', name: 'Terry McLaurin',      team: 'WSH', pos: 'WR',  adp: 49.1, score: 69, bye: 14 },
  { id: '50', name: 'Javonte Williams',    team: 'DEN', pos: 'RB',  adp: 50.0, score: 59, bye: 14 },
  { id: '51', name: 'Diontae Johnson',     team: 'CAR', pos: 'WR',  adp: 51.2, score: 57, bye: 5 },
  { id: '52', name: 'Tee Higgins',         team: 'CIN', pos: 'WR',  adp: 52.0, score: 71, bye: 7 },
  { id: '53', name: 'Drake London',        team: 'ATL', pos: 'WR',  adp: 53.3, score: 68, bye: 11 },
  { id: '54', name: 'David Njoku',         team: 'CLE', pos: 'TE',  adp: 54.0, score: 70, bye: 5 },
  { id: '55', name: 'Justin Herbert',      team: 'LAC', pos: 'QB',  adp: 55.0, score: 82, bye: 5 },
  { id: '56', name: 'Deebo Samuel',        team: 'SF',  pos: 'WR',  adp: 56.1, score: 66, bye: 9 },
  { id: '57', name: 'Cam Akers',           team: 'MIN', pos: 'RB',  adp: 57.0, score: 55, bye: 6 },
  { id: '58', name: 'Darnell Mooney',      team: 'ATL', pos: 'WR',  adp: 58.3, score: 56, bye: 11 },
  { id: '59', name: 'Tyler Bass',          team: 'BUF', pos: 'K',   adp: 59.0, score: 82, bye: 13 },
  { id: '60', name: 'Baltimore Defense',   team: 'BAL', pos: 'DEF', adp: 60.0, score: 85, bye: 14 },
];

const AI_TEAMS = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta',
                  'Team Epsilon', 'Team Zeta', 'Team Eta', 'Team Theta',
                  'Team Iota', 'Team Kappa', 'Team Lambda'];

const PICK_COMMENTS: Record<string, string> = {
  'A+': 'Exceptional value — stole them off the board!',
  'A':  'Excellent pick. Great value at this spot.',
  'B+': 'Solid pick. Slightly ahead of ADP.',
  'B':  'Good selection. Right on value.',
  'C+': 'Slight reach, but positional scarcity justifies it.',
  'C':  'Minor reach. Manageable.',
  'D':  'Significant reach. Could have waited.',
  'F':  'Major reach. Better options were available.',
};

function gradePickByValue(adp: number, pickNum: number): Pick['grade'] {
  const diff = adp - pickNum;
  if (diff >= 5) return 'A+';
  if (diff >= 2) return 'A';
  if (diff >= 0) return 'B+';
  if (diff >= -2) return 'B';
  if (diff >= -5) return 'C+';
  if (diff >= -8) return 'C';
  if (diff >= -12) return 'D';
  return 'F';
}

const GRADE_COLORS: Record<string, string> = {
  'A+': colors.green,
  'A':  colors.green,
  'B+': '#7BC67E',
  'B':  colors.blue,
  'C+': colors.gold,
  'C':  colors.gold,
  'D':  colors.coral,
  'F':  '#FF4444',
};

const POS_COLORS: Record<Position, string> = {
  QB:  colors.coral,
  RB:  colors.green,
  WR:  colors.blue,
  TE:  colors.gold,
  K:   colors.textTertiary,
  DEF: colors.purple,
};

// ─── Phase types ──────────────────────────────────────────────────────────────

type Phase = 'lobby' | 'drafting' | 'recap';

const NUM_TEAMS  = 12;
const NUM_ROUNDS = 5;  // condensed mock draft

function buildPickOrder(teams: number, rounds: number): { team: number; pick: number; round: number; slot: number }[] {
  const order = [];
  let overall = 1;
  for (let r = 1; r <= rounds; r++) {
    const slots = r % 2 === 1
      ? Array.from({ length: teams }, (_, i) => i)
      : Array.from({ length: teams }, (_, i) => teams - 1 - i);
    for (const slot of slots) {
      order.push({ team: slot, pick: overall++, round: r, slot: slot + 1 });
    }
  }
  return order;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GradeChip({ grade }: { grade?: Pick['grade'] }) {
  if (!grade) return null;
  return (
    <View style={[gradeStyles.chip, { backgroundColor: `${GRADE_COLORS[grade]}22`, borderColor: `${GRADE_COLORS[grade]}50` }]}>
      <Text variant="labelSmall" style={{ color: GRADE_COLORS[grade] }}>{grade}</Text>
    </View>
  );
}

function PosBadge({ pos }: { pos: Position }) {
  return (
    <View style={[posStyles.badge, { backgroundColor: `${POS_COLORS[pos]}20` }]}>
      <Text variant="labelSmall" style={{ color: POS_COLORS[pos] }}>{pos}</Text>
    </View>
  );
}

function PlayerRow({
  player,
  rank,
  onPick,
  disabled,
  delay,
}: {
  player:   DraftPlayer;
  rank:     number;
  onPick:   () => void;
  disabled: boolean;
  delay:    number;
}) {
  const op = useSharedValue(0);
  const tx = useSharedValue(-10);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 250 }));
    tx.value = withDelay(delay, withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: tx.value }] }));

  return (
    <Animated.View style={style}>
      <TouchableOpacity
        style={[poolRow.row, disabled && poolRow.rowDisabled]}
        onPress={onPick}
        activeOpacity={0.75}
        disabled={disabled}
      >
        <Text variant="bodySmall" color={colors.textTertiary} style={poolRow.rank}>{rank}</Text>
        <PosBadge pos={player.pos} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" color={colors.textPrimary}>{player.name}</Text>
          <Text variant="caption" color={colors.textTertiary}>{player.team} · Bye {player.bye}</Text>
        </View>
        <View style={poolRow.right}>
          <Text variant="bodySmall" color={colors.textTertiary} style={poolRow.adp}>ADP {player.adp}</Text>
          <View style={[poolRow.scoreBox, { backgroundColor: player.score >= 90 ? `${colors.green}20` : `${colors.blue}15` }]}>
            <Text variant="labelSmall" style={{ color: player.score >= 90 ? colors.green : colors.blue }}>{player.score}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PickLogRow({ pick, index }: { pick: Pick; index: number }) {
  return (
    <Animated.View entering={FadeIn.delay(50).duration(300)} style={logRow.row}>
      <View style={logRow.pickNum}>
        <Text variant="labelSmall" color={colors.textTertiary}>{pick.pick}</Text>
      </View>
      <PosBadge pos={pick.player.pos} />
      <View style={{ flex: 1 }}>
        <Text variant="bodySmall" color={pick.isUser ? colors.green : colors.textPrimary} numberOfLines={1}>
          {pick.player.name}
        </Text>
        <Text variant="caption" color={colors.textTertiary}>{pick.isUser ? 'YOU' : pick.team}</Text>
      </View>
      {pick.isUser && <GradeChip grade={pick.grade} />}
    </Animated.View>
  );
}

// ─── Lobby screen ─────────────────────────────────────────────────────────────

function LobbyScreen({ onStart }: { onStart: () => void }) {
  const op = useSharedValue(0);
  const ty = useSharedValue(20);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  return (
    <Animated.View style={[lobby.wrap, fadeStyle]}>
      <Text style={lobby.emoji}>⚡</Text>
      <Text style={lobby.title}>MOCK DRAFT</Text>
      <Text variant="body" color={colors.textSecondary} align="center" style={lobby.sub}>
        12-team PPR · Snake format{'\n'}5 rounds · AI-powered opponents
      </Text>

      <View style={lobby.details}>
        {[
          { icon: 'people-outline',        label: '12 Teams (You + 11 AI)' },
          { icon: 'repeat-outline',         label: 'Snake Draft Order' },
          { icon: 'flash-outline',          label: 'Real ADP Rankings' },
          { icon: 'ribbon-outline',         label: 'Every Pick Graded by AI' },
        ].map((item, i) => (
          <Animated.View
            key={item.label}
            entering={FadeIn.delay(300 + i * 80).duration(300)}
            style={lobby.detailRow}
          >
            <View style={lobby.iconWrap}>
              <Ionicons name={item.icon as any} size={16} color={colors.green} />
            </View>
            <Text variant="body" color={colors.textSecondary}>{item.label}</Text>
          </Animated.View>
        ))}
      </View>

      <TouchableOpacity style={lobby.startBtn} onPress={onStart} activeOpacity={0.85}>
        <LinearGradient
          colors={[colors.green, '#00CC6A']}
          style={lobby.startGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text variant="bodyMedium" color={colors.background}>Start Draft</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.background} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Recap screen ─────────────────────────────────────────────────────────────

function RecapScreen({ picks, onRestart }: { picks: Pick[]; onRestart: () => void }) {
  const userPicks = picks.filter(p => p.isUser);
  const grades    = userPicks.map(p => p.grade ?? 'B');
  const gradeMap: Record<string, number> = { 'A+': 7, 'A': 6, 'B+': 5, 'B': 4, 'C+': 3, 'C': 2, 'D': 1, 'F': 0 };
  const avg = grades.reduce((s, g) => s + gradeMap[g], 0) / grades.length;
  const overall = avg >= 6 ? 'A+' : avg >= 5 ? 'A' : avg >= 4.5 ? 'B+' : avg >= 4 ? 'B' : avg >= 3 ? 'C+' : avg >= 2 ? 'C' : 'D';

  const op = useSharedValue(0);
  useEffect(() => { op.value = withTiming(1, { duration: 500 }); }, []);
  const fade = useAnimatedStyle(() => ({ opacity: op.value }));

  return (
    <Animated.View style={[recap.wrap, fade]}>
      <Text style={recap.title}>DRAFT{'\n'}COMPLETE.</Text>

      <View style={[recap.gradeCard, { borderColor: `${GRADE_COLORS[overall]}40` }]}>
        <LinearGradient
          colors={[`${GRADE_COLORS[overall]}10`, 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Text variant="labelSmall" color={colors.textTertiary} style={{ letterSpacing: 1 }}>OVERALL GRADE</Text>
        <Text style={[recap.bigGrade, { color: GRADE_COLORS[overall] }]}>{overall}</Text>
        <Text variant="bodySmall" color={colors.textTertiary}>{PICK_COMMENTS[overall]}</Text>
      </View>

      <Text variant="label" color={colors.textTertiary} style={recap.sectionLabel}>YOUR TEAM</Text>
      {userPicks.map((pick, i) => (
        <Animated.View
          key={pick.pick}
          entering={FadeIn.delay(i * 60).duration(300)}
          style={recap.teamRow}
        >
          <PosBadge pos={pick.player.pos} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" color={colors.textPrimary}>{pick.player.name}</Text>
            <Text variant="caption" color={colors.textTertiary}>Rd {pick.round} · Pick {pick.pick} · ADP {pick.player.adp}</Text>
          </View>
          <GradeChip grade={pick.grade} />
        </Animated.View>
      ))}

      <View style={recap.actions}>
        <TouchableOpacity style={recap.restartBtn} onPress={onRestart} activeOpacity={0.8}>
          <Text variant="bodyMedium" color={colors.background}>Draft Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={recap.homeBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text variant="bodyMedium" color={colors.textSecondary}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Main draft screen ────────────────────────────────────────────────────────

export default function MockDraftScreen() {
  const user      = useUserStore(s => s.user);
  const userSlot  = (user?.leagueSettings?.draftPositionNumber ?? 6) - 1;

  const [phase,    setPhase]    = useState<Phase>('lobby');
  const [pool,     setPool]     = useState<DraftPlayer[]>([...MOCK_POOL]);
  const [picks,    setPicks]    = useState<Pick[]>([]);
  const [search,   setSearch]   = useState('');
  const [posFilter, setPosFilter] = useState<Position | 'ALL'>('ALL');
  const [aiThinking, setAiThinking] = useState(false);
  const [userTurn, setUserTurn] = useState(false);

  const order   = useRef(buildPickOrder(NUM_TEAMS, NUM_ROUNDS)).current;
  const poolRef = useRef(pool);
  poolRef.current = pool;

  const currentPickIndex = picks.length;
  const currentOrder = order[currentPickIndex];
  const isDone = currentPickIndex >= order.length;

  function startDraft() {
    setPhase('drafting');
    setPool([...MOCK_POOL]);
    setPicks([]);
    setSearch('');
    setPosFilter('ALL');
    // Brief delay then process first pick
    setTimeout(() => advanceDraft([], [...MOCK_POOL]), 800);
  }

  function advanceDraft(currentPicks: Pick[], currentPool: DraftPlayer[]) {
    const idx = currentPicks.length;
    if (idx >= order.length) {
      setPhase('recap');
      return;
    }
    const slot = order[idx];
    if (slot.team === userSlot) {
      setUserTurn(true);
      setAiThinking(false);
    } else {
      setUserTurn(false);
      setAiThinking(true);
      // AI picks after a short delay — picks best available by score
      const delay = 600 + Math.random() * 800;
      setTimeout(() => {
        const best = [...currentPool].sort((a, b) => b.score - a.score)[0];
        if (!best) return;
        const newPick: Pick = {
          pick:   slot.pick,
          round:  slot.round,
          slot:   slot.slot,
          team:   AI_TEAMS[slot.team] ?? `Team ${slot.team + 1}`,
          player: best,
          isUser: false,
        };
        const nextPool  = currentPool.filter(p => p.id !== best.id);
        const nextPicks = [...currentPicks, newPick];
        setPool(nextPool);
        setPicks(nextPicks);
        setAiThinking(false);
        advanceDraft(nextPicks, nextPool);
      }, delay);
    }
  }

  function handleUserPick(player: DraftPlayer) {
    if (!userTurn || isDone) return;
    const idx   = picks.length;
    const slot  = order[idx];
    const grade = gradePickByValue(player.adp, slot.pick);
    const newPick: Pick = {
      pick:    slot.pick,
      round:   slot.round,
      slot:    slot.slot,
      team:    'You',
      player,
      isUser:  true,
      grade,
      comment: PICK_COMMENTS[grade],
    };
    const nextPool  = pool.filter(p => p.id !== player.id);
    const nextPicks = [...picks, newPick];
    setPool(nextPool);
    setPicks(nextPicks);
    setUserTurn(false);
    advanceDraft(nextPicks, nextPool);
  }

  const filteredPool = pool.filter(p => {
    const matchPos = posFilter === 'ALL' || p.pos === posFilter;
    const matchSearch = search.length === 0 || p.name.toLowerCase().includes(search.toLowerCase()) || p.team.toLowerCase().includes(search.toLowerCase());
    return matchPos && matchSearch;
  });

  const userPicks = picks.filter(p => p.isUser);

  if (phase === 'lobby') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text variant="bodyMedium" color={colors.textPrimary}>Mock Draft</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView contentContainerStyle={styles.lobbyScroll} showsVerticalScrollIndicator={false}>
            <LobbyScreen onStart={startDraft} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (phase === 'recap') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text variant="bodyMedium" color={colors.textPrimary}>Draft Recap</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView contentContainerStyle={styles.lobbyScroll} showsVerticalScrollIndicator={false}>
            <RecapScreen picks={picks} onRestart={startDraft} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Drafting phase ──

  const roundLabel = isDone ? 'Done' : `RD ${currentOrder?.round} · PICK ${currentOrder?.pick}`;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => Alert.alert('Exit Draft', 'Your progress will be lost.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Exit', style: 'destructive', onPress: () => router.back() },
            ])}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.pickBadge}>
            <Text variant="labelSmall" style={{ letterSpacing: 1, color: userTurn ? colors.green : colors.textTertiary }}>
              {aiThinking ? 'AI PICKING…' : userTurn ? 'YOUR PICK' : roundLabel}
            </Text>
          </View>

          <View style={styles.roundPill}>
            <Text variant="labelSmall" color={colors.textTertiary}>
              {userPicks.length}/{NUM_ROUNDS}
            </Text>
          </View>
        </View>

        {/* On-the-clock banner */}
        {userTurn && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.onClock}>
            <LinearGradient
              colors={[`${colors.green}20`, `${colors.green}08`]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Ionicons name="time-outline" size={16} color={colors.green} />
            <Text variant="bodyMedium" color={colors.green}>You're on the clock!</Text>
          </Animated.View>
        )}

        {/* Split: pool (top 60%) | log (bottom 40%) */}
        <View style={styles.body}>

          {/* Pool half */}
          <View style={styles.poolPane}>
            {/* Search + filter */}
            <View style={styles.poolHeader}>
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={14} color={colors.textTertiary} style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search players…"
                  placeholderTextColor={colors.textTertiary}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posFilter}>
                {(['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const).map(pos => (
                  <TouchableOpacity
                    key={pos}
                    style={[filterPill.pill, posFilter === pos && filterPill.active]}
                    onPress={() => setPosFilter(pos)}
                    activeOpacity={0.7}
                  >
                    <Text
                      variant="labelSmall"
                      style={{ color: posFilter === pos ? colors.textPrimary : colors.textTertiary }}
                    >
                      {pos}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <FlatList
              data={filteredPool}
              keyExtractor={p => p.id}
              renderItem={({ item, index }) => (
                <PlayerRow
                  player={item}
                  rank={pool.indexOf(item) + 1}
                  onPick={() => handleUserPick(item)}
                  disabled={!userTurn}
                  delay={index < 10 ? index * 30 : 0}
                />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.md }}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Log half */}
          <View style={styles.logPane}>
            <Text variant="label" color={colors.textTertiary} style={styles.logTitle}>
              PICK LOG
            </Text>
            <FlatList
              data={[...picks].reverse()}
              keyExtractor={(p, i) => `${p.pick}-${i}`}
              renderItem={({ item, index }) => <PickLogRow pick={item} index={index} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.md }}
              ListEmptyComponent={
                <Text variant="caption" color={colors.textTertiary} align="center" style={{ marginTop: spacing.xl }}>
                  Picks will appear here
                </Text>
              }
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width:          36,
    height:         36,
    borderRadius:   radius.sm,
    backgroundColor: colors.surface,
    borderWidth:    1,
    borderColor:    colors.border,
    alignItems:     'center',
    justifyContent: 'center',
  },
  pickBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical:   4,
    borderRadius:      radius.full,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  roundPill: {
    width:           36,
    alignItems:      'flex-end',
  },

  onClock: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.sm,
    marginHorizontal: spacing.base,
    marginTop:      spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical:  spacing.sm,
    borderRadius:   radius.md,
    borderWidth:    1,
    borderColor:    `${colors.green}30`,
    overflow:       'hidden',
  },

  body: {
    flex:      1,
    flexDirection: 'column',
  },
  poolPane: {
    flex: 6,
  },
  logPane: {
    flex: 4,
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
  },
  divider: {
    height:          1,
    backgroundColor: colors.border,
    marginVertical:  spacing.xs,
  },
  logTitle: {
    letterSpacing: 1,
    marginBottom:  spacing.sm,
  },

  poolHeader: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    gap:               spacing.sm,
  },
  searchWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical:   8,
  },
  searchInput: {
    flex:     1,
    color:    colors.textPrimary,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
  },
  posFilter: {
    marginBottom: spacing.xs,
  },

  lobbyScroll: {
    paddingHorizontal: spacing.base,
    paddingBottom:     80,
    flexGrow: 1,
  },
});

const poolRow = StyleSheet.create({
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap:              spacing.sm,
  },
  rowDisabled: { opacity: 0.45 },
  rank: {
    width:     24,
    textAlign: 'right',
  },
  right: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  adp: { minWidth: 52, textAlign: 'right' },
  scoreBox: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      radius.sm,
    minWidth:          32,
    alignItems:        'center',
  },
});

const logRow = StyleSheet.create({
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingVertical:   8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap:              spacing.sm,
  },
  pickNum: {
    width:      24,
    alignItems: 'center',
  },
});

const filterPill = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical:   5,
    borderRadius:      radius.full,
    marginRight:       spacing.xs,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  active: {
    backgroundColor: colors.surfaceElevated,
    borderColor:     colors.textTertiary,
  },
});

const posStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      radius.xs,
    minWidth:          32,
    alignItems:        'center',
  },
});

const gradeStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
});

const lobby = StyleSheet.create({
  wrap: {
    flex:       1,
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    gap:        spacing.lg,
  },
  emoji: { fontSize: 56 },
  title: {
    ...typography.h1,
    fontSize:    42,
    color:       colors.textPrimary,
    textAlign:   'center',
  },
  sub: { lineHeight: 22 },
  details: {
    width:       '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding:     spacing.base,
    gap:         spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
  iconWrap: {
    width:          32,
    height:         32,
    borderRadius:   radius.sm,
    backgroundColor: `${colors.green}15`,
    alignItems:     'center',
    justifyContent: 'center',
  },
  startBtn: {
    width:        '100%',
    borderRadius: radius.lg,
    overflow:     'hidden',
    marginTop:    spacing.md,
  },
  startGrad: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.sm,
    paddingVertical: spacing.base,
  },
});

const recap = StyleSheet.create({
  wrap: {
    paddingTop:    spacing.xl,
    gap:           spacing.md,
  },
  title: {
    ...typography.h1,
    fontSize:  38,
    lineHeight: 40,
    color:     colors.textPrimary,
    marginBottom: spacing.sm,
  },
  gradeCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderRadius:    radius.lg,
    padding:         spacing.xl,
    alignItems:      'center',
    gap:             spacing.sm,
    overflow:        'hidden',
    marginBottom:    spacing.md,
  },
  bigGrade: {
    ...typography.h1,
    fontSize: 72,
    lineHeight: 76,
  },
  sectionLabel: {
    letterSpacing: 1,
    marginTop:     spacing.md,
    marginBottom:  spacing.sm,
  },
  teamRow: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  colors.surface,
    borderWidth:      1,
    borderColor:      colors.border,
    borderRadius:     radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.md,
    gap:              spacing.sm,
  },
  actions: {
    gap:       spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  restartBtn: {
    backgroundColor: colors.green,
    borderRadius:    radius.lg,
    paddingVertical: spacing.base,
    alignItems:      'center',
  },
  homeBtn: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    paddingVertical: spacing.base,
    alignItems:      'center',
  },
});
