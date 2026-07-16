export type NodeCacheOptions = {
	stdTTL?: number
	checkperiod?: number
	useClones?: boolean
	deleteOnExpire?: boolean
	maxKeys?: number
}

export type PartialNodeCacheItem<T> = {
	key: string | number
	value: T
	ttl?: number
}

export type NodeCacheStats = {
	hits: number
	misses: number
	keys: number
	ksize: number
	vsize: number
}

type NodeCacheEntry<T> = {
	value: T
	expiresAt: number
}

export class NodeCache<T = unknown> {
	public readonly options: Required<NodeCacheOptions>

	private readonly store = new Map<string, NodeCacheEntry<T>>()

	private readonly stats = { hits: 0, misses: 0 }

	private intervalId: NodeJS.Timeout | number = 0

	constructor(options?: NodeCacheOptions) {
		this.options = {
			stdTTL: options?.stdTTL ?? 0,
			checkperiod: options?.checkperiod ?? 600,
			useClones: options?.useClones ?? true,
			deleteOnExpire: options?.deleteOnExpire ?? true,
			maxKeys: options?.maxKeys ?? -1
		}

		this.startInterval()
	}

	public set(key: string | number, value: T, ttl?: number): boolean {
		const keyValue = this.formatKey(key)

		if (this.options.maxKeys > -1 && !this.store.has(keyValue) && this.store.size >= this.options.maxKeys) {
			throw new Error('Cache max keys amount exceeded')
		}

		const resolvedTtl = ttl === undefined ? this.options.stdTTL : ttl

		this.store.set(keyValue, {
			value,
			expiresAt: this.resolveExpiration(resolvedTtl)
		})

		return true
	}

	public mset(data: Array<PartialNodeCacheItem<T>>): boolean {
		for (const item of data) {
			this.set(item.key, item.value, item.ttl)
		}

		return true
	}

	public get<V = T>(key: string | number): V | undefined {
		const keyValue = this.formatKey(key)
		const entry = this.store.get(keyValue)

		if (!entry) {
			this.stats.misses++
			return undefined
		}

		if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
			this.handleExpired(keyValue)
			this.stats.misses++
			return undefined
		}

		this.stats.hits++
		return (this.options.useClones ? this.clone(entry.value) : entry.value) as unknown as V
	}

	public mget<V = T>(keys: Array<string | number>): Record<string, V | undefined> {
		const result: Record<string, V | undefined> = Object.create(null)

		for (const key of keys) {
			const value = this.get<V>(key)
			if (value !== undefined) {
				result[this.formatKey(key)] = value
			}
		}

		return result
	}

	public fetch<V = T>(key: string | number, ttlOrValue: number | V | (() => V), maybeValue?: V | (() => V)): V {
		let ttl: number | undefined
		let raw: V | (() => V)

		if (typeof ttlOrValue === 'number' && maybeValue !== undefined) {
			ttl = ttlOrValue
			raw = maybeValue
		} else {
			raw = ttlOrValue as V | (() => V)
		}

		const cached = this.get<V>(key)
		if (cached !== undefined) {
			return cached
		}

		const value = typeof raw === 'function' ? (raw as () => V)() : raw
		this.set(key, value as unknown as T, ttl)
		return value
	}

	public has(key: string | number): boolean {
		const keyValue = this.formatKey(key)
		const entry = this.store.get(keyValue)

		if (!entry) {
			return false
		}

		if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
			this.handleExpired(keyValue)
			return false
		}

		return true
	}

	public keys(): string[] {
		const now = Date.now()
		const result: string[] = []

		for (const [key, entry] of this.store.entries()) {
			if (entry.expiresAt > 0 && entry.expiresAt < now) continue
			result.push(key)
		}

		return result
	}

	public ttl(key: string | number, ttl?: number): boolean {
		const keyValue = this.formatKey(key)
		const entry = this.store.get(keyValue)

		if (!entry) {
			return false
		}

		if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
			this.handleExpired(keyValue)
			return false
		}

		if (ttl === undefined || ttl === 0) {
			this.store.delete(keyValue)
			return true
		}

		entry.expiresAt = this.resolveExpiration(ttl)
		return true
	}

	public getTtl(key: string | number): number | undefined {
		const keyValue = this.formatKey(key)
		const entry = this.store.get(keyValue)

		if (!entry) {
			return undefined
		}

		if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
			this.handleExpired(keyValue)
			return undefined
		}

		return entry.expiresAt
	}

	public take<V = T>(key: string | number): V | undefined {
		const value = this.get<V>(key)

		if (value !== undefined) {
			this.del(key)
		}

		return value
	}

	public del(keys: string | number | Array<string | number>): number {
		const list = Array.isArray(keys) ? keys : [keys]
		let deleted = 0

		for (const key of list) {
			if (this.store.delete(this.formatKey(key))) {
				deleted++
			}
		}

		return deleted
	}

	public getStats(): NodeCacheStats {
		const now = Date.now()
		let keysCount = 0
		let ksize = 0
		let vsize = 0

		for (const [key, entry] of this.store.entries()) {
			if (entry.expiresAt > 0 && entry.expiresAt < now) continue
			keysCount++
			ksize += key.length
			vsize += this.estimateSize(entry.value)
		}

		return {
			hits: this.stats.hits,
			misses: this.stats.misses,
			keys: keysCount,
			ksize,
			vsize
		}
	}

	public flushStats(): void {
		this.stats.hits = 0
		this.stats.misses = 0
	}

	public flushAll(): void {
		this.store.clear()
		this.stats.hits = 0
		this.stats.misses = 0
	}

	public close(): void {
		this.stopInterval()
	}

	private formatKey(key: string | number): string {
		return key.toString()
	}

	private clone(value: T): T {
		if (value === null || value === undefined || typeof value !== 'object') {
			return value
		}

		if (typeof structuredClone !== 'function') {
			return value
		}

		try {
			return structuredClone(value)
		} catch {
			return value
		}
	}

	private estimateSize(value: unknown): number {
		if (value === null || value === undefined) {
			return 0
		}

		switch (typeof value) {
			case 'string':
				return value.length
			case 'number':
			case 'bigint':
				return 8
			case 'boolean':
				return 4
			case 'function':
				return 0
			case 'object':
				try {
					return JSON.stringify(value)?.length ?? 0
				} catch {
					return 0
				}
			default:
				return 0
		}
	}

	private resolveExpiration(ttl: number): number {
		if (ttl === undefined || Number.isNaN(ttl) || ttl === 0) {
			return 0
		}

		if (ttl < 0) {
			return 1
		}

		return Date.now() + ttl * 1000
	}

	private startInterval(): void {
		if (this.options.checkperiod > 0) {
			this.intervalId = setInterval(() => {
				this.checkData()
			}, this.options.checkperiod * 1000).unref()
			return
		}

		this.intervalId = 0
	}

	private stopInterval(): void {
		if (this.intervalId !== 0) {
			clearInterval(this.intervalId as NodeJS.Timeout)
			this.intervalId = 0
		}
	}

	private checkData(): void {
		const now = Date.now()

		for (const [key, entry] of this.store.entries()) {
			if (entry.expiresAt > 0 && entry.expiresAt < now) {
				this.handleExpired(key)
			}
		}
	}

	private handleExpired(key: string): void {
		if (this.options.deleteOnExpire) {
			this.store.delete(key)
		}
	}
}

export default NodeCache
				
