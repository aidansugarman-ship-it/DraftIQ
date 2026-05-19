import { useEffect, useRef, useState, useCallback } from 'react';
import { gemini } from '@services/gemini';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
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
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { canAccess } from '@constants/tiers';
import { useUserStore } from '@store/useUserStore';
import { espn, EspnNewsItem } from '@services/espn';
import { SPORTS, type SportId } from '@constants/sports';
import { SportSwitcher } from '@components/ui/SportSwitcher';
import { SportTint } from '@components/shared/SportTint';

// ─── Mock player pool ─────────────────────────────────────────────────────────

type Pos = string;

interface TradePlayer {
  id:      string;
  name:    string;
  team:    string;
  pos:     Pos;
  value:   number;   // 0–100 trade value
  score:   number;   // season score
  age:     number;
  bye:     number;
}

const POOLS_BY_SPORT: Record<SportId, TradePlayer[]> = {
  nfl: [
  { id: '1',  name: 'Christian McCaffrey', team: 'SF',  pos: 'RB',  value: 98, score: 98, age: 27, bye: 9 },
  { id: '2',  name: 'CeeDee Lamb',         team: 'DAL', pos: 'WR',  value: 96, score: 96, age: 25, bye: 7 },
  { id: '3',  name: 'Tyreek Hill',          team: 'MIA', pos: 'WR',  value: 93, score: 94, age: 30, bye: 10 },
  { id: '4',  name: 'Justin Jefferson',    team: 'MIN', pos: 'WR',  value: 94, score: 93, age: 25, bye: 6 },
  { id: '5',  name: 'Ja\'Marr Chase',       team: 'CIN', pos: 'WR',  value: 92, score: 92, age: 24, bye: 7 },
  { id: '6',  name: 'Breece Hall',         team: 'NYJ', pos: 'RB',  value: 90, score: 90, age: 23, bye: 12 },
  { id: '7',  name: 'Travis Kelce',        team: 'KC',  pos: 'TE',  value: 87, score: 89, age: 35, bye: 6 },
  { id: '8',  name: 'Davante Adams',       team: 'LV',  pos: 'WR',  value: 85, score: 88, age: 31, bye: 13 },
  { id: '9',  name: 'Austin Ekeler',       team: 'LAC', pos: 'RB',  value: 84, score: 87, age: 29, bye: 5 },
  { id: '10', name: 'Bijan Robinson',      team: 'ATL', pos: 'RB',  value: 88, score: 86, age: 22, bye: 11 },
  { id: '11', name: 'Stefon Diggs',        team: 'BUF', pos: 'WR',  value: 82, score: 85, age: 30, bye: 13 },
  { id: '12', name: 'Tony Pollard',        team: 'DAL', pos: 'RB',  value: 78, score: 84, age: 26, bye: 7 },
  { id: '13', name: 'Josh Allen',          team: 'BUF', pos: 'QB',  value: 94, score: 95, age: 28, bye: 13 },
  { id: '14', name: 'Lamar Jackson',       team: 'BAL', pos: 'QB',  value: 93, score: 94, age: 27, bye: 14 },
  { id: '15', name: 'Sam LaPorta',         team: 'DET', pos: 'TE',  value: 76, score: 80, age: 23, bye: 6 },
  { id: '16', name: 'Puka Nacua',          team: 'LAR', pos: 'WR',  value: 74, score: 79, age: 23, bye: 6 },
  { id: '17', name: 'James Cook',          team: 'BUF', pos: 'RB',  value: 73, score: 78, age: 23, bye: 13 },
  { id: '18', name: 'DK Metcalf',          team: 'SEA', pos: 'WR',  value: 75, score: 77, age: 27, bye: 5 },
  { id: '19', name: 'Josh Jacobs',         team: 'GB',  pos: 'RB',  value: 72, score: 76, age: 26, bye: 6 },
  { id: '20', name: 'Amon-Ra St. Brown',   team: 'DET', pos: 'WR',  value: 80, score: 83, age: 24, bye: 6 },
  { id: '21', name: 'Patrick Mahomes',     team: 'KC',  pos: 'QB',  value: 89, score: 92, age: 29, bye: 6 },
  { id: '22', name: 'Mark Andrews',        team: 'BAL', pos: 'TE',  value: 77, score: 79, age: 28, bye: 14 },
  { id: '23', name: 'Dallas Goedert',      team: 'PHI', pos: 'TE',  value: 76, score: 78, age: 29, bye: 5 },
  { id: '24', name: 'Tee Higgins',         team: 'CIN', pos: 'WR',  value: 71, score: 71, age: 25, bye: 7 },
  { id: '25', name: 'Drake London',        team: 'ATL', pos: 'WR',  value: 68, score: 68, age: 23, bye: 11 },
  { id: '26', name: 'Rashee Rice',         team: 'KC',  pos: 'WR',  value: 74, score: 77, age: 23, bye: 6 },
  { id: '27', name: 'Jaylen Waddle',       team: 'MIA', pos: 'WR',  value: 73, score: 76, age: 26, bye: 10 },
  { id: '28', name: 'Jake Ferguson',       team: 'DAL', pos: 'TE',  value: 72, score: 74, age: 25, bye: 7 },
  { id: '29', name: 'Derrick Henry',       team: 'BAL', pos: 'RB',  value: 65, score: 61, age: 30, bye: 14 },
  { id: '30', name: 'Alvin Kamara',        team: 'NO',  pos: 'RB',  value: 70, score: 73, age: 29, bye: 12 },
  ],
  nba: [
    { id: 'n1',  name: 'Nikola Jokić',          team: 'DEN', pos: 'C',  value: 99, score: 99, age: 30, bye: 0 },
    { id: 'n2',  name: 'Luka Dončić',           team: 'LAL', pos: 'PG', value: 97, score: 97, age: 26, bye: 0 },
    { id: 'n3',  name: 'Shai Gilgeous-Alexander', team: 'OKC', pos: 'PG', value: 96, score: 96, age: 27, bye: 0 },
    { id: 'n4',  name: 'Giannis Antetokounmpo', team: 'MIL', pos: 'PF', value: 95, score: 95, age: 30, bye: 0 },
    { id: 'n5',  name: 'Victor Wembanyama',     team: 'SAS', pos: 'C',  value: 93, score: 92, age: 22, bye: 0 },
    { id: 'n6',  name: 'Anthony Edwards',       team: 'MIN', pos: 'SG', value: 92, score: 91, age: 24, bye: 0 },
    { id: 'n7',  name: 'Jayson Tatum',          team: 'BOS', pos: 'SF', value: 90, score: 90, age: 27, bye: 0 },
    { id: 'n8',  name: 'Tyrese Haliburton',     team: 'IND', pos: 'PG', value: 87, score: 86, age: 25, bye: 0 },
    { id: 'n9',  name: 'Trae Young',            team: 'ATL', pos: 'PG', value: 85, score: 84, age: 26, bye: 0 },
    { id: 'n10', name: 'Domantas Sabonis',      team: 'SAC', pos: 'C',  value: 84, score: 83, age: 29, bye: 0 },
    { id: 'n11', name: 'Devin Booker',          team: 'PHX', pos: 'SG', value: 82, score: 82, age: 28, bye: 0 },
    { id: 'n12', name: 'Jalen Brunson',         team: 'NYK', pos: 'PG', value: 88, score: 88, age: 28, bye: 0 },
    { id: 'n13', name: 'Anthony Davis',         team: 'DAL', pos: 'PF', value: 86, score: 85, age: 32, bye: 0 },
    { id: 'n14', name: 'Karl-Anthony Towns',    team: 'NYK', pos: 'C',  value: 83, score: 83, age: 30, bye: 0 },
    { id: 'n15', name: 'LeBron James',          team: 'LAL', pos: 'SF', value: 78, score: 77, age: 41, bye: 0 },
  ],
  mlb: [
    { id: 'm1',  name: 'Aaron Judge',           team: 'NYY', pos: 'OF', value: 98, score: 98, age: 33, bye: 0 },
    { id: 'm2',  name: 'Shohei Ohtani',         team: 'LAD', pos: 'OF', value: 99, score: 99, age: 31, bye: 0 },
    { id: 'm3',  name: 'Bobby Witt Jr.',        team: 'KC',  pos: 'SS', value: 95, score: 95, age: 25, bye: 0 },
    { id: 'm4',  name: 'Juan Soto',             team: 'NYM', pos: 'OF', value: 94, score: 94, age: 26, bye: 0 },
    { id: 'm5',  name: 'Tarik Skubal',          team: 'DET', pos: 'SP', value: 96, score: 96, age: 28, bye: 0 },
    { id: 'm6',  name: 'Paul Skenes',           team: 'PIT', pos: 'SP', value: 93, score: 92, age: 23, bye: 0 },
    { id: 'm7',  name: 'Gunnar Henderson',      team: 'BAL', pos: 'SS', value: 90, score: 89, age: 24, bye: 0 },
    { id: 'm8',  name: 'Mookie Betts',          team: 'LAD', pos: 'OF', value: 88, score: 87, age: 32, bye: 0 },
    { id: 'm9',  name: 'José Ramírez',          team: 'CLE', pos: '3B', value: 91, score: 90, age: 32, bye: 0 },
    { id: 'm10', name: 'Freddie Freeman',       team: 'LAD', pos: '1B', value: 85, score: 85, age: 35, bye: 0 },
    { id: 'm11', name: 'Corbin Carroll',        team: 'ARI', pos: 'OF', value: 84, score: 83, age: 24, bye: 0 },
    { id: 'm12', name: 'Ronald Acuña Jr.',      team: 'ATL', pos: 'OF', value: 87, score: 86, age: 27, bye: 0 },
    { id: 'm13', name: 'Emmanuel Clase',        team: 'CLE', pos: 'RP', value: 82, score: 81, age: 27, bye: 0 },
    { id: 'm14', name: 'Yainer Diaz',           team: 'HOU', pos: 'C',  value: 75, score: 74, age: 26, bye: 0 },
    { id: 'm15', name: 'Elly De La Cruz',       team: 'CIN', pos: 'SS', value: 89, score: 88, age: 23, bye: 0 },
  ],
  nhl: [
    { id: 'h1',  name: 'Connor McDavid',        team: 'EDM', pos: 'C',  value: 99, score: 99, age: 28, bye: 0 },
    { id: 'h2',  name: 'Nathan MacKinnon',      team: 'COL', pos: 'C',  value: 97, score: 96, age: 30, bye: 0 },
    { id: 'h3',  name: 'Nikita Kucherov',       team: 'TBL', pos: 'RW', value: 96, score: 96, age: 32, bye: 0 },
    { id: 'h4',  name: 'Auston Matthews',       team: 'TOR', pos: 'C',  value: 94, score: 93, age: 28, bye: 0 },
    { id: 'h5',  name: 'Leon Draisaitl',        team: 'EDM', pos: 'C',  value: 93, score: 92, age: 30, bye: 0 },
    { id: 'h6',  name: 'Cale Makar',            team: 'COL', pos: 'D',  value: 92, score: 91, age: 27, bye: 0 },
    { id: 'h7',  name: 'David Pastrňák',        team: 'BOS', pos: 'RW', value: 90, score: 89, age: 29, bye: 0 },
    { id: 'h8',  name: 'Quinn Hughes',          team: 'VAN', pos: 'D',  value: 88, score: 88, age: 26, bye: 0 },
    { id: 'h9',  name: 'Mikko Rantanen',        team: 'COL', pos: 'RW', value: 87, score: 86, age: 29, bye: 0 },
    { id: 'h10', name: 'Sidney Crosby',         team: 'PIT', pos: 'C',  value: 82, score: 81, age: 38, bye: 0 },
    { id: 'h11', name: 'Alexander Ovechkin',    team: 'WSH', pos: 'LW', value: 78, score: 77, age: 40, bye: 0 },
    { id: 'h12', name: 'Connor Hellebuyck',     team: 'WPG', pos: 'G',  value: 86, score: 85, age: 32, bye: 0 },
    { id: 'h13', name: 'Igor Shesterkin',       team: 'NYR', pos: 'G',  value: 84, score: 83, age: 30, bye: 0 },
    { id: 'h14', name: 'Matthew Tkachuk',       team: 'FLA', pos: 'LW', value: 85, score: 84, age: 28, bye: 0 },
    { id: 'h15', name: 'Brad Marchand',         team: 'BOS', pos: 'LW', value: 76, score: 75, age: 37, bye: 0 },
  ],
};

// Backwards-compat alias — defaults to NFL pool. The screen reads from POOLS_BY_SPORT[sport] at runtime.
const PLAYER_POOL: TradePlayer[] = POOLS_BY_SPORT.nfl;

// ─── Mock verdict generator ───────────────────────────────────────────────────

interface Verdict {
  winner:        'giving' | 'receiving' | 'even';
  label:         string;
  confidence:    'low' | 'medium' | 'high';
  givingTotal:   number;
  receivingTotal: number;
  reasoning:     string;
  riskFactors:   string[];
  upsides:       string[];
  shortTerm:     'giving' | 'receiving' | 'even';
  longTerm:      'giving' | 'receiving' | 'even';
}

function analyzeTradeLocally(giving: TradePlayer[], receiving: TradePlayer[]): Verdict {
  const gSum = giving.reduce((s, p) => s + p.value, 0);
  const rSum = receiving.reduce((s, p) => s + p.value, 0);
  const diff = rSum - gSum;
  const confidence: Verdict['confidence'] = Math.abs(diff) > 15 ? 'high' : Math.abs(diff) > 6 ? 'medium' : 'low';

  let winner: Verdict['winner'] = 'even';
  let label = "Even trade — both sides get fair value.";
  if (diff > 6) { winner = 'receiving'; label = 'You WIN this trade.'; }
  if (diff < -6) { winner = 'giving'; label = 'You LOSE this trade.'; }

  const avgGivingAge  = giving.reduce((s, p) => s + p.age, 0) / giving.length;
  const avgReceivingAge = receiving.reduce((s, p) => s + p.value, 0) / receiving.length;

  const shortTerm: Verdict['winner'] = diff > 0 ? 'receiving' : diff < 0 ? 'giving' : 'even';
  const longTerm:  Verdict['winner'] = avgGivingAge < avgReceivingAge ? 'giving' : 'receiving';

  const highValueReceiver = receiving.find(p => p.value >= 85);
  const highValueGiver    = giving.find(p => p.value >= 85);

  const reasoning = diff > 6
    ? `You're acquiring ${highValueReceiver?.name ?? 'better overall value'} and coming out ahead on total trade value. The ${confidence} confidence rating reflects how clear the edge is.`
    : diff < -6
    ? `You're giving up more value than you're receiving. ${highValueGiver?.name ?? 'Your top asset'} commands premium value — make sure what you're getting back justifies it.`
    : `This trade is essentially a wash on pure value. The decision comes down to roster needs, positional scarcity, and upcoming schedules rather than raw numbers.`;

  const riskFactors: string[] = [];
  const upsides:    string[] = [];

  giving.forEach(p => {
    if (p.age >= 30) riskFactors.push(`${p.name} is ${p.age} — age-related decline is a real risk.`);
    if (p.score >= 90) riskFactors.push(`Selling ${p.name} at ${p.score} value is a big move — ensure you have depth.`);
  });
  receiving.forEach(p => {
    if (p.age <= 24) upsides.push(`${p.name} (${p.age}) has prime years ahead — upside play.`);
    if (p.score >= 88) upsides.push(`${p.name} brings elite-tier production at ${p.score} score.`);
  });

  if (riskFactors.length === 0) riskFactors.push('No major red flags — standard trade risk applies.');
  if (upsides.length === 0) upsides.push('Positional scarcity may make this trade better than the numbers suggest.');

  return { winner, label, confidence, givingTotal: gSum, receivingTotal: rSum, reasoning, riskFactors, upsides, shortTerm, longTerm };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const POS_COLORS: Record<Pos, string> = {
  QB:  colors.coral,
  RB:  colors.green,
  WR:  colors.blue,
  TE:  colors.gold,
  K:   colors.textTertiary,
  DEF: colors.purple,
};

function PosBadge({ pos }: { pos: Pos }) {
  return (
    <View style={[posStyles.badge, { backgroundColor: `${POS_COLORS[pos]}20` }]}>
      <Text variant="labelSmall" style={{ color: POS_COLORS[pos] }}>{pos}</Text>
    </View>
  );
}

function ValueBar({ value, color }: { value: number; color: string }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(value, { duration: 700, easing: Easing.out(Easing.quad) });
  }, [value]);
  const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={vbar.track}>
      <Animated.View style={[vbar.fill, { backgroundColor: color }, barStyle]} />
    </View>
  );
}

function PlayerChip({
  player,
  onRemove,
  side,
}: {
  player:   TradePlayer;
  onRemove: () => void;
  side:     'giving' | 'receiving';
}) {
  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} layout={Layout}>
      <View style={[chip.wrap, { borderColor: `${POS_COLORS[player.pos]}40` }]}>
        <PosBadge pos={player.pos} />
        <View style={{ flex: 1 }}>
          <Text variant="bodySmall" color={colors.textPrimary} numberOfLines={1}>{player.name}</Text>
          <Text variant="caption" color={colors.textTertiary}>{player.team} · {player.value} val</Text>
        </View>
        <TouchableOpacity onPress={onRemove} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function PickerModal({
  visible,
  onClose,
  onSelect,
  excluded,
  sport,
}: {
  visible:  boolean;
  onClose:  () => void;
  onSelect: (p: TradePlayer) => void;
  excluded: string[];
  sport:    SportId;
}) {
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState<string>('ALL');

  const pool = POOLS_BY_SPORT[sport] ?? POOLS_BY_SPORT.nfl;
  const positions = Array.from(new Set(pool.map(p => p.pos)));

  const filtered = pool.filter(p => {
    if (excluded.includes(p.id)) return false;
    const matchPos    = posFilter === 'ALL' || p.pos === posFilter;
    const matchSearch = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.team.toLowerCase().includes(query.toLowerCase());
    return matchPos && matchSearch;
  });

  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={modal.overlay}>
      <View style={modal.sheet}>
        <View style={modal.handleBar} />
        <View style={modal.header}>
          <Text variant="bodyMedium" color={colors.textPrimary}>Add Player</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
        <View style={modal.searchWrap}>
          <Ionicons name="search" size={14} color={colors.textTertiary} style={{ marginRight: 6 }} />
          <TextInput
            style={modal.input}
            placeholder="Search players…"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modal.posScroll} contentContainerStyle={{ paddingRight: spacing.base }}>
          {(['ALL', ...positions]).map(pos => (
            <TouchableOpacity
              key={pos}
              style={[modal.pill, posFilter === pos && modal.pillActive]}
              onPress={() => setPosFilter(pos)}
              activeOpacity={0.7}
            >
              <Text variant="labelSmall" style={{ color: posFilter === pos ? colors.textPrimary : colors.textTertiary }}>{pos}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={modal.playerRow}
              onPress={() => { onSelect(item); onClose(); }}
              activeOpacity={0.75}
            >
              <PosBadge pos={item.pos} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.textPrimary}>{item.name}</Text>
                <Text variant="caption" color={colors.textTertiary}>{item.team} · Age {item.age}</Text>
              </View>
              <View style={[modal.valBadge, { backgroundColor: item.value >= 85 ? `${colors.green}20` : `${colors.blue}15` }]}>
                <Text variant="labelSmall" style={{ color: item.value >= 85 ? colors.green : colors.blue }}>{item.value}</Text>
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 360 }}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      </View>
    </Animated.View>
  );
}

// ─── Verdict card ─────────────────────────────────────────────────────────────

function VerdictCard({ verdict }: { verdict: Verdict }) {
  const winColor = verdict.winner === 'receiving' ? colors.green : verdict.winner === 'giving' ? colors.coral : colors.gold;

  const op = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500 });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  const confLabel = verdict.confidence === 'high' ? 'HIGH' : verdict.confidence === 'medium' ? 'MEDIUM' : 'LOW';
  const confColor = verdict.confidence === 'high' ? colors.green : verdict.confidence === 'medium' ? colors.gold : colors.textTertiary;

  return (
    <Animated.View style={[vcard.wrap, { borderColor: `${winColor}40` }, anim]}>
      <LinearGradient
        colors={[`${winColor}0C`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Verdict header */}
      <View style={vcard.header}>
        <View>
          <Text variant="labelSmall" color={colors.textTertiary} style={{ letterSpacing: 1 }}>
            THE READ
          </Text>
          <Text variant="h3" style={{ color: winColor, marginTop: 4 }}>{verdict.label}</Text>
        </View>
        <View style={[vcard.confBadge, { backgroundColor: `${confColor}18`, borderColor: `${confColor}40` }]}>
          <Text variant="labelSmall" style={{ color: confColor }}>{confLabel}</Text>
        </View>
      </View>

      {/* Value bars */}
      <View style={vcard.bars}>
        <View style={vcard.barRow}>
          <Text variant="bodySmall" color={colors.textSecondary} style={{ width: 76 }}>Giving</Text>
          <ValueBar value={verdict.givingTotal / PLAYER_POOL[0].value * 100} color={colors.coral} />
          <Text variant="bodySmallMedium" style={{ color: colors.coral, width: 32, textAlign: 'right' }}>{verdict.givingTotal}</Text>
        </View>
        <View style={vcard.barRow}>
          <Text variant="bodySmall" color={colors.textSecondary} style={{ width: 76 }}>Receiving</Text>
          <ValueBar value={verdict.receivingTotal / PLAYER_POOL[0].value * 100} color={colors.green} />
          <Text variant="bodySmallMedium" style={{ color: colors.green, width: 32, textAlign: 'right' }}>{verdict.receivingTotal}</Text>
        </View>
      </View>

      {/* Reasoning */}
      <View style={vcard.section}>
        <Text variant="labelSmall" color={colors.textTertiary} style={vcard.sectionTitle}>ANALYSIS</Text>
        <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 20 }}>{verdict.reasoning}</Text>
      </View>

      {/* Short / Long term */}
      <View style={vcard.termRow}>
        <View style={vcard.termBox}>
          <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 0.8 }}>SHORT-TERM</Text>
          <Text variant="bodySmallMedium" style={{
            color: verdict.shortTerm === 'receiving' ? colors.green : verdict.shortTerm === 'giving' ? colors.coral : colors.gold,
            marginTop: 4,
          }}>
            {verdict.shortTerm === 'receiving' ? 'You Win' : verdict.shortTerm === 'giving' ? 'You Lose' : 'Even'}
          </Text>
        </View>
        <View style={[vcard.termBox, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
          <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 0.8 }}>LONG-TERM</Text>
          <Text variant="bodySmallMedium" style={{
            color: verdict.longTerm === 'receiving' ? colors.green : verdict.longTerm === 'giving' ? colors.coral : colors.gold,
            marginTop: 4,
          }}>
            {verdict.longTerm === 'receiving' ? 'You Win' : verdict.longTerm === 'giving' ? 'You Lose' : 'Even'}
          </Text>
        </View>
      </View>

      {/* Risk & Upside */}
      {verdict.riskFactors.length > 0 && (
        <View style={vcard.section}>
          <Text variant="labelSmall" color={colors.coral} style={vcard.sectionTitle}>⚠ RISK FACTORS</Text>
          {verdict.riskFactors.map((r, i) => (
            <View key={i} style={vcard.bullet}>
              <Text variant="caption" color={colors.coral} style={vcard.dot}>•</Text>
              <Text variant="bodySmall" color={colors.textSecondary} style={{ flex: 1, lineHeight: 18 }}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {verdict.upsides.length > 0 && (
        <View style={vcard.section}>
          <Text variant="labelSmall" color={colors.green} style={vcard.sectionTitle}>✦ UPSIDE</Text>
          {verdict.upsides.map((u, i) => (
            <View key={i} style={vcard.bullet}>
              <Text variant="caption" color={colors.green} style={vcard.dot}>•</Text>
              <Text variant="bodySmall" color={colors.textSecondary} style={{ flex: 1, lineHeight: 18 }}>{u}</Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type ModalSide = 'giving' | 'receiving' | null;

// ─── Trade signal card (hot/cold movers from news) ────────────────────────────

function TradeSignalCard({ item, sport }: { item: EspnNewsItem; sport: SportId }) {
  const [aiTake, setAiTake]       = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI]       = useState(false);

  const handleAsk = useCallback(() => {
    if (aiTake) {
      setShowAI((v) => !v);
      return;
    }
    setShowAI(true);
    setAiLoading(true);
    const sportLabel = SPORTS[sport].shortLabel;
    const prompt = `News headline: "${item.headline}". From a fantasy ${sportLabel} trade angle — is the player(s) involved a SELL HIGH (hot), BUY LOW (cold), or HOLD right now? Give the call first, then one-line reasoning.`;
    // Reuse articleTake — system prompt is already tuned, just routes through ask().
    gemini.articleTake(prompt, sportLabel)
      .then(setAiTake)
      .catch(() => setAiTake('AI take unavailable right now.'))
      .finally(() => setAiLoading(false));
  }, [aiTake, item.headline, sport]);

  return (
    <View style={tradeSignalStyles.card}>
      <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={2}>
        {item.headline}
      </Text>
      <View style={tradeSignalStyles.cardBottom}>
        <Text variant="caption" color={colors.textTertiary}>
          {new Date(item.published).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={handleAsk} activeOpacity={0.7} style={tradeSignalStyles.askBtn}>
          <Ionicons name="flash" size={12} color={colors.green} />
          <Text variant="labelSmall" style={{ color: colors.green, fontSize: 11 }}>
            {showAI && aiTake ? 'Hide' : 'Trade angle'}
          </Text>
        </TouchableOpacity>
      </View>
      {showAI && (
        <View style={tradeSignalStyles.aiBox}>
          {aiLoading
            ? <Text variant="bodySmall" color={colors.textTertiary}>Thinking…</Text>
            : <Text variant="bodySmall" color={colors.textSecondary}>{aiTake}</Text>
          }
        </View>
      )}
    </View>
  );
}

const tradeSignalStyles = StyleSheet.create({
  section: {
    marginTop:    spacing.lg,
    marginBottom: spacing.lg,
    padding:      spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth:  1,
    borderColor:  colors.border,
  },
  headerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.xs,
  },
  livePill: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius:    999,
    backgroundColor: `${colors.green}14`,
  },
  liveDot: {
    width: 5, height: 5, borderRadius: 5,
    backgroundColor: colors.green,
  },
  card: {
    paddingVertical:   spacing.sm,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
  },
  cardBottom: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      6,
  },
  askBtn: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              4,
    paddingHorizontal: spacing.sm,
    paddingVertical:  4,
    borderRadius:     radius.sm,
    backgroundColor:  `${colors.green}14`,
    borderWidth:      1,
    borderColor:      `${colors.green}40`,
  },
  aiBox: {
    marginTop:        spacing.xs,
    padding:          spacing.sm,
    borderRadius:     radius.sm,
    backgroundColor:  `${colors.green}0A`,
    borderLeftWidth:  2,
    borderLeftColor:  colors.green,
  },
});

export default function TradeAnalyzerScreen() {
  const tier         = useUserStore(s => s.tier);
  const currentSport = useUserStore(s => s.currentSport);
  const sportLabel   = SPORTS[currentSport].shortLabel;
  const user         = useUserStore(s => s.user);
  const leagueCtx    = user?.leagueSettings;
  const scoringDesc  = leagueCtx ? `${leagueCtx.scoringType?.toUpperCase() ?? 'standard'} scoring, ${leagueCtx.numTeams ?? 12}-team${leagueCtx.isDynasty ? ' dynasty' : ''}` : `${sportLabel} fantasy`;

  const [giving,    setGiving]    = useState<TradePlayer[]>([]);
  const [receiving, setReceiving] = useState<TradePlayer[]>([]);
  const [modalSide, setModalSide] = useState<ModalSide>(null);
  const [verdict,   setVerdict]   = useState<Verdict | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  // Per-player breakdowns (one read per player) so the user sees WHY a side wins
  const [playerReads, setPlayerReads] = useState<Record<string, string>>({});

  const [signals, setSignals]               = useState<EspnNewsItem[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSignalsLoading(true);
    espn.news(currentSport, 6)
      .then((items) => { if (!cancelled) setSignals(items); })
      .catch(() => { if (!cancelled) setSignals([]); })
      .finally(() => { if (!cancelled) setSignalsLoading(false); });
    return () => { cancelled = true; };
  }, [currentSport]);

  const op = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  const excluded = [...giving.map(p => p.id), ...receiving.map(p => p.id)];

  function openPicker(side: ModalSide) {
    setModalSide(side);
  }

  function addPlayer(side: 'giving' | 'receiving', player: TradePlayer) {
    if (side === 'giving') setGiving(prev => [...prev, player]);
    else setReceiving(prev => [...prev, player]);
    setVerdict(null);
  }

  function removePlayer(side: 'giving' | 'receiving', id: string) {
    if (side === 'giving') setGiving(prev => prev.filter(p => p.id !== id));
    else setReceiving(prev => prev.filter(p => p.id !== id));
    setVerdict(null);
  }

  async function analyze() {
    if (giving.length === 0 || receiving.length === 0) return;
    setAnalyzing(true);
    setPlayerReads({});
    try {
      const localVerdict = analyzeTradeLocally(giving, receiving);
      const givingStr    = giving.map(p => `${p.name} (${p.position}, ${p.team})`).join(', ');
      const receivingStr = receiving.map(p => `${p.name} (${p.position}, ${p.team})`).join(', ');

      const prompt = `${sportLabel} fantasy trade review for ${scoringDesc}.
GIVING: ${givingStr}
RECEIVING: ${receivingStr}

Give a sharp, opinionated verdict in 3 short paragraphs:
1. Bottom line — who wins this trade in ONE sentence (use ALL CAPS for the verdict word).
2. Why — the 2-3 specific factors driving your call (position scarcity, schedule, role, age curve, etc.). Reference the league context (${scoringDesc}).
3. Counter — the strongest case for the OTHER side, so the user can pressure-test.

TikTok creator voice: confident, brief, opinionated. No fluff. No disclaimers.`;

      const aiReasoning = await gemini.chat(prompt, sportLabel);
      setVerdict({ ...localVerdict, reasoning: aiReasoning });

      // Background: fetch per-player breakdowns (parallel, fire-and-forget)
      [...giving, ...receiving].forEach((p) => {
        const side = giving.includes(p) ? 'GIVING' : 'RECEIVING';
        const sub  = `${sportLabel} fantasy take on ${p.name} (${p.position}, ${p.team}) in ${scoringDesc}. ONE punchy sentence on his current trade value and ONE on whether you'd want him on the ${side} side of this trade.`;
        gemini.chat(sub, sportLabel)
          .then(read => setPlayerReads(prev => ({ ...prev, [p.id]: read })))
          .catch(() => {});
      });
    } catch {
      const v = analyzeTradeLocally(giving, receiving);
      setVerdict(v);
    } finally {
      setAnalyzing(false);
    }
  }

  const canAnalyze = giving.length > 0 && receiving.length > 0 && !analyzing;

  return (
    <View style={styles.container}>
      <SportTint sport={currentSport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="bodyMedium" color={colors.textPrimary}>Trade Analyzer</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <Animated.View style={heroStyle}>
            <Text style={styles.title}>TRADE{'\n'}ANALYZER.</Text>
            <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
              Add players to each side. AI evaluates value, risk, and dynasty implications.
            </Text>
          </Animated.View>

          {/* Trade signals — hot/cold movers from live news */}
          <Animated.View style={[tradeSignalStyles.section, heroStyle]}>
            <View style={tradeSignalStyles.headerRow}>
              <Text variant="label" color={colors.textTertiary} style={{ letterSpacing: 1 }}>
                {sportLabel} TRADE SIGNALS
              </Text>
              <View style={tradeSignalStyles.livePill}>
                <View style={tradeSignalStyles.liveDot} />
                <Text variant="labelSmall" style={{ color: colors.green, fontSize: 9 }}>LIVE</Text>
              </View>
            </View>
            <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
              Tap "Trade angle" on any storyline for an AI buy-low / sell-high read.
            </Text>
            {signalsLoading ? (
              <Text variant="bodySmall" color={colors.textTertiary}>Loading…</Text>
            ) : signals.length === 0 ? (
              <Text variant="bodySmall" color={colors.textTertiary}>No live signals right now.</Text>
            ) : (
              signals.slice(0, 4).map((item) => (
                <TradeSignalCard key={item.id} item={item} sport={currentSport} />
              ))
            )}
          </Animated.View>

          {/* Trade builder */}
          <View style={styles.tradeBuilder}>

            {/* Giving side */}
            <View style={styles.tradeSide}>
              <View style={styles.sideHeader}>
                <View style={[styles.sideTag, { backgroundColor: `${colors.coral}20`, borderColor: `${colors.coral}40` }]}>
                  <Text variant="labelSmall" style={{ color: colors.coral }}>YOU GIVE</Text>
                </View>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => openPicker('giving')}
                  activeOpacity={0.75}
                  disabled={giving.length >= 4}
                >
                  <Ionicons name="add" size={16} color={giving.length >= 4 ? colors.textTertiary : colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {giving.length === 0 ? (
                <TouchableOpacity style={styles.emptySlot} onPress={() => openPicker('giving')} activeOpacity={0.7}>
                  <Ionicons name="person-add-outline" size={18} color={colors.textTertiary} />
                  <Text variant="bodySmall" color={colors.textTertiary}>Tap to add player</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {giving.map(p => (
                    <PlayerChip key={p.id} player={p} side="giving" onRemove={() => removePlayer('giving', p.id)} />
                  ))}
                </View>
              )}
            </View>

            {/* VS divider */}
            <View style={styles.vsWrap}>
              <View style={styles.vsLine} />
              <View style={styles.vsCircle}>
                <Text variant="labelSmall" color={colors.textTertiary}>VS</Text>
              </View>
              <View style={styles.vsLine} />
            </View>

            {/* Receiving side */}
            <View style={styles.tradeSide}>
              <View style={styles.sideHeader}>
                <View style={[styles.sideTag, { backgroundColor: `${colors.green}15`, borderColor: `${colors.green}35` }]}>
                  <Text variant="labelSmall" style={{ color: colors.green }}>YOU GET</Text>
                </View>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => openPicker('receiving')}
                  activeOpacity={0.75}
                  disabled={receiving.length >= 4}
                >
                  <Ionicons name="add" size={16} color={receiving.length >= 4 ? colors.textTertiary : colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {receiving.length === 0 ? (
                <TouchableOpacity style={styles.emptySlot} onPress={() => openPicker('receiving')} activeOpacity={0.7}>
                  <Ionicons name="person-add-outline" size={18} color={colors.textTertiary} />
                  <Text variant="bodySmall" color={colors.textTertiary}>Tap to add player</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {receiving.map(p => (
                    <PlayerChip key={p.id} player={p} side="receiving" onRemove={() => removePlayer('receiving', p.id)} />
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Analyze button */}
          <TouchableOpacity
            style={[styles.analyzeBtn, !canAnalyze && styles.analyzeBtnDisabled]}
            onPress={analyze}
            activeOpacity={0.85}
            disabled={!canAnalyze}
          >
            {analyzing ? (
              <View style={styles.analyzingRow}>
                <Text variant="bodyMedium" color={colors.background}>Analyzing…</Text>
              </View>
            ) : (
              <LinearGradient
                colors={canAnalyze ? [colors.green, '#00CC6A'] : [colors.surface, colors.surface]}
                style={styles.analyzeGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="flash" size={16} color={canAnalyze ? colors.background : colors.textTertiary} />
                <Text variant="bodyMedium" color={canAnalyze ? colors.background : colors.textTertiary}>
                  Analyze Trade
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          {/* Verdict */}
          {verdict && <VerdictCard verdict={verdict} />}

          {/* Per-player breakdowns — the depth that makes trade analyzer feel pro */}
          {verdict && (giving.length + receiving.length > 0) && (
            <View style={breakdownStyles.section}>
              <Text variant="label" color={colors.textTertiary} style={{ letterSpacing: 1, marginBottom: spacing.sm }}>
                PER-PLAYER READ · {scoringDesc.toUpperCase()}
              </Text>
              {giving.map(p => (
                <PerPlayerRead key={`g-${p.id}`} player={p} side="GIVING" text={playerReads[p.id]} />
              ))}
              {receiving.map(p => (
                <PerPlayerRead key={`r-${p.id}`} player={p} side="RECEIVING" text={playerReads[p.id]} />
              ))}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Player picker modal */}
        <PickerModal
          visible={modalSide !== null}
          onClose={() => setModalSide(null)}
          onSelect={p => modalSide && addPlayer(modalSide, p)}
          excluded={excluded}
          sport={currentSport}
        />
      </SafeAreaView>
    </View>
  );
}

// ─── Per-player read row ──────────────────────────────────────────────────────

function PerPlayerRead({ player, side, text }: { player: TradePlayer; side: 'GIVING' | 'RECEIVING'; text?: string }) {
  const sideColor = side === 'GIVING' ? colors.coral : colors.green;
  return (
    <View style={[breakdownStyles.row, { borderLeftColor: sideColor }]}>
      <View style={breakdownStyles.headRow}>
        <View style={[breakdownStyles.sidePill, { backgroundColor: `${sideColor}18`, borderColor: `${sideColor}45` }]}>
          <Text variant="labelSmall" style={{ color: sideColor, fontSize: 10, letterSpacing: 0.5 }}>{side}</Text>
        </View>
        <Text variant="bodyMedium" color={colors.textPrimary} style={{ flex: 1 }} numberOfLines={1}>
          {player.name} <Text variant="caption" color={colors.textTertiary}>· {player.position} · {player.team}</Text>
        </Text>
      </View>
      {text ? (
        <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 6, lineHeight: 19 }}>
          {text}
        </Text>
      ) : (
        <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: 6 }}>
          Reading the latest on this player…
        </Text>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const breakdownStyles = StyleSheet.create({
  section: {
    marginTop:    spacing.lg,
    marginBottom: spacing.lg,
  },
  row: {
    padding:         spacing.base,
    borderRadius:    radius.lg,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderLeftWidth: 3,
    marginBottom:    spacing.sm,
  },
  headRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  sidePill: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      999,
    borderWidth:       1,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingBottom:     100,
  },

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

  title: {
    ...typography.h1,
    fontSize:     44,
    lineHeight:   46,
    color:        colors.textPrimary,
    marginTop:    spacing.xl,
    marginBottom: spacing.sm,
  },
  subtitle: {
    lineHeight:   22,
    marginBottom: spacing.xl,
  },

  tradeBuilder: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.xl,
    padding:         spacing.base,
    gap:             spacing.md,
    marginBottom:    spacing.xl,
  },
  tradeSide:  { gap: spacing.sm },
  sideHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  sideTag: {
    paddingHorizontal: spacing.md,
    paddingVertical:   4,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  addBtn: {
    width:           28,
    height:          28,
    borderRadius:    radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  emptySlot: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.sm,
    borderWidth:     1,
    borderColor:     colors.borderSubtle,
    borderStyle:     'dashed',
    borderRadius:    radius.md,
    paddingVertical: spacing.base,
  },

  vsWrap: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
    paddingVertical: spacing.xs,
  },
  vsLine:   { flex: 1, height: 1, backgroundColor: colors.border },
  vsCircle: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: colors.surfaceElevated,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },

  analyzeBtn: {
    borderRadius: radius.lg,
    overflow:     'hidden',
    marginBottom: spacing.xl,
  },
  analyzeBtnDisabled: { opacity: 0.6 },
  analyzeGrad: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.sm,
    paddingVertical: spacing.base,
  },
  analyzingRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: spacing.base,
    backgroundColor: colors.green,
  },

  bottomSpacer: { height: spacing['2xl'] },
});

const chip = StyleSheet.create({
  wrap: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              spacing.sm,
    backgroundColor:  colors.surfaceElevated,
    borderWidth:      1,
    borderRadius:     radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
  },
});

const posStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      4,
    minWidth:          32,
    alignItems:        'center',
  },
});

const vbar = StyleSheet.create({
  track: {
    flex:            1,
    height:          6,
    backgroundColor: colors.surfaceElevated,
    borderRadius:    3,
    overflow:        'hidden',
  },
  fill: {
    height:       6,
    borderRadius: 3,
  },
});

const vcard = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    gap:             spacing.lg,
    overflow:        'hidden',
    marginBottom:    spacing.xl,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  confBadge: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  bars: { gap: spacing.md },
  barRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
  section: { gap: spacing.sm },
  sectionTitle: { letterSpacing: 1 },
  termRow: {
    flexDirection:   'row',
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    overflow:        'hidden',
  },
  termBox: {
    flex:    1,
    padding: spacing.md,
  },
  bullet: {
    flexDirection: 'row',
    gap:           spacing.sm,
    alignItems:    'flex-start',
  },
  dot: { marginTop: 1 },
});

const modal = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent:  'flex-end',
    zIndex:          100,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth:  1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor:     colors.border,
    paddingBottom:   40,
    maxHeight:       '80%',
  },
  handleBar: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.border,
    alignSelf:       'center',
    marginTop:       spacing.md,
    marginBottom:    spacing.sm,
  },
  header: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    paddingHorizontal: spacing.base,
    paddingBottom:    spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.background,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    marginHorizontal: spacing.base,
    marginTop:       spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical:  8,
  },
  input: {
    flex:       1,
    color:      colors.textPrimary,
    fontSize:   14,
    fontFamily: 'DMSans_400Regular',
  },
  posScroll: {
    marginTop:  spacing.md,
    marginLeft: spacing.base,
    marginBottom: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical:   5,
    borderRadius:      radius.full,
    marginRight:       spacing.xs,
    backgroundColor:   colors.background,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  pillActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor:     colors.textTertiary,
  },
  playerRow: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    gap:              spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  valBadge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      radius.sm,
    minWidth:          36,
    alignItems:        'center',
  },
});
