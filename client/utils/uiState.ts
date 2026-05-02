/* src/utils/uiState.ts
  Use Rust sqlite to save the UI state
*/
import { invoke } from '@tauri-apps/api/core';

export type UiType = 'circle' | 'sidebar';

class UiStateManager {
  private activeUi: UiType = 'sidebar';
  private listeners: Set<(ui: UiType) => void> = new Set();

  constructor() {
    this.load();
  }

  async load() {
    try {
      this.activeUi = await invoke<UiType>('get_active_ui');
      this.notify();
    } catch (error) {
      console.error('加载 UI 状态失败:', error);
    }
  }

  getActiveUi(): UiType {
    return this.activeUi;
  }

  async toggleSidebar() {
    const newUi = this.activeUi === 'circle' ? 'sidebar' : 'circle';
    await this.setActiveUi(newUi);
  }

  async setActiveUi(ui: UiType) {
    this.activeUi = ui;
    await invoke('set_active_ui', { activeUi: ui });
    this.notify();
  }

  subscribe(listener: (ui: UiType) => void): () => void {
    this.listeners.add(listener);
    listener(this.activeUi);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.activeUi));
  }
}

export const uiState = new UiStateManager();
