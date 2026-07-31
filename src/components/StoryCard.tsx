import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { FeedViewItem } from '../core/feed-pipeline.ts';
import { formatNumber, formatRelativeTime, storyTypeLabel } from '../core/format.ts';
import { gestureActionAppearance, resolveGestureActionForModules, swipeRevealActions, type GestureActionTone } from '../core/gesture-actions.ts';
import { useThemeRuntime } from '../design/ThemeProvider.tsx';
import { useModuleEnabled, usePreferences } from '../app/AppServices.tsx';
import type { GestureAction } from '../state/preferences.ts';
import { Surface } from './Surface.tsx';
import { ThemedText } from './ThemedText.tsx';

interface StoryCardProps {
  item: FeedViewItem;
  index: number;
  onOpenStory(id: number): void;
  onAction(id: number, action: GestureAction): void;
  bookmarked?: boolean;
  queued?: boolean;
}

function StoryCardComponent({ item, index, onOpenStory, onAction, bookmarked = false, queued = false }: StoryCardProps) {
  const { theme } = useThemeRuntime();
  const preferences = usePreferences();
  const algorithmsEnabled = useModuleEnabled('algorithms');
  const automationEnabled = useModuleEnabled('automation');
  const libraryEnabled = useModuleEnabled('library');
  const translateX = useSharedValue(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressConsumed = useRef(false);
  const layout = theme.layout.feed;
  const story = item.story;
  const label = storyTypeLabel(story);
  const metadataLayout = theme.layout.metadata;

  useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (longPressResetTimer.current) clearTimeout(longPressResetTimer.current);
  }, []);

  const invoke = useCallback((action: GestureAction) => {
    const resolved = resolveGestureActionForModules(action, { library: libraryEnabled, automation: automationEnabled });
    if (resolved !== 'none') onAction(story.id, resolved);
  }, [automationEnabled, libraryEnabled, onAction, story.id]);

  const handlePress = useCallback(() => {
    if (longPressConsumed.current) {
      longPressConsumed.current = false;
      return;
    }
    const doubleTapAction = preferences.gestures.doubleTap;
    if (doubleTapAction === 'none') {
      onOpenStory(story.id);
      return;
    }
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      invoke(doubleTapAction);
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      onOpenStory(story.id);
    }, 220);
  }, [invoke, onOpenStory, preferences.gestures.doubleTap, story.id]);

  const handleLongPress = useCallback(() => {
    const action = preferences.gestures.longPress;
    if (action === 'none') return;
    longPressConsumed.current = true;
    if (longPressResetTimer.current) clearTimeout(longPressResetTimer.current);
    longPressResetTimer.current = setTimeout(() => { longPressConsumed.current = false; }, 650);
    invoke(action);
  }, [invoke, preferences.gestures.longPress]);

  const pan = useMemo(() => Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-14, 14])
    .onUpdate((event) => { translateX.value = Math.max(-110, Math.min(110, event.translationX)); })
    .onEnd((event) => {
      if (event.translationX < -72) runOnJS(invoke)(preferences.gestures.swipeLeft);
      else if (event.translationX > 72) runOnJS(invoke)(preferences.gestures.swipeRight);
      translateX.value = withSpring(0, { damping: theme.tokens.motion.springDamping });
    }), [invoke, preferences.gestures.swipeLeft, preferences.gestures.swipeRight, theme.tokens.motion.springDamping, translateX]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  const configuredReveals = swipeRevealActions(preferences.gestures);
  const revealed = {
    left: resolveGestureActionForModules(configuredReveals.left, { library: libraryEnabled, automation: automationEnabled }),
    right: resolveGestureActionForModules(configuredReveals.right, { library: libraryEnabled, automation: automationEnabled })
  };
  const leftAppearance = gestureActionAppearance(revealed.left);
  const rightAppearance = gestureActionAppearance(revealed.right);
  const toneColor = (tone: GestureActionTone): string => {
    switch (tone) {
      case 'success': return theme.tokens.colors.success;
      case 'warning': return theme.tokens.colors.warning;
      case 'danger': return theme.tokens.colors.danger;
      case 'muted': return theme.tokens.colors.mutedText;
      case 'accent': return theme.tokens.colors.accent;
    }
  };

  const metadata = <View style={[
    styles.meta,
    layout === 'compact' && { marginTop: 2 },
    metadataLayout === 'stacked' && styles.metaStacked,
    metadataLayout === 'footer' && styles.metaFooter,
    metadataLayout === 'footer' && { borderTopColor: theme.tokens.colors.border }
  ]}>
    {story.domain ? <ThemedText variant="caption" muted numberOfLines={1} style={[styles.domain, metadataLayout === 'stacked' && styles.stackedDomain]}>{story.domain}</ThemedText> : null}
    <ThemedText variant="caption" muted>{formatNumber(story.score, preferences.compactNumbers)} pts</ThemedText>
    <ThemedText variant="caption" muted>{formatNumber(story.descendants, preferences.compactNumbers)} comments</ThemedText>
    <ThemedText variant="caption" muted>{formatRelativeTime(story.time)}</ThemedText>
    <ThemedText variant="caption" muted>by {story.by}</ThemedText>
  </View>;

  const body = <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${story.title}, ${story.score} points, ${story.descendants} comments, by ${story.by}`}
    accessibilityHint="Opens the story discussion"
    accessibilityActions={libraryEnabled ? [{ name: 'activate', label: 'Open' }, { name: 'magicTap', label: 'Save' }] : [{ name: 'activate', label: 'Open' }]}
    onAccessibilityAction={(event) => event.nativeEvent.actionName === 'magicTap' && libraryEnabled ? invoke('save') : onOpenStory(story.id)}
    onPress={handlePress}
    onLongPress={handleLongPress}
    delayLongPress={380}
    style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.68 : 1 }, layout === 'compact' && { paddingVertical: 8, paddingHorizontal: 14 }, layout === 'comfortable' && { paddingVertical: 12, paddingHorizontal: 16 }, (layout === 'cards' || layout === 'magazine') && { padding: layout === 'magazine' ? 20 : 16 }]}
  >
    <View style={styles.topline}>
      {layout === 'magazine' ? <ThemedText variant="display" muted style={styles.rank}>{String(index + 1).padStart(2, '0')}</ThemedText> : null}
      <View style={styles.copy}>
        <View style={styles.titleLine}>
          {label ? <View style={[styles.badge, { backgroundColor: `${theme.tokens.colors.accent}1F` }]}><ThemedText variant="caption" accent style={{ fontWeight: '800' }}>{label}</ThemedText></View> : null}
          <ThemedText variant={layout === 'magazine' ? 'title' : layout === 'compact' ? 'meta' : 'headline'} numberOfLines={layout === 'compact' ? 1 : layout === 'magazine' ? 4 : 3} style={styles.title}>{story.title}</ThemedText>
        </View>
        {metadataLayout === 'footer' ? null : metadata}
        {algorithmsEnabled && preferences.showRankingExplanations && item.explanationText ? <ThemedText variant="caption" accent numberOfLines={2} style={{ marginTop: 7 }}>{item.explanationText}</ThemedText> : null}
      </View>
      <View style={styles.indicators}>
        {libraryEnabled && bookmarked ? <Ionicons name="bookmark" size={15} color={theme.tokens.colors.accent} /> : null}
        {libraryEnabled && queued ? <Ionicons name="time" size={15} color={theme.tokens.colors.accent} /> : null}
        {layout !== 'compact' ? <Ionicons name="chevron-forward" size={18} color={theme.tokens.colors.mutedText} /> : null}
      </View>
    </View>
    {metadataLayout === 'footer' ? metadata : null}
  </Pressable>;

  return <View style={[styles.wrapper, { backgroundColor: theme.tokens.colors.background }]}>
    <View pointerEvents="none" style={styles.actions}>
      <View style={[styles.actionSide, { backgroundColor: toneColor(leftAppearance.tone) }]} accessibilityLabel={leftAppearance.label}><Ionicons name={leftAppearance.icon as never} color="#FFFFFF" size={23} /></View>
      <View style={[styles.actionSide, { backgroundColor: toneColor(rightAppearance.tone) }]} accessibilityLabel={rightAppearance.label}><Ionicons name={rightAppearance.icon as never} color="#FFFFFF" size={23} /></View>
    </View>
    <GestureDetector gesture={pan}><Animated.View style={[animatedStyle, { backgroundColor: theme.tokens.colors.background }]}>{layout === 'cards' || layout === 'magazine' ? <Surface elevated>{body}</Surface> : body}</Animated.View></GestureDetector>
  </View>;
}

export const StoryCard = memo(StoryCardComponent, (previous, next) =>
  previous.item.story === next.item.story
  && previous.item.rankScore === next.item.rankScore
  && previous.item.explanationText === next.item.explanationText
  && previous.index === next.index
  && previous.bookmarked === next.bookmarked
  && previous.queued === next.queued
  && previous.onOpenStory === next.onOpenStory
  && previous.onAction === next.onAction
);

const styles = StyleSheet.create({
  wrapper: { overflow: 'hidden' }, actions: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'space-between' }, actionSide: { width: 110, alignItems: 'center', justifyContent: 'center' }, pressable: { minHeight: 50 }, topline: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, copy: { flex: 1, minWidth: 0 }, titleLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 }, title: { flex: 1 }, meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 8 }, metaStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 3 }, metaFooter: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth }, domain: { maxWidth: 170 }, stackedDomain: { maxWidth: '100%', fontWeight: '700' }, badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 1 }, rank: { width: 46, opacity: 0.32 }, indicators: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 2 }
});
