import { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { gemini } from '@services/gemini';

type Message = { role: 'user' | 'ai'; text: string };

const SUGGESTED = [
  'Should I start Derrick Henry this week?',
  'Is this trade fair: Davante Adams for CeeDee Lamb?',
  'Who are the best waiver pickups right now?',
  'Grade my draft: McCaffrey, Hill, Kelce, Jefferson, Pollard',
];

export default function AskAIScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "What's your fantasy question? I'll give you the sharpest take possible." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const question = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setLoading(true);
    scrollRef.current?.scrollToEnd({ animated: true });

    try {
      const answer = await gemini.playerAnalysis(question, '', '', 'fantasy sports');
      setMessages(prev => [...prev, { role: 'ai', text: answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong. Try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LinearGradient colors={['#00FF87', '#00D4FF']} style={styles.aiDot} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          <Text style={styles.title}>Ask DraftIQ AI</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 1 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsLabel}>Try asking:</Text>
              {SUGGESTED.map((s, i) => (
                <TouchableOpacity key={i} style={styles.suggestionChip} onPress={() => send(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              {m.role === 'ai' && (
                <LinearGradient colors={['#00FF87', '#00D4FF']} style={styles.aiAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="flash" size={12} color="#000" />
                </LinearGradient>
              )}
              <View style={[styles.bubbleContent, m.role === 'user' ? styles.userContent : styles.aiContent]}>
                <Text style={[styles.bubbleText, m.role === 'user' && styles.userText]}>{m.text}</Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={[styles.bubble, styles.aiBubble]}>
              <LinearGradient colors={['#00FF87', '#00D4FF']} style={styles.aiAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="flash" size={12} color="#000" />
              </LinearGradient>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything fantasy..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
          >
            <LinearGradient
              colors={input.trim() && !loading ? ['#00FF87', '#00D4FF'] : [colors.surface, colors.surface]}
              style={styles.sendGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="arrow-up" size={20} color={input.trim() && !loading ? '#000' : colors.textMuted} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:          { width: 40, height: 40, justifyContent: 'center' },
  headerCenter:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiDot:            { width: 10, height: 10, borderRadius: 5 },
  title:            { fontSize: 18, fontWeight: '700', color: colors.text },
  messages:         { flex: 1 },
  messagesContent:  { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  suggestions:      { marginBottom: spacing.md },
  suggestionsLabel: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  suggestionChip:   { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  suggestionText:   { color: colors.textSecondary, fontSize: 14 },
  bubble:           { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  userBubble:       { justifyContent: 'flex-end' },
  aiBubble:         { justifyContent: 'flex-start' },
  aiAvatar:         { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 2, flexShrink: 0 },
  bubbleContent:    { maxWidth: '80%', borderRadius: radius.lg, padding: spacing.sm },
  userContent:      { backgroundColor: colors.accent },
  aiContent:        { backgroundColor: colors.surface },
  bubbleText:       { fontSize: 15, color: colors.text, lineHeight: 22 },
  userText:         { color: '#000' },
  typingBubble:     { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm, minWidth: 60, alignItems: 'center' },
  inputRow:         { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  input:            { flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: 15, maxHeight: 120, borderWidth: 1, borderColor: colors.border },
  sendBtn:          { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  sendBtnDisabled:  { opacity: 0.5 },
  sendGradient:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
