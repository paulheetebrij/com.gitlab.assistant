/* eslint-disable */
import { Device } from 'homey';
import fetch from 'node-fetch';
import moment from 'moment';

interface IGitLabIssue {
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

interface IGitLabIssueStatistics {
  statistics: {
    counts: {
      all: number;
      closed: number;
      opened: number;
    };
  };
}
interface IGitLabPipeline {
  id: number;
  project_id: number;
  sha: string;
  ref: string; // = branch
  status: string;
  created_at: string;
  updated_at: string;
  web_url: string;
}
interface IGitLabCommit {
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
class GitLabProjectDevice extends Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('GitLab project has been initialized');
    //https://gitlab.com/api/v4/projects/24592108/issues

    await this.poller();
  }

  private get instanceUrl(): string {
    return this.getStoreValue('instanceUrl');
  }

  private get projectId(): string {
    return this.getData().id;
  }

  private get myApiUrl(): string {
    return `${this.instanceUrl}api/v4/projects/${this.projectId}/`;
  }

  private get token(): string {
    return this.getSetting('token');
  }

  private get checkInterval(): number {
    return (this.getSetting('checkInterval') || 3) * 60000;
  }

  private get lastDateTimePipelineCheck(): string {
    return this.getStoreValue('lastDataTimePipelineCheck');
  }

  private set lastDateTimePipelineCheck(value: string) {
    this.setStoreValue('lastDataTimePipelineCheck', value);
  }

  private get lastDateTimeCommitCheck(): string {
    return this.getStoreValue('lastDataTimeCommitCheck');
  }

  private set lastDateTimeCommitCheck(value: string) {
    this.setStoreValue('lastDataTimeCommitCheck', value);
  }

  private get lastDateTimeIssueCheck(): string {
    return this.getStoreValue('lastDateTimeIssueCheck');
  }

  private isoNow(): string {
    const isoNow = moment().toISOString();
    this.log(isoNow);
    return isoNow;
  }

  private set lastDateTimeIssueCheck(value: string) {
    this.setStoreValue('lastDateTimeIssueCheck', value);
  }

  public async addIssue(title: string): Promise<void> {
    let response: any; // eslint-disable-line;
    try {
      let body = JSON.stringify({ id: this.projectId, title });
      let headers: any = { Authorization: `Bearer ${this.token}` };
      response = await fetch(`${this.myApiUrl}issues`, {
        body,
        method: 'POST',
        headers
      });
      if (!response.ok) {
        throw new Error(this.homey.__('gitLabError'));
      }
      return await response.json();
    } catch (err) {
      if (err.status === 404) {
        await this.setUnavailable();
      }
      this.log(`Response: ${JSON.stringify(response)}`);
      this.error(err);
      throw err;
    }
  }

  private async getPipelines(): Promise<IGitLabPipeline[]> {
    let response: any; // eslint-disable-line;
    try {
      let headers: any = { Authorization: `Bearer ${this.token}` };
      response = await fetch(`${this.myApiUrl}pipelines`, {
        headers
      });
      if (!response.ok) {
        throw new Error(this.homey.__('gitLabError'));
      }
      return await response.json();
    } catch (err) {
      if (err.status === 401) {
        await this.setUnavailable();
      } else if (err.status === 404) {
        await this.setUnavailable();
      }
      this.log(`Response: ${JSON.stringify(response)}`);
      this.error(err);
      throw err;
    }
  }

  private async getCommits(): Promise<IGitLabCommit[]> {
    let response: any; // eslint-disable-line;
    try {
      let headers: any = { Authorization: `Bearer ${this.token}` };
      response = await fetch(`${this.myApiUrl}repository/commits`, {
        headers
      });
      if (!response.ok) {
        throw new Error(this.homey.__('gitLabError'));
      }
      return await response.json();
    } catch (err) {
      if (err.status === 401) {
        await this.setUnavailable();
      } else if (err.status === 404) {
        await this.setUnavailable();
      }
      this.log(`Response: ${JSON.stringify(response)}`);
      this.error(err);
      throw err;
    }
  }

  private async getIssueStatistics(): Promise<IGitLabIssueStatistics> {
    const url = `${this.myApiUrl}issues_statistics`;
    let response: any; // eslint-disable-line;
    try {
      let headers: any = { Authorization: `Bearer ${this.token}` };
      response = await fetch(url, {
        headers
      });
      if (!response.ok) {
        throw new Error(this.homey.__('gitLabError'));
      }
      return await response.json();
    } catch (err) {
      if (err.status === 401) {
        await this.setUnavailable();
      } else if (err.status === 404) {
        await this.setUnavailable();
      }
      this.log(`Url: ${url} ,Response: ${JSON.stringify(response)}`);
      this.error(err);
      throw err;
    }
  }

  private async getIssues(updated_after?: string): Promise<IGitLabIssue[]> {
    this.log(`get issues updated after: ${updated_after}`);
    const url = `${this.myApiUrl}issues${updated_after ? `?updated_after=${updated_after}` : ''}`;
    let response: any; // eslint-disable-line;
    try {
      let headers: any = { Authorization: `Bearer ${this.token}` };
      response = await fetch(url, {
        headers
      });
      if (!response.ok) {
        throw new Error(this.homey.__('gitLabError'));
      }
      return await response.json();
    } catch (err) {
      if (err.status === 404) {
        await this.setUnavailable();
      }
      this.log(`Url: ${url} ,Response: ${JSON.stringify(response)}`);
      this.error(err);
      throw err;
    }
  }

  private async notifyNewCommits(commits: IGitLabCommit[], threshold: string): Promise<void> {
    const newPipelineChanges = commits
      .map((commit: IGitLabCommit) => {
        const {
          id,
          title,
          message,
          author_name,
          authored_date,
          committer_name,
          committed_date,
          web_url,
          created_at
        } = commit;
        return {
          id,
          title,
          message,
          author_name,
          authored_date,
          committer_name,
          committed_date,
          link: web_url,
          created_at
        };
      })
      .filter((td: any) => td.created_at > threshold);

    await newPipelineChanges.forEach(async (args: any) => {
      try {
        const { id, title, message, link, created_at } = args;
        this.emit('new_commit', {
          device: this,
          id,
          title,
          message,
          link,
          created: created_at
        });
      } catch (err) {
        this.error(err);
      }
    });
  }

  private async notifyIssueChanges(issues: IGitLabIssue[]): Promise<void> {
    await issues.forEach(async (i: IGitLabIssue) => {
      try {
        const { id, iid, project_id, title, issue_type, created_at, updated_at, web_url } = i;
        if (i.updated_at === i.created_at) {
          this.log(`project issue ${iid} created`);
          await this.emit('project_issue_created', {
            device: this,
            iid,
            title,
            issue_type,
            link: web_url,
            created_at,
            updated_at
          });
        } else if (i.closed_at) {
          this.log(`project issue ${iid} closed`);
          await this.emit('project_issue_closed', {
            device: this,
            iid,
            title,
            issue_type,
            link: web_url,
            created_at,
            updated_at
          });
        } else {
          this.log(`project issue ${iid} updated`);
          await this.emit('project_issue_updated', {
            device: this,
            iid,
            title,
            issue_type,
            link: web_url,
            created_at,
            updated_at
          });
        }
      } catch (err) {
        this.error(err);
      }
    });
  }

  private async notifyNewPipelineChanges(
    pipelines: IGitLabPipeline[],
    threshold: string
  ): Promise<void> {
    const newPipelineChanges = pipelines
      .map((pipeline: IGitLabPipeline) => {
        const { id, project_id, ref, status, web_url, created_at, updated_at } = pipeline;
        return {
          id,
          project_id,
          project: this.getName(),
          ref,
          status,
          link: web_url,
          created_at,
          updated_at
        };
      })
      .filter(
        (td: any) => td.created_at > threshold || (!!td.updated_at && td.updated_at > threshold)
      );

    await newPipelineChanges.forEach(async (args: any) => {
      try {
        const { id, project_id, ref, status, link, created_at, updated_at } = args;
        this.emit('new_pipeline_status', {
          device: this,
          id,
          project_id,
          project: this.getName(),
          ref,
          status,
          link,
          created_at,
          updated_at
        });
      } catch (err) {
        this.error(err);
      }
    });
  }

  private async poller(): Promise<void> {
    if (this.getAvailable()) {
      await this.handleIssues().catch(this.error);
      await this.handleCommits().catch(this.error);
      await this.handlePipelineChanges().catch(this.error);
      await this.handleIssueStatistics().catch(this.error);
    }

    setTimeout(() => this.poller().catch(this.error), this.checkInterval);
  }

  private async handleIssues(): Promise<void> {
    const storedLastDataTime = this.lastDateTimeIssueCheck;
    const issues = await this.getIssues(storedLastDataTime);
    if (issues.length !== 0) {
      this.log(`Found ${issues.length} issues`);
      const lastUpdated = issues.map((t) => t.updated_at).reduce((a, c) => (a > c ? a : c));
      const lastDate = lastUpdated;
      const nextDate = moment(lastDate).add(1, 'milliseconds').toJSON();
      this.log(`Last date: ${lastDate}, next date: ${nextDate}`);

      // First time no checks
      if (storedLastDataTime) {
        this.log(`Check issues since ${storedLastDataTime}`);

        await this.notifyIssueChanges(issues);
      }

      this.lastDateTimeIssueCheck = nextDate;
    }
  }

  private async handleCommits(): Promise<void> {
    const commits = await this.getCommits();
    if (commits.length !== 0) {
      const lastCreated = commits.map((t) => t.created_at).reduce((a, c) => (a > c ? a : c));
      const lastDate = lastCreated;

      try {
        const { created_at } = commits[0];
        const today = this.isoNow().substring(0, 10);
        let lastCommit: string;
        if (!created_at.startsWith(today)) {
          lastCommit = created_at.substring(0, 10);
        } else {
          lastCommit = created_at.substring(11, 19);
        }
        this.log(`Set CapabilityValue last commit: ${lastCommit}`);
        await this.setCapabilityValue('last_commit', lastCommit).catch(this.error);
      } catch (err) {
        this.error(err);
      }

      const storedLastDataTime = this.lastDateTimeCommitCheck;

      // First time no checks
      if (!!storedLastDataTime) {
        this.log(`Check commits since ${storedLastDataTime}`);

        await this.notifyNewCommits(commits, storedLastDataTime);
      }

      this.lastDateTimeCommitCheck = lastDate;
    }
  }

  private async handlePipelineChanges(): Promise<void> {
    const pipelines = await this.getPipelines();
    if (pipelines.length !== 0) {
      const lastCreated = pipelines.map((t) => t.created_at).reduce((a, c) => (a > c ? a : c));
      const lastUpdated = pipelines.map((t) => t.updated_at).reduce((a, c) => (a > c ? a : c));
      const lastDate = lastCreated > lastUpdated ? lastCreated : lastUpdated;

      const { status } = pipelines[0];
      await this.setCapabilityValue('last_build', status).catch(this.error);

      const storedLastDataTime = this.lastDateTimePipelineCheck;

      // First time no checks
      if (!!storedLastDataTime) {
        this.log(`Check pipelines since ${storedLastDataTime}`);

        await this.notifyNewPipelineChanges(pipelines, storedLastDataTime);
      }

      this.lastDateTimePipelineCheck = lastDate;
    }
  }

  private async handleIssueStatistics(): Promise<void> {
    const issueStatistics = await this.getIssueStatistics();
    const { opened } = issueStatistics.statistics.counts;
    await this.setCapabilityValue('open_issues', opened).catch(this.error);
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('GitLab project has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings(parameters: {
    oldSettings: {};
    newSettings: {};
    changedKeys: {};
  }): Promise<string | void> {
    this.log('GitLab project settings were changed');
    const { newSettings } = parameters;
    const { token } = newSettings as any;
    const result: any = await this.emit('validate_project_settings', {
      gitlab: this.instanceUrl,
      project: this.projectId,
      token
    });
    const { credentialsAreValid } = result;
    if (!credentialsAreValid) {
      if (this.getAvailable()) {
        await this.setUnavailable();
      }
      return this.homey.__('project.pair.noAccess');
    } else {
      if (!this.getAvailable()) {
        await this.setAvailable();
      }
    }
    return;
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name: string) {
    this.log('GitLab project was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('GitLab project has been deleted');
  }
}

module.exports = GitLabProjectDevice;
