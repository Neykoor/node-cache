export type NodeCacheOptions = {
	stdTTL?: number
	checkperiod?: number
	useClones?: boolean
	deleteOnExpire?: boolean
}

export type PartialNodeCacheItem<T> = {
	key: string | number
	value: T
	ttl?: number
}

type NodeCacheEntry<T> = {
	value: T
	expiresAt: number
}

export class NodeCache<T = unknown> {
	public readonly options: Required<NodeCacheOptions>

	private readonly store = new Map<string, NodeCacheEntry<T>>()

	private intervalId: NodeJS.Timeout | number = 0

	constructor(options?: NodeCacheOptions) {
		this.options = {
			stdTTL: options?.stdTTL ?? 0,
			checkperiod: options?.checkperiod ?? 600,
			useClones: options?.useClones ?? true,
			deleteOnExpire: options?.deleteOnExpire ?? true
		}

		this.startInterval()
	}

	public set(key: string | number, value: T, ttl?: number): boolean {
		const keyValue = this.formatKey(key)
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
			return undefined
		}

		if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
			this.handleExpired(keyValue)
			return undefined
		}

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

	public del(key: string | number): number {
		const keyValue = this.formatKey(key)

		if (this.store.delete(keyValue)) {
			return 1
		}

		return 0
	}

	public flushAll(): void {
		this.store.clear()
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
