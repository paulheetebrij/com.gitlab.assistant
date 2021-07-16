/* eslint-disable */
/** @enum {string} */
export enum ClearStatusAfter {
  ClearAfter30Minutes = '30_minutes',
  ClearAfter3Hours = '3_hours',
  ClearAfter8Hours = '8_hours',
  ClearAfter1Day = '1_day',
  ClearAfter3Days = '3_days',
  ClearAfter7Days = '7_days',
  ClearAfter30Days = '7_days'
}

/** @enum {string} */
export enum GitLabToDoTargetType {
  Issue = 'Issue',
  MergeRequest = 'MergeRequest',
  DesignManagementDesign = 'DesignManagement::Design',
  AlertManagementAlert = 'AlertManagement::Alert'
}

/**
 * @interface
 * @property {string} id
 * @property {string} description
 * @property {string} name
 * @property {string} web_url
 */
export interface IGitLabGroup {
  id: string;
  description: string;
  name: string;
  web_url: string;
}

/**
 * @interface
 * @property {string} id
 * @property {string} description
 * @property {string} name
 * @property {string} name_with_namespace
 * @property {string} path
 * @property {string} path_with_namespace
 * @property {string} created_at
 * @property {object} _links
 * @property {string} _links.self
 * @property {string} _links.issues
 * @property {string} _links.merge_requests
 * @property {string} _links.repo_branches
 * @property {string} _links.labels
 * @property {string} _links.events
 * @property {string} _links.members
 * @property {string} default_branch
 * @property {string} web_url
 */
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

/**
 * @interface
 * @property {number} id
 * @property {number} iid
 * @property {number} project_id
 * @property {string} title
 * @property {string} description
 * @property {string} state
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} closed_at
 * @property {string[]} labels
 * @property {string} issue_type
 * @property {string} web_url
 */
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

/**
 * @interface
 * @property {object} statistics
 * @property {object} statistics.counts
 * @property {number} statistics.counts.all
 * @property {number} statistics.counts.closed
 * @property {number} statistics.counts.opened
 */
export interface IGitLabIssueStatistics {
  statistics: {
    counts: {
      all: number;
      closed: number;
      opened: number;
    };
  };
}

/**
 * @interface
 * @property {number} id
 * @property {string} description
 * @property {string} name
 * @property {string} name_with_namespace
 * @property {string} path
 * @property {string} path_with_namespace
 * @property {string} created_at
 */
export interface IGitLabProjectShort {
  id: number;
  description: string;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  created_at: string;
}

/**
 * @interface
 * @property {number} id
 * @property {string} name
 * @property {string} username
 * @property {string} state
 * @property {string} avatar_url
 * @property {string} web_url
 */
export interface IGitLabUserShort {
  id: number;
  name: string;
  username: string;
  state: string;
  avatar_url: string;
  web_url: string;
}

/**
 * @interface
 * @property {number} id
 * @property {number} iid
 * @property {number} project_id
 * @property {string} description
 * @property {string} state
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} web_url
 */
export interface IGitLabTargetShort {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  updated_at: string;
  web_url: string;
}

/**
 * @interface
 * @extends IGitLabTargetShort
 * @property {string} target_branch
 * @property {string} source_branch
 */
export interface IGitLabMergeRequestShort extends IGitLabTargetShort {
  target_branch: string;
  source_branch: string;
}

/**
 * @interface
 * @extends IGitLabTargetShort
 */
export interface IGitLabIssueShort extends IGitLabTargetShort {}

/**
 * @interface
 * @property {number} id
 * @property {IGitLabProjectShort} project
 * @property {IGitLabUserShort} author
 * @property {string} action_name
 * @property {GitLabToDoTargetType} target_type
 * @property {IGitLabIssueShort | IGitLabMergeRequestShort} target
 * @property {string} body
 * @property {string} state
 * @property {string} created_at
 * @property {string} updated_at
 */
export interface IGitLabToDoItem {
  id: number;
  project: IGitLabProjectShort;
  author: IGitLabUserShort;
  action_name: string;
  target_type: GitLabToDoTargetType;
  target: IGitLabIssueShort | IGitLabMergeRequestShort;
  body: string;
  state: string;
  created_at: string;
  updated_at: string;
}

/**
 * @interface
 * @property {number} id
 * @property {number} project_id
 * @property {string} sha
 * @property {string} ref
 * @property {string} status
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} web_url
 */
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

/**
 * @interface
 * @property {number} id
 * @property {string} short_id
 * @property {string} created_at
 * @property {string[]} parent_ids
 * @property {string} title
 * @property {string} message
 * @property {string} author_name
 * @property {string} author_email
 * @property {string} authored_date
 * @property {string} committer_name
 * @property {string} committer_email
 * @property {string} committed_date
 * @property {object} trailers
 * @property {string} web_url
 * @property {string} sha
 * @property {string} ref
 * @property {string} status
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} web_url
 */
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
