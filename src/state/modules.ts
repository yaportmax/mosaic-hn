import {
  DEFAULT_MODULE_CONFIGURATION,
  moveModule,
  normalizeModuleConfiguration,
  setHomeModule,
  setModuleEnabled,
  setModulePlacement
} from '../../module-sdk/configuration.ts';
import type { ModuleConfigurationV1, ModulePlacement } from '../../module-sdk/types.ts';
import type { DatabaseAdapter } from '../db/types.ts';
import { createExternalStore, type ExternalStore } from './external-store.ts';

const TABLE = 'settings';
const KEY = 'modules-v1';

export class ModuleConfigurationController implements ExternalStore<ModuleConfigurationV1> {
  private readonly db: DatabaseAdapter;
  private readonly store: ExternalStore<ModuleConfigurationV1>;

  constructor(db: DatabaseAdapter) {
    this.db = db;
    this.store = createExternalStore<ModuleConfigurationV1>(structuredClone(DEFAULT_MODULE_CONFIGURATION));
  }

  getSnapshot = (): ModuleConfigurationV1 => this.store.getSnapshot();
  subscribe = (listener: () => void): (() => void) => this.store.subscribe(listener);
  setState = (updater: ModuleConfigurationV1 | ((state: ModuleConfigurationV1) => ModuleConfigurationV1)): void => this.store.setState(updater);

  private async commit(value: unknown): Promise<ModuleConfigurationV1> {
    const next = normalizeModuleConfiguration(value);
    await this.db.set(TABLE, KEY, next);
    this.store.setState(next);
    return next;
  }

  async load(): Promise<ModuleConfigurationV1> {
    const stored = await this.db.get<unknown>(TABLE, KEY);
    const next = normalizeModuleConfiguration(stored);
    this.store.setState(next);
    return next;
  }

  async replace(value: unknown): Promise<ModuleConfigurationV1> {
    return this.commit(value);
  }

  async setEnabled(id: string, enabled: boolean): Promise<ModuleConfigurationV1> {
    return this.commit(setModuleEnabled(this.store.getSnapshot(), id, enabled));
  }

  async setPlacement(id: string, placement: ModulePlacement): Promise<ModuleConfigurationV1> {
    return this.commit(setModulePlacement(this.store.getSnapshot(), id, placement));
  }

  async move(id: string, direction: -1 | 1): Promise<ModuleConfigurationV1> {
    return this.commit(moveModule(this.store.getSnapshot(), id, direction));
  }

  async setHome(id: string): Promise<ModuleConfigurationV1> {
    return this.commit(setHomeModule(this.store.getSnapshot(), id));
  }

  async reset(): Promise<ModuleConfigurationV1> {
    return this.commit(DEFAULT_MODULE_CONFIGURATION);
  }
}
