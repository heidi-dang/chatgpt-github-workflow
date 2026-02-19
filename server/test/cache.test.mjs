import { expect } from 'chai';
import { SnapshotCache } from '../dist/cache.js';

describe('SnapshotCache', () => {
    it('should store and retrieve a snapshot for a repo', () => {
        const cache = new SnapshotCache();
        const snapshot = { repo: 'owner/repo', focused_pr: null };
        cache.set('owner/repo', undefined, snapshot);
        expect(cache.get('owner/repo')).to.deep.equal(snapshot);
    });

    it('should store and retrieve a snapshot for a repo and PR', () => {
        const cache = new SnapshotCache();
        const snapshot = { repo: 'owner/repo', focused_pr: 123 };
        cache.set('owner/repo', 123, snapshot);
        expect(cache.get('owner/repo', 123)).to.deep.equal(snapshot);
    });

    it('should distinguish between different PRs in the same repo', () => {
        const cache = new SnapshotCache();
        const snapshot1 = { repo: 'owner/repo', focused_pr: 1 };
        const snapshot2 = { repo: 'owner/repo', focused_pr: 2 };
        cache.set('owner/repo', 1, snapshot1);
        cache.set('owner/repo', 2, snapshot2);
        expect(cache.get('owner/repo', 1)).to.deep.equal(snapshot1);
        expect(cache.get('owner/repo', 2)).to.deep.equal(snapshot2);
    });

    it('should return undefined for non-existent keys', () => {
        const cache = new SnapshotCache();
        expect(cache.get('non/existent')).to.be.undefined;
    });

    it('should respect maxEntries', () => {
        const cache = new SnapshotCache(30000, 2);
        const s1 = { repo: 'r1' };
        const s2 = { repo: 'r2' };
        const s3 = { repo: 'r3' };
        cache.set('r1', undefined, s1);
        cache.set('r2', undefined, s2);
        cache.set('r3', undefined, s3);

        expect(cache.get('r1')).to.be.undefined; // Should have been evicted
        expect(cache.get('r2')).to.deep.equal(s2);
        expect(cache.get('r3')).to.deep.equal(s3);
    });

    it('should respect ttl', async () => {
        const cache = new SnapshotCache(10, 100); // 10ms TTL
        const snapshot = { repo: 'owner/repo' };
        cache.set('owner/repo', undefined, snapshot);
        expect(cache.get('owner/repo')).to.deep.equal(snapshot);

        await new Promise(resolve => setTimeout(resolve, 20));
        expect(cache.get('owner/repo')).to.be.undefined;
    });
});
