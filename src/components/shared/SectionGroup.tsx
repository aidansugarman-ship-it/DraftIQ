import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Collapsible section group. Used on the sport hub to bucket content
 * into clear chapters: URGENT / TODAY / YOUR TEAM / LEAGUE / DISCOVER.
 */
export function SectionGroup({
  label,
  emoji,
  accent,
  children,
  defaultOpen = true,
  subtitle,
}: {
  label:        string;
  emoji?:       string;
  accent?:      string;
  children:     React.ReactNode;
  defaultOpen?: boolean;
  subtitle?:    string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tone = accent ?? colors.green;

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.create(
      180,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity,
    ));
    setOpen(o => !o);
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.75} style={styles.head}>
        <View style={styles.headLeft}>
          {!!emoji && <Text style={styles.emoji}>{emoji}</Text>}
          <View>
            <Text style={[styles.label, { color: tone }]}>{label}</Text>
            {!!subtitle && (
              <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 1 }}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.chev, { borderColor: `${tone}55` }]}>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={tone}
          />
        </View>
      </TouchableOpacity>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  head: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingVertical:  spacing.sm,
    marginBottom:     spacing.sm,
    paddingHorizontal: 2,
  },
  headLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  emoji: {
    fontSize:   18,
    lineHeight: 22,
  },
  label: {
    fontSize:      13,
    fontWeight:    '900',
    letterSpacing: 1.4,
  },
  chev: {
    width:        26,
    height:       26,
    borderRadius: 13,
    borderWidth:  1,
    alignItems:   'center',
    justifyContent: 'center',
  },
  body: {
    // No special wrapper styles — children render in their natural spacing
  },
});
