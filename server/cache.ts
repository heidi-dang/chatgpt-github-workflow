import { LRUCache } from "lru-cache";
import { Snapshot } from "./github.js";

export class SnapshotCache {
    private cache: LRUCache<string, Snapshot>;

    constructor(ttlSeconds: number = 15, maxEntries: number = 100) {
        this.cache = new LRUCache({
            max: maxEntries,
            ttl: ttlSeconds * 1000,
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
        return pr ? `${repo}#${pr}` : repo;
    }
}
