/* eslint-disable */
import { Device } from 'homey';
import fetch from 'node-fetch';
import moment from 'moment';
import {
  IGitLabCommit,
  IGitLabIssue,
  IGitLabIssueStatistics,
  IGitLabPipeline
} from '../../gitlabLib/interfaces';
import { ProjectConnectRequest, ProjectConnector } from './interfaces';

const pollerEvent = 'nextPoll';
/**
 * @class
 * @extends Device
 */
// @ts-check
class GitLabProjectDevice extends Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('GitLab project has been initialized');
    // https://gitlab.com/api/v4/projects/24592108/issues

    this.addListener(pollerEvent, async () => {
      await this.handleIssues().catch(this.error);
    });
    this.addListener(pollerEvent, async () => {
      await this.handleCommits().catch(this.error);
    });
    this.addListener(pollerEvent, async () => {
      await this.handlePipelineChanges().catch(this.error);
    });
    this.addListener(pollerEvent, async () => {
      await this.handleIssueStatistics().catch(this.error);
    });

    if (this.hasCapability('paused') === false) {
      // You need to check if migration is needed
      // do not call addCapability on every init!
      await this.addCapability('paused');
    }
    this.registerCapabilityListener('paused', async (args) => {
      // eslint-disable-line @typescript-eslint/no-explicit-any
      this.log(`paused: ${JSON.stringify(args)}`);
    });

    await this.poller();
  }

  private get instanceUrl(): string {
    return this.getStoreValue('instanceUrl');
  }

  private get projectId(): number {
    return this.getStoreValue('project');
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

  /**
   * Enable polling for new changes
   */
  public async enablePoller(): Promise<void> {
    await this.setCapabilityValue('paused', false).catch(this.error);
  }

  /**
   * Disable polling for new changes
   */
  public async disablePoller(): Promise<void> {
    await this.setCapabilityValue('paused', true).catch(this.error);
  }

  /**
   * @param {string} title
   */
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
        if (response.status === 401) {
          await this.setUnavailable(response.statusText);
        }
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
        if (response.status === 401) {
          await this.setUnavailable(response.statusText);
        }
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
        if (response.status === 401) {
          await this.setUnavailable(response.statusText);
        }
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
        if (response.status === 401) {
          await this.setUnavailable(response.statusText);
        }
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
        if (response.status === 401) {
          await this.setUnavailable(response.statusText);
        }
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
        this.driver.emit('newCommit', {
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
    issues.forEach((i: IGitLabIssue) => {
      try {
        const { iid, title, created_at, web_url } = i;
        const parameters = {
          device: this,
          iid,
          title,
          url: web_url,
          created: created_at
        };
        if (i.updated_at === i.created_at) {
          this.log(`My project issue ${iid} created.`);
          this.driver.emit('myProjectIssueCreated', parameters);
        } else if (i.closed_at) {
          this.log(`My project issue ${iid} closed.`);
          this.driver.emit('myProjectIssueClosed', parameters);
        } else {
          this.log(`My project issue ${iid} updated.`);
          this.driver.emit('myProjectIssueUpdated', parameters);
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
        this.driver.emit('newPipelineStatus', {
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
        if (status === 'failed') {
          this.homey.app.emit('pipeline-fails', {
            id,
            project_id,
            project: this.getName(),
            ref,
            link,
            created_at,
            updated_at
          });
        }
      } catch (err) {
        this.error(err);
      }
    });
  }

  private async poller(): Promise<void> {
    if (this.getCapabilityValue('paused') === false) {
      this.emit(pollerEvent);
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
    changedKeys: string[];
  }): Promise<string | void> {
    const { oldSettings, newSettings, changedKeys } = parameters;
    this.log(`These GitLab project settings were changed: ${JSON.stringify(changedKeys)}`);
    try {
      if (changedKeys.includes('token')) {
        const { token } = newSettings as any;
        const connection: ProjectConnectRequest = {
          gitlab: this.instanceUrl,
          project: this.projectId,
          token
        };
        const myDriver: ProjectConnector = this.driver as any;
        const { credentialsAreValid } = await myDriver.connect(connection);
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
      }
    } catch (err) {
      this.error(err);
    }
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
