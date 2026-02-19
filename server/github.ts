import { graphql } from "@octokit/graphql";

export interface PRCard {
    pr: number;
    title: string;
    head: string;
    base: string;
    ci_state: "success" | "failure" | "running" | "unknown";
    short_sha: string;
    updated_rel: string;
    pr_url: string;
}

export interface CommitRow {
    sha: string;
    short_sha: string;
    title: string;
    author: string;
    time_rel: string;
    ci_state: "success" | "failure" | "running" | "unknown";
    commit_url: string;
}

export interface ChecksRollup {
    passed: number;
    failed: number;
    running: number;
    top_failing: { name: string; url: string }[];
    pr_url: string;
}

export interface Snapshot {
    repo: string;
    focused_pr: number | null;
    board_groups: {
        open: PRCard[];
        in_review: PRCard[];
        changes_req: PRCard[];
        ci_failing: PRCard[];
        mergeable: PRCard[];
    };
    commits: {
        count: number;
        items: CommitRow[];
    };
    checks_rollup: ChecksRollup;
    last_updated_iso: string;
}

export class GitHubClient {
    private gql: typeof graphql;

    constructor(token: string) {
        this.gql = graphql.defaults({
            headers: {
                authorization: `token ${token}`,
            },
        });
    }

    async fetchSnapshot(owner: string, name: string, prNumber?: number): Promise<Snapshot> {
        const query = `
      query($owner: String!, $name: String!, $prNumber: Int, $hasPr: Boolean!) {
        repository(owner: $owner, name: $name) {
          pullRequests(states: OPEN, first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
            nodes {
              number
              title
              url
              headRefName
              baseRefName
              updatedAt
              mergeable
              reviewDecision
              commits(last: 1) {
                nodes {
                  commit {
                    oid
                    statusCheckRollup {
                      state
                    }
                  }
                }
              }
            }
          }
          pullRequest(number: $prNumber) @include(if: $hasPr) {
            number
            title
            url
            headRefName
            baseRefName
            updatedAt
            mergeable
            reviewDecision
            commits(last: 50) {
              nodes {
                commit {
                  oid
                  messageHeadline
                  committedDate
                  author {
                    name
                    user {
                      login
                    }
                  }
                  statusCheckRollup {
                    state
                    contexts(first: 50) {
                      nodes {
                        ... on CheckRun {
                          name
                          conclusion
                          status
                          detailsUrl
                        }
                        ... on StatusContext {
                          context
                          state
                          targetUrl
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

        const data: any = await this.gql(query, {
            owner,
            name,
            prNumber: prNumber || 0,
            hasPr: !!prNumber,
        });

        const repo = data.repository;
        const allPrs = repo.pullRequests.nodes;
        const focusedPr = repo.pullRequest;

        const board_groups = {
            open: [] as PRCard[],
            in_review: [] as PRCard[],
            changes_req: [] as PRCard[],
            ci_failing: [] as PRCard[],
            mergeable: [] as PRCard[],
        };

        allPrs.forEach((pr: any) => {
            const card = this.mapToPRCard(pr, owner, name);
            const decision = pr.reviewDecision;
            const ciState = card.ci_state;
            const isMergeable = pr.mergeable === "MERGEABLE";

            if (ciState === "failure") {
                board_groups.ci_failing.push(card);
            } else if (isMergeable && ciState === "success" && decision !== "CHANGES_REQUESTED") {
                board_groups.mergeable.push(card);
            } else if (decision === "CHANGES_REQUESTED") {
                board_groups.changes_req.push(card);
            } else if (decision === "REVIEW_REQUIRED") {
                board_groups.in_review.push(card);
            } else {
                board_groups.open.push(card);
            }
        });

        const commits = focusedPr
            ? {
                count: focusedPr.commits.nodes.length,
                items: focusedPr.commits.nodes.map((n: any) => this.mapToCommitRow(n.commit, owner, name)).reverse()
            }
            : { count: 0, items: [] };

        const checks_rollup = focusedPr
            ? this.mapToChecksRollup(focusedPr, owner, name)
            : { passed: 0, failed: 0, running: 0, top_failing: [], pr_url: "" };

        return {
            repo: `${owner}/${name}`,
            focused_pr: prNumber || null,
            board_groups,
            commits,
            checks_rollup,
            last_updated_iso: new Date().toISOString(),
        };
    }

    private mapToPRCard(pr: any, owner: string, name: string): PRCard {
        const headCommit = pr.commits.nodes[0]?.commit;
        return {
            pr: pr.number,
            title: pr.title,
            head: pr.headRefName,
            base: pr.baseRefName,
            ci_state: this.mapCiState(headCommit?.statusCheckRollup?.state),
            short_sha: headCommit?.oid?.substring(0, 7) || "",
            updated_rel: this.timeAgo(pr.updatedAt),
            pr_url: pr.url,
        };
    }

    private mapToCommitRow(commit: any, owner: string, name: string): CommitRow {
        return {
            sha: commit.oid,
            short_sha: commit.oid.substring(0, 7),
            title: commit.messageHeadline,
            author: commit.author.user?.login || commit.author.name,
            time_rel: this.timeAgo(commit.committedDate),
            ci_state: this.mapCiState(commit.statusCheckRollup?.state),
            commit_url: `https://github.com/${owner}/${name}/commit/${commit.oid}`,
        };
    }

    private mapToChecksRollup(pr: any, owner: string, name: string): ChecksRollup {
        const headCommit = pr.commits.nodes[pr.commits.nodes.length - 1]?.commit;
        const contexts = headCommit?.statusCheckRollup?.contexts?.nodes || [];

        let passed = 0;
        let failed = 0;
        let running = 0;
        const top_failing: { name: string; url: string }[] = [];

        contexts.forEach((ctx: any) => {
            // CheckRun vs StatusContext
            const isCheckRun = !!ctx.status;
            const status = isCheckRun ? ctx.status : ctx.state;
            const conclusion = ctx.conclusion || ctx.state;

            if (conclusion === "SUCCESS" || conclusion === "EXPECTED" || conclusion === "NEUTRAL") {
                passed++;
            } else if (conclusion === "FAILURE" || conclusion === "ERROR" || conclusion === "CANCELLED" || conclusion === "TIMED_OUT" || conclusion === "ACTION_REQUIRED") {
                failed++;
                if (top_failing.length < 3) {
                    top_failing.push({
                        name: ctx.name || ctx.context,
                        url: ctx.detailsUrl || ctx.targetUrl,
                    });
                }
            } else {
                running++;
            }
        });

        return {
            passed,
            failed,
            running,
            top_failing,
            pr_url: pr.url,
        };
    }

    private mapCiState(state: string): "success" | "failure" | "running" | "unknown" {
        switch (state) {
            case "SUCCESS": return "success";
            case "FAILURE":
            case "ERROR": return "failure";
            case "PENDING": return "running";
            default: return "unknown";
        }
    }

    private timeAgo(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return "just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
}
