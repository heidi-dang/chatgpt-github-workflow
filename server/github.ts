import { graphql } from "@octokit/graphql";

export class MissingGitHubTokenError extends Error {
  constructor() {
    super("MISSING_GITHUB_TOKEN");
    this.name = "MissingGitHubTokenError";
  }
}
export class InvalidGitHubTokenError extends Error {
  constructor(message?: string) {
    super(message || "INVALID_GITHUB_TOKEN");
    this.name = "InvalidGitHubTokenError";
  }
}

export interface PRCard {
  pr: number;
  title: string;
  url: string;
  author: string;
  head: string;
  base: string;
  updated_at: string;
  updated_rel: string;
  ci_state: "success" | "failure" | "running" | "unknown";
  mergeable: boolean;
  review_decision: string;
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

  constructor(token?: string) {
    const t = token?.trim();
    if (!t) throw new MissingGitHubTokenError();
    this.gql = graphql.defaults({
      headers: { authorization: `Bearer ${t}` },
    });
  }

  async fetchSnapshot(owner: string, name: string, prNumber?: number): Promise<Snapshot> {
    const query = `
      query($owner: String!, $name: String!, $prNumber: Int!, $hasPr: Boolean!) {
        repository(owner: $owner, name: $name) {
          pullRequests(states: OPEN, first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
            nodes {
              number
              title
              url
              author { login }
              headRefName
              baseRefName
              updatedAt
              mergeable
              reviewDecision
              commits(last: 1) {
                nodes {
                  commit {
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
            url
            commits(last: 50) {
              totalCount
              nodes {
                commit {
                  oid
                  messageHeadline
                  committedDate
                  author {
                    name
                    user { login }
                  }
                  statusCheckRollup {
                    state
                    contexts(first: 20) {
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

    try {
      const data: any = await this.gql(query, {
        owner,
        name,
        prNumber: prNumber || 0,
        hasPr: !!prNumber,
      });

      const repo = data.repository;
      if (!repo) throw new Error(`Repository ${owner}/${name} not found`);

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
        const ciState = this.mapCiState(pr.commits.nodes[0]?.commit?.statusCheckRollup?.state);
        const card: PRCard = {
          pr: pr.number,
          title: pr.title,
          url: pr.url,
          author: pr.author?.login || "ghost",
          head: pr.headRefName,
          base: pr.baseRefName,
          updated_at: pr.updatedAt,
          updated_rel: this.timeAgo(pr.updatedAt),
          ci_state: ciState,
          mergeable: pr.mergeable === "MERGEABLE",
          review_decision: pr.reviewDecision || "NONE",
        };

        // Deterministic sorting logic
        if (ciState === "failure") {
          board_groups.ci_failing.push(card);
        } else if (card.review_decision === "CHANGES_REQUESTED") {
          board_groups.changes_req.push(card);
        } else if (card.mergeable && ciState === "success" && card.review_decision === "APPROVED") {
          board_groups.mergeable.push(card);
        } else if (card.review_decision === "REVIEW_REQUIRED" || card.review_decision === "APPROVED") {
          board_groups.in_review.push(card);
        } else {
          board_groups.open.push(card);
        }
      });

      let commitsList: CommitRow[] = [];
      let checksRollup: ChecksRollup = { passed: 0, failed: 0, running: 0, top_failing: [], pr_url: "" };

      if (focusedPr) {
        const commitNodes = focusedPr.commits.nodes;
        commitsList = commitNodes.map((n: any) => {
          const c = n.commit;
          return {
            sha: c.oid,
            short_sha: c.oid.substring(0, 7),
            title: c.messageHeadline,
            author: c.author.user?.login || c.author.name,
            time_rel: this.timeAgo(c.committedDate),
            ci_state: this.mapCiState(c.statusCheckRollup?.state),
            commit_url: `https://github.com/${owner}/${name}/commit/${c.oid}`,
          };
        }).reverse();

        const latestCommit = commitNodes[commitNodes.length - 1]?.commit;
        if (latestCommit) {
          checksRollup = this.calculateChecksRollup(latestCommit, focusedPr.url);
        }
      }

      return {
        repo: `${owner}/${name}`,
        focused_pr: prNumber || null,
        board_groups,
        commits: { count: focusedPr?.commits?.totalCount || 0, items: commitsList },
        checks_rollup: checksRollup,
        last_updated_iso: new Date().toISOString(),
      };
    } catch (error: any) {
      const msg = String(error?.message || "");
      const status = error?.status || error?.response?.status || (error?.request?.res && error.request.res.statusCode);
      if (status === 401 || /bad credentials/i.test(msg)) {
        throw new InvalidGitHubTokenError(msg);
      }
      console.error("GitHub Query Failed:", msg);
      throw error;
    }
  }

  private calculateChecksRollup(commit: any, prUrl: string): ChecksRollup {
    const contexts = commit.statusCheckRollup?.contexts?.nodes || [];
    let passed = 0, failed = 0, running = 0;
    const top_failing: { name: string; url: string }[] = [];

    contexts.forEach((ctx: any) => {
      const conclusion = ctx.conclusion || ctx.state;
      const name = ctx.name || ctx.context;
      const url = ctx.detailsUrl || ctx.targetUrl;

      if (["SUCCESS", "EXPECTED", "NEUTRAL"].includes(conclusion)) {
        passed++;
      } else if (["FAILURE", "ERROR", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED"].includes(conclusion)) {
        failed++;
        if (top_failing.length < 3) top_failing.push({ name, url });
      } else {
        running++;
      }
    });

    return { passed, failed, running, top_failing, pr_url: prUrl };
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
