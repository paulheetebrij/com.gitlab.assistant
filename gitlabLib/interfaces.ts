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
export enum Availability {
  NotSet = 'not_set',
  Busy = 'busy'
}

/**
 * @interface
 * @property {string} emoji
 * @property {string} message
 * @property {Availability} availability
 * @property {ClearStatusAfter} clear_status_after
 */
export interface SetStatus {
  emoji: string;
  message: string;
  availability: Availability;
  clear_status_after: ClearStatusAfter;
}

/** @enum {string} */
export enum GlobalNotificationLevel {
  Disabled = 'disabled',
  Mention = 'mention',
  Watch = 'watch',
  Participating = 'participating'
}

/** @enum {string} */
export enum ToDoTargetType {
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
export interface Group {
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
export interface Project {
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
export interface Issue {
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
export interface IssueStatistics {
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
export interface ProjectCore {
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
export interface UserCore {
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
export interface ToDoTargetCore {
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
 * @extends ToDoTargetCore
 * @property {string} target_branch
 * @property {string} source_branch
 */
export interface MergeRequestToDoTarget extends ToDoTargetCore {
  target_branch: string;
  source_branch: string;
}

/**
 * @interface
 * @extends ToDoTargetCore
 */
export interface IssueToDoTarget extends ToDoTargetCore {}

/**
 * @interface
 * @property {number} id
 * @property {ProjectCore} project
 * @property {UserCore} author
 * @property {string} action_name
 * @property {ToDoTargetType} target_type
 * @property {IssueToDoTarget | MergeRequestToDoTarget} target
 * @property {string} body
 * @property {string} state
 * @property {string} created_at
 * @property {string} updated_at
 */
export interface ToDoItem {
  id: number;
  project: ProjectCore;
  author: UserCore;
  action_name: string;
  target_type: ToDoTargetType;
  target: IssueToDoTarget | MergeRequestToDoTarget;
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
 * @property {string} ref Branch
 * @property {string} status
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} web_url
 */
export interface CiCdPipeline {
  id: number;
  project_id: number;
  sha: string;
  ref: string;
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
export interface Commit {
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
