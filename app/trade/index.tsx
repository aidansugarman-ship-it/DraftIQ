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

// ─── Mock player pool ─────────────────────────────────────────────────────────

type Pos = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';

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

const PLAYER_POOL: TradePlayer[] = [
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
];

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
}: {
  visible:  boolean;
  onClose:  () => void;
  onSelect: (p: TradePlayer) => void;
  excluded: string[];
}) {
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState<Pos | 'ALL'>('ALL');

  const filtered = PLAYER_POOL.filter(p => {
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
          {(['ALL', 'QB', 'RB', 'WR', 'TE'] as const).map(pos => (
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
            AI VERDICT
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

export default function TradeAnalyzerScreen() {
  const tier = useUserStore(s => s.tier);

  const [giving,    setGiving]    = useState<TradePlayer[]>([]);
  const [receiving, setReceiving] = useState<TradePlayer[]>([]);
  const [modalSide, setModalSide] = useState<ModalSide>(null);
  const [verdict,   setVerdict]   = useState<Verdict | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

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
    try {
      const localVerdict = analyzeTradeLocally(giving, receiving);
      const aiReasoning = await gemini.tradeAdvice(
        giving.map(p => `${p.name} (${p.position})`),
        receiving.map(p => `${p.name} (${p.position})`),
        'NFL'
      );
      setVerdict({ ...localVerdict, reasoning: aiReasoning });
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

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Player picker modal */}
        <PickerModal
          visible={modalSide !== null}
          onClose={() => setModalSide(null)}
          onSelect={p => modalSide && addPlayer(modalSide, p)}
          excluded={excluded}
        />
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
