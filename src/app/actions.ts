import { Linking, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import type { Story } from '../core/models.ts';
import { hnItemUrl } from '../core/format.ts';
import type { ReaderRepository } from '../db/reader-repository.ts';
import type { AppPreferences, GestureAction } from '../state/preferences.ts';

export async function subtleHaptic(preferences: AppPreferences, suppress = false): Promise<void> {
  if (suppress || !preferences.hapticsEnabled || preferences.reduceMotion === 'on') return;
  try { await Haptics.selectionAsync(); } catch { /* Haptics are non-critical. */ }
}

export async function openUrl(url: string, mode: AppPreferences['openLinks'] = 'system'): Promise<void> {
  if (!/^https?:\/\//i.test(url)) return;
  if (mode === 'in-app') {
    await WebBrowser.openBrowserAsync(url, { showTitle: true, enableBarCollapsing: true });
    return;
  }
  await Linking.openURL(url);
}

export async function openStory(story: Story, preferences: AppPreferences): Promise<void> {
  await openUrl(story.url ?? hnItemUrl(story.id), preferences.openLinks);
}

export async function shareStory(story: Story): Promise<void> {
  await Share.share({ title: story.title, message: `${story.title}\n${story.url ?? hnItemUrl(story.id)}`, url: story.url ?? hnItemUrl(story.id) });
}

export async function performStoryAction(action: GestureAction, story: Story, repository: ReaderRepository, preferences: AppPreferences, suppressHaptics = false): Promise<void> {
  switch (action) {
    case 'open': await openStory(story, preferences); break;
    case 'save': await repository.setBookmark(story.id, true); break;
    case 'queue': await repository.setQueue(story.id, true); break;
    case 'share': await shareStory(story); break;
    case 'hide': await repository.setHidden(story.id, true); break;
    case 'none': return;
  }
  await subtleHaptic(preferences, suppressHaptics);
}
