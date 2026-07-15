export type NodeCacheOptions = {
    stdTTL?: number;
    checkperiod?: number;
    useClones?: boolean;
    deleteOnExpire?: boolean;
};
export type PartialNodeCacheItem<T> = {
    key: string | number;
    value: T;
    ttl?: number;
};
export declare class NodeCache<T = unknown> {
    readonly options: Required<NodeCacheOptions>;
    private readonly store;
    private intervalId;
    constructor(options?: NodeCacheOptions);
    set(key: string | number, value: T, ttl?: number): boolean;
    mset(data: Array<PartialNodeCacheItem<T>>): boolean;
    get<V = T>(key: string | number): V | undefined;
    mget<V = T>(keys: Array<string | number>): Record<string, V | undefined>;
    has(key: string | number): boolean;
    del(key: string | number): number;
    flushAll(): void;
    close(): void;
    private formatKey;
    private clone;
    private resolveExpiration;
    private startInterval;
    private stopInterval;
    private checkData;
    private handleExpired;
}
export default NodeCache;
