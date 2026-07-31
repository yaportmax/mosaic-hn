import { ModuleGate } from '../../src/components/ModuleUnavailable.tsx';
import { ThemeGalleryScreen } from '../../src/features/themes/ThemeGalleryScreen.tsx';
export default function ThemesRoute() { return <ModuleGate moduleId="themes"><ThemeGalleryScreen /></ModuleGate>; }
