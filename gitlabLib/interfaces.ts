/* eslint-disable */
export interface IGitLabGroup {
  id: string;
  description: string;
  name: string;
  web_url: string;
}

export interface IGitLabProject {
  id: string;
  description: string;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  created_at: string;
  default_branch: string;
  _links: {
    self: string;
    issues: string;
    merge_requests: string;
    repo_branches: string;
    labels: string;
    events: string;
    members: string;
  };
}

export interface IGitLabIssue {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string;
  labels: string[];
  issue_type: string;
  web_url: string;
}

export interface IGitLabIssueStatistics {
  statistics: {
    counts: {
      all: number;
      closed: number;
      opened: number;
    };
  };
}

export interface IGitLabPipeline {
  id: number;
  project_id: number;
  sha: string;
  ref: string; // = branch
  status: string;
  created_at: string;
  updated_at: string;
  web_url: string;
}

export interface IGitLabCommit {
  id: string;
  short_id: string;
  created_at: string;
  parent_ids: string[];
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  committer_name: string;
  committer_email: string;
  committed_date: string;
  trailers: {};
  web_url: string;
}
