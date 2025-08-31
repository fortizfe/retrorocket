type Subscriber = (value: boolean) => void;

const STORAGE_KEY = 'rr_show_action_column';

class UIPreferencesStore {
    private showActionColumn: boolean;
    private readonly subscribers: Set<Subscriber> = new Set();

    constructor() {
        this.showActionColumn = true;
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            this.showActionColumn = raw === null ? true : raw === '1';
        } catch {
            this.showActionColumn = true;
        }
    }

    getShowActionColumn() {
        return this.showActionColumn;
    }

    setShowActionColumn(next: boolean) {
        if (this.showActionColumn === next) return;
        this.showActionColumn = next;
        try {
            window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
        } catch {
            // ignore
        }
        this.subscribers.forEach(s => s(next));
    }

    subscribe(cb: Subscriber) {
        this.subscribers.add(cb);
        return () => { this.subscribers.delete(cb); };
    }
}

const uiPreferencesStore = new UIPreferencesStore();

export default uiPreferencesStore;
