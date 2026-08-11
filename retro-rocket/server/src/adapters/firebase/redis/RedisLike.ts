/**
 * The narrow slice of `ioredis`'s API this feature's coordination protocol depends on
 * (contracts/redis-coordination-protocol.md). Defined as our own interface — rather
 * than depending on `ioredis`'s full `Redis` type directly — so a lightweight in-memory
 * fake can implement it exactly for unit tests (server/test/adapters/firebase/redis/),
 * matching this codebase's Interface Segregation convention (Constitution Principle
 * IV). A real `ioredis.Redis` instance satisfies this interface structurally, with no
 * adapter needed.
 */
export interface RedisLike {
    set(key: string, value: string, mode: 'NX', ttlFlag: 'PX', ttlMs: number): Promise<'OK' | null>;
    eval(script: string, numKeys: number, ...args: Array<string | number>): Promise<unknown>;
    publish(channel: string, message: string): Promise<number>;
    subscribe(channel: string): Promise<unknown>;
    unsubscribe(channel: string): Promise<unknown>;
    on(event: 'message', listener: (channel: string, message: string) => void): void;
}
