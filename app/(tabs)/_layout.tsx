import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors } from '@constants/colors';
import { typography } from '@constants/typography';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name:     IoniconName;
  focused:  boolean;
  label:    string;
}

function TabIcon({ name, focused, label }: TabIconProps) {
  return (
    <View style={[tabStyles.wrap, focused && tabStyles.wrapActive]}>
      <Ionicons
        name={name}
        size={22}
        color={focused ? colors.green : colors.textTertiary}
      />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: tabStyles.bar,
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={60}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, tabStyles.androidBg]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'list' : 'list-outline'} focused={focused} label="Board" />
          ),
        }}
      />
      <Tabs.Screen
        name="draft"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'flash' : 'flash-outline'} focused={focused} label="Draft" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} label="Profile" />
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    position:        'absolute',
    borderTopWidth:  1,
    borderTopColor:  colors.border,
    backgroundColor: 'transparent',
    elevation:       0,
    height:          Platform.OS === 'ios' ? 84 : 64,
  },
  androidBg: {
    backgroundColor: colors.surface,
  },
  wrap: {
    width:           48,
    height:          40,
    alignItems:      'center',
    justifyContent:  'center',
    borderRadius:    12,
  },
  wrapActive: {
    backgroundColor: 'rgba(0,255,135,0.1)',
  },
});
