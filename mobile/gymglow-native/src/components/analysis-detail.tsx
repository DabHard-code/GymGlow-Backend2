import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/glass-card';
import { SpeakButton } from '@/components/speak-button';
import type { Analysis } from '@/lib/types';
import { colors } from '@/theme/colors';

const severityColors = {
  critical: colors.danger,
  warning: colors.warning,
  info: colors.secondary,
};

export function AnalysisDetail({ analysis }: { analysis: Analysis }) {
  const feedback = analysis.feedback ?? [];
  const strengths = analysis.strengths ?? [];
  const safetyNotes = analysis.safetyNotes ?? [];
  const progressionTips = analysis.progressionTips ?? [];
  const speechText = [
    `GymGlow analysis. Overall score ${analysis.overallScore}.`,
    analysis.summary,
    strengths.length ? `What looked strong: ${strengths.join('. ')}.` : '',
    analysis.technicalBreakdown ? `Technical breakdown: ${analysis.technicalBreakdown}` : '',
    feedback.length
      ? `Coaching feedback: ${feedback
          .map((item) => `${item.title}. ${item.description}. Correction: ${item.improvement}.${item.drillRecommendation ? ` Drill: ${item.drillRecommendation}.` : ''}`)
          .join(' ')}`
      : '',
    safetyNotes.length ? `Safety notes: ${safetyNotes.join('. ')}.` : '',
    progressionTips.length ? `Next goals: ${progressionTips.join('. ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View>
      <GlassCard style={styles.scoreCard}>
        <View style={styles.scoreRing}>
          <Text style={styles.score}>{analysis.overallScore}</Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </View>
        <View style={styles.scoreCopy}>
          <Text style={styles.kicker}>GymGlow AI Analysis</Text>
          <Text style={styles.summary}>{analysis.summary}</Text>
          <View style={styles.speakWrap}>
            <SpeakButton text={speechText} />
          </View>
        </View>
      </GlassCard>

      {strengths.length ? (
        <GlassCard style={styles.card}>
          <SectionHeader icon="trophy" title="What looked strong" />
          <View style={styles.pillWrap}>
            {strengths.map((strength, index) => (
              <View key={`${strength}-${index}`} style={styles.strengthPill}>
                <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                <Text style={styles.strengthText}>{strength}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      ) : null}

      {analysis.technicalBreakdown ? (
        <GlassCard style={styles.card}>
          <SectionHeader icon="analytics" title="Technical breakdown" />
          <Text style={styles.bodyText}>{analysis.technicalBreakdown}</Text>
        </GlassCard>
      ) : null}

      <GlassCard style={styles.card}>
        <SectionHeader icon="chatbubbles" title="Coaching feedback" />
        {feedback.map((item, index) => {
          const color = severityColors[item.severity] ?? colors.secondary;
          return (
            <View key={item.id ?? `${item.title}-${index}`} style={styles.feedbackCard}>
              <View style={styles.feedbackHead}>
                <View style={[styles.severityDot, { backgroundColor: color }]} />
                <Text style={styles.feedbackTitle}>{item.title}</Text>
              </View>
              <Text style={styles.bodyText}>{item.description}</Text>
              <View style={styles.cueBox}>
                <Ionicons name="trending-up" size={16} color={colors.primary} />
                <Text style={styles.cueText}>{item.improvement}</Text>
              </View>
              {item.drillRecommendation ? (
                <View style={styles.drillBox}>
                  <Ionicons name="barbell" size={16} color={colors.secondary} />
                  <Text style={styles.drillText}>{item.drillRecommendation}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
        {!feedback.length ? <Text style={styles.bodyText}>No detailed feedback was saved for this analysis.</Text> : null}
      </GlassCard>

      {safetyNotes.length ? (
        <GlassCard style={styles.card}>
          <SectionHeader icon="shield-checkmark" title="Safety notes" />
          {safetyNotes.map((note, index) => (
            <Bullet key={`${note}-${index}`} text={note} color={colors.warning} />
          ))}
        </GlassCard>
      ) : null}

      {progressionTips.length ? (
        <GlassCard style={styles.card}>
          <SectionHeader icon="rocket" title="Next level goals" />
          {progressionTips.map((tip, index) => (
            <Bullet key={`${tip}-${index}`} text={tip} color={colors.primary} />
          ))}
        </GlassCard>
      ) : null}
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Bullet({ text, color }: { text: string; color: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: color }]} />
      <Text style={styles.bodyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  scoreRing: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: 'rgba(236,72,153,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { color: colors.text, fontSize: 32, fontWeight: '900' },
  scoreLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  scoreCopy: { flex: 1 },
  kicker: { color: colors.secondary, fontWeight: '900', marginBottom: 6 },
  summary: { color: colors.text, fontSize: 17, fontWeight: '800', lineHeight: 23 },
  speakWrap: { marginTop: 12 },
  card: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  strengthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  strengthText: { color: colors.text, fontWeight: '800' },
  feedbackCard: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 10 },
  feedbackHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  severityDot: { width: 10, height: 10, borderRadius: 5 },
  feedbackTitle: { color: colors.text, fontSize: 16, fontWeight: '900', flex: 1 },
  bodyText: { color: colors.textMuted, lineHeight: 21, flex: 1 },
  cueBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 16, backgroundColor: 'rgba(236,72,153,0.12)' },
  cueText: { color: colors.text, flex: 1, lineHeight: 20, fontWeight: '700' },
  drillBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 16, backgroundColor: 'rgba(34,211,238,0.1)' },
  drillText: { color: colors.text, flex: 1, lineHeight: 20 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  bulletDot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
});
