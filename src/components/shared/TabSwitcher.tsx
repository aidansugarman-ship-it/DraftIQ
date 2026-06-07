import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface TabItem {
  key:    string;
  label:  string;
  icon:   IoniconName;
  route:  string;   // route to push (use as any for typed routes)
  accent?: string;
}

/**
 * Pill-tab bar dropped on the top of related screens so they feel like
 * one center with tabs (Trade: Finder/Block/Analyzer; Roster: Optimize/Report/Simulate).
 */
export function TabSwitcher({ tabs, activeKey }: { tabs: TabItem[]; activeKey: string }) {
  return (
    <View style={styles.row}>
      {tabs.map(t => {
        const on = t.key === activeKey;
        const tone = t.accent ?? colors.green;
        return (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.tab,
              on
                ? { backgroundColor: `${tone}20`, borderColor: `${tone}90` }
                : { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => { if (!on) router.replace(t.route as any); }}
            activeOpacity={0.75}
          >
            <Ionicons name={t.icon} size={13} color={on ? tone : colors.textTertiary} />
            <Text variant="caption" style={{ color: on ? tone : colors.textTertiary, fontWeight: on ? '800' : '500', letterSpacing: 0.4 }}>
              {t.label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap:           6,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  tab: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               4,
    paddingVertical:   8,
    borderRadius:      999,
    borderWidth:       1,
  },
});
