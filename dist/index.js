"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeCache = void 0;
class NodeCache {
    options;
    store = new Map();
    intervalId = 0;
    constructor(options) {
        this.options = {
            stdTTL: options?.stdTTL ?? 0,
            checkperiod: options?.checkperiod ?? 600,
            useClones: options?.useClones ?? true,
            deleteOnExpire: options?.deleteOnExpire ?? true
        };
        this.startInterval();
    }
    set(key, value, ttl) {
        const keyValue = this.formatKey(key);
        const resolvedTtl = ttl === undefined ? this.options.stdTTL : ttl;
        this.store.set(keyValue, {
            value,
            expiresAt: this.resolveExpiration(resolvedTtl)
        });
        return true;
    }
    mset(data) {
        for (const item of data) {
            this.set(item.key, item.value, item.ttl);
        }
        return true;
    }
    get(key) {
        const keyValue = this.formatKey(key);
        const entry = this.store.get(keyValue);
        if (!entry) {
            return undefined;
        }
        if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
            this.handleExpired(keyValue);
            return undefined;
        }
        return (this.options.useClones ? this.clone(entry.value) : entry.value);
    }
    mget(keys) {
        const result = Object.create(null);
        for (const key of keys) {
            const value = this.get(key);
            if (value !== undefined) {
                result[this.formatKey(key)] = value;
            }
        }
        return result;
    }
    has(key) {
        const keyValue = this.formatKey(key);
        const entry = this.store.get(keyValue);
        if (!entry) {
            return false;
        }
        if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
            this.handleExpired(keyValue);
            return false;
        }
        return true;
    }
    del(key) {
        const keyValue = this.formatKey(key);
        if (this.store.delete(keyValue)) {
            return 1;
        }
        return 0;
    }
    flushAll() {
        this.store.clear();
    }
    close() {
        this.stopInterval();
    }
    formatKey(key) {
        return key.toString();
    }
    clone(value) {
        if (value === null || value === undefined || typeof value !== 'object') {
            return value;
        }
        if (typeof structuredClone !== 'function') {
            return value;
        }
        try {
            return structuredClone(value);
        }
        catch {
            return value;
        }
    }
    resolveExpiration(ttl) {
        if (ttl === undefined || Number.isNaN(ttl) || ttl === 0) {
            return 0;
        }
        if (ttl < 0) {
            return 1;
        }
        return Date.now() + ttl * 1000;
    }
    startInterval() {
        if (this.options.checkperiod > 0) {
            this.intervalId = setInterval(() => {
                this.checkData();
            }, this.options.checkperiod * 1000).unref();
            return;
        }
        this.intervalId = 0;
    }
    stopInterval() {
        if (this.intervalId !== 0) {
            clearInterval(this.intervalId);
            this.intervalId = 0;
        }
    }
    checkData() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (entry.expiresAt > 0 && entry.expiresAt < now) {
                this.handleExpired(key);
            }
        }
    }
    handleExpired(key) {
        if (this.options.deleteOnExpire) {
            this.store.delete(key);
        }
    }
}
exports.NodeCache = NodeCache;
exports.default = NodeCache;
