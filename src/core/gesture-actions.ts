import type { GestureAction } from '../state/preferences.ts';

export type GestureActionTone = 'accent' | 'success' | 'warning' | 'danger' | 'muted';

export interface GestureActionAppearance {
  icon: string;
  label: string;
  tone: GestureActionTone;
}

const APPEARANCES: Record<GestureAction, GestureActionAppearance> = Object.freeze({
  none: { icon: 'remove-outline', label: 'No action', tone: 'muted' },
  open: { icon: 'open-outline', label: 'Open', tone: 'accent' },
  save: { icon: 'bookmark', label: 'Save', tone: 'success' },
  queue: { icon: 'time', label: 'Read later', tone: 'warning' },
  share: { icon: 'share-social', label: 'Share', tone: 'accent' },
  hide: { icon: 'eye-off', label: 'Hide', tone: 'danger' }
});

export function gestureActionAppearance(action: GestureAction): GestureActionAppearance {
  return APPEARANCES[action];
}

export function swipeRevealActions(gestures: Pick<{ swipeLeft: GestureAction; swipeRight: GestureAction }, 'swipeLeft' | 'swipeRight'>): { left: GestureAction; right: GestureAction } {
  return { left: gestures.swipeRight, right: gestures.swipeLeft };
}


export interface GestureModuleAvailability {
  library: boolean;
  automation: boolean;
}

export function resolveGestureActionForModules(action: GestureAction, modules: GestureModuleAvailability): GestureAction {
  if ((action === 'save' || action === 'queue') && !modules.library) return 'none';
  if (action === 'hide' && !modules.automation) return 'none';
  return action;
}
