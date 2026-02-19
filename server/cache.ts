import { LRUCache } from "lru-cache";
import { Snapshot } from "./github.js";

export class SnapshotCache {
    private cache: LRUCache<string, Snapshot>;

    // ttlMs: time-to-live in milliseconds (default 30s), maxEntries: max cache size
    constructor(ttlMs: number = 30000, maxEntries: number = 100) {
        this.cache = new LRUCache({
            max: maxEntries,
            ttl: ttlMs,
        });
    }

    get(repo: string, pr?: number): Snapshot | undefined {
        const key = this.getKey(repo, pr);
        return this.cache.get(key);
    }

    set(repo: string, pr: number | undefined, snapshot: Snapshot): void {
        const key = this.getKey(repo, pr);
        this.cache.set(key, snapshot);
    }

    private getKey(repo: string, pr?: number): string {
        // repo is "owner/repo"
        return pr ? `${repo}#${pr}` : repo;
    }
}
