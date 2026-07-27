import { FieldValue } from 'firebase-admin/firestore';

// Minimal in-memory Firestore fake covering exactly what FirestoreBoardAdapter and
// FirestoreParticipantAdapter use (get/set/update, subcollections, simple where/limit/
// orderBy, and the two FieldValue sentinels these adapters write). Not a general-purpose
// Firestore emulator replacement — just enough to unit-test these adapters' own logic
// (data mapping, idempotency) without a live Firestore connection.

type DocData = Record<string, unknown>;

function resolveFieldValues(input: DocData, existing: DocData = {}): DocData {
    const resolved: DocData = { ...input };
    const deletedKeys: string[] = [];
    for (const [key, value] of Object.entries(input)) {
        if (!(value instanceof FieldValue)) continue;
        const kind = Object.getPrototypeOf(value).constructor.name as string;
        if (kind === 'ServerTimestampTransform') {
            resolved[key] = new Date();
        } else if (kind === 'NumericIncrementTransform') {
            const operand = (value as unknown as { operand: number }).operand;
            resolved[key] = ((existing[key] as number) ?? 0) + operand;
        } else if (kind === 'DeleteTransform') {
            delete resolved[key];
            deletedKeys.push(key);
        }
    }
    // Merge onto `existing` here (rather than leaving it to the caller) so a deleted key
    // is actually removed from the merged document, not merely absent from this fragment
    // (a shallow {...existing, ...resolved} spread would otherwise let the old value survive).
    const merged = { ...existing, ...resolved };
    for (const key of deletedKeys) delete merged[key];
    return merged;
}

class FakeQuerySnapshot {
    constructor(public docs: FakeQueryDocumentSnapshot[]) {}
    get empty(): boolean {
        return this.docs.length === 0;
    }
}

class FakeQueryDocumentSnapshot {
    constructor(
        public id: string,
        private readonly getData: () => DocData,
        public readonly ref: FakeDocRef,
    ) {}
    data(): DocData {
        return this.getData();
    }
}

type FakeQueryDoc = { id: string; getData: () => DocData; ref: FakeDocRef };

class FakeQuery {
    constructor(private readonly docs: FakeQueryDoc[]) {}

    where(field: string, op: '==', value: unknown): FakeQuery {
        if (op !== '==') throw new Error(`fakeFirestore only supports '==' (got ${op})`);
        return new FakeQuery(this.docs.filter((d) => d.getData()[field] === value));
    }

    limit(n: number): FakeQuery {
        return new FakeQuery(this.docs.slice(0, n));
    }

    orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): FakeQuery {
        const sorted = [...this.docs].sort((a, b) => {
            const av = a.getData()[field] as number;
            const bv = b.getData()[field] as number;
            return direction === 'asc' ? av - bv : bv - av;
        });
        return new FakeQuery(sorted);
    }

    async get(): Promise<FakeQuerySnapshot> {
        return new FakeQuerySnapshot(this.docs.map((d) => new FakeQueryDocumentSnapshot(d.id, d.getData, d.ref)));
    }
}

class FakeDocRef {
    constructor(
        private readonly store: Map<string, DocData>,
        public readonly id: string,
        private readonly subcollectionsOf: (id: string) => Map<string, FakeCollectionRef>,
    ) {}

    async get(): Promise<{ exists: boolean; id: string; data: () => DocData | undefined }> {
        const data = this.store.get(this.id);
        return { exists: data !== undefined, id: this.id, data: () => data };
    }

    async set(input: DocData): Promise<void> {
        this.store.set(this.id, resolveFieldValues(input));
    }

    async update(input: DocData): Promise<void> {
        const existing = this.store.get(this.id) ?? {};
        this.store.set(this.id, resolveFieldValues(input, existing));
    }

    async delete(): Promise<void> {
        this.store.delete(this.id);
    }

    collection(name: string): FakeCollectionRef {
        const subs = this.subcollectionsOf(this.id);
        if (!subs.has(name)) subs.set(name, new FakeCollectionRef());
        return subs.get(name)!;
    }
}

export class FakeCollectionRef {
    private readonly store = new Map<string, DocData>();
    private readonly subcollections = new Map<string, Map<string, FakeCollectionRef>>();
    private counter = 0;

    doc(id?: string): FakeDocRef {
        const docId = id ?? `auto-${++this.counter}`;
        return new FakeDocRef(this.store, docId, (ownerId) => {
            if (!this.subcollections.has(ownerId)) this.subcollections.set(ownerId, new Map());
            return this.subcollections.get(ownerId)!;
        });
    }

    where(field: string, op: '==', value: unknown): FakeQuery {
        return this.toQuery().where(field, op, value);
    }

    orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): FakeQuery {
        return this.toQuery().orderBy(field, direction);
    }

    private toQuery(): FakeQuery {
        return new FakeQuery([...this.store.entries()].map(([id, _data]) => ({ id, getData: () => this.store.get(id)!, ref: this.doc(id) })));
    }

    async get(): Promise<FakeQuerySnapshot> {
        return this.toQuery().get();
    }
}

type BatchOp = { kind: 'set' | 'update' | 'delete'; ref: FakeDocRef; data?: DocData };

class FakeWriteBatch {
    private readonly ops: BatchOp[] = [];

    set(ref: FakeDocRef, data: DocData): this {
        this.ops.push({ kind: 'set', ref, data });
        return this;
    }

    update(ref: FakeDocRef, data: DocData): this {
        this.ops.push({ kind: 'update', ref, data });
        return this;
    }

    delete(ref: FakeDocRef): this {
        this.ops.push({ kind: 'delete', ref });
        return this;
    }

    async commit(): Promise<void> {
        for (const op of this.ops) {
            if (op.kind === 'set') await op.ref.set(op.data!);
            else if (op.kind === 'update') await op.ref.update(op.data!);
            else await op.ref.delete();
        }
    }
}

class FakeTransaction {
    async get(ref: FakeDocRef): ReturnType<FakeDocRef['get']> {
        return ref.get();
    }
    update(ref: FakeDocRef, data: DocData): this {
        void ref.update(data);
        return this;
    }
}

export class FakeFirestore {
    private readonly collections = new Map<string, FakeCollectionRef>();

    collection(name: string): FakeCollectionRef {
        if (!this.collections.has(name)) this.collections.set(name, new FakeCollectionRef());
        return this.collections.get(name)!;
    }

    batch(): FakeWriteBatch {
        return new FakeWriteBatch();
    }

    async runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T> {
        return fn(new FakeTransaction());
    }
}
