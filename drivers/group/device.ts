/* eslint-disable */
import { Device } from 'homey';
import fetch from 'node-fetch';
import moment from 'moment';
import { IGitLabIssue, IGitLabIssueStatistics } from '../../gitlabLib/interfaces';

class GitLabGroupDevice extends Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('GitLab group has been initialized');
    await this.poller();
  }

  private get instanceUrl(): string {
    return this.getStoreValue('instanceUrl');
  }

  private get groupId(): string {
    return this.getData().id;
  }

  private get myApiUrl(): string {
    return `${this.instanceUrl}api/v4/groups/${this.groupId}/`;
  }

  private get token(): string {
    return this.getSetting('token');
  }

  private get checkInterval(): number {
    return (this.getSetting('checkInterval') || 3) * 60000;
  }

  private get lastDateTimeIssueCheck(): string {
    return this.getStoreValue('lastDateTimeIssueCheck');
  }

  private set lastDateTimeIssueCheck(value: string) {
    this.setStoreValue('lastDateTimeIssueCheck', value);
  }

  private async getIssues(updated_after: string): Promise<IGitLabIssue[]> {
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
      this.log(`Url: ${url}, Response: ${JSON.stringify(response)}`);
      this.error(err);
      throw err;
    }
  }

  private async notifyIssueChanges(issues: IGitLabIssue[]): Promise<void> {
    await issues.forEach(async (i: IGitLabIssue) => {
      try {
        const { iid, title, created_at, web_url } = i;
        if (i.updated_at === i.created_at) {
          this.log(`group issue ${iid} created`);
          await this.emit('group_issue_created', {
            device: this,
            iid,
            title,
            url: web_url,
            created: created_at
          });
        } else if (i.closed_at) {
          this.log(`group issue ${iid} closed`);
          await this.emit('group_issue_closed', {
            device: this,
            iid,
            title,
            url: web_url,
            created: created_at
          });
        } else {
          this.log(`group issue ${iid} updated`);
          await this.emit('group_issue_updated', {
            device: this,
            iid,
            title,
            url: web_url,
            created: created_at
          });
        }
      } catch (err) {
        this.error(err);
      }
    });
  }

  private async poller(): Promise<void> {
    if (this.getAvailable()) {
      await this.handleIssues().catch(this.error);
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

  private async handleIssueStatistics(): Promise<void> {
    const issueStatistics = await this.getIssueStatistics();
    const { opened } = issueStatistics.statistics.counts;
    await this.setCapabilityValue('open_issues', opened).catch(this.error);
  }

  public async addIssue(title: string): Promise<void> {
    let response: any; // eslint-disable-line;
    try {
      let body = JSON.stringify({ id: this.groupId, title });
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
      this.log(`Response: ${JSON.stringify(response)}`);
      this.error(err);
      throw err;
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('GitLab group has been added');
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
    this.log('GitLab group settings were changed');
    const { newSettings } = parameters;
    const { token } = newSettings as any;
    const result: any = await this.emit('validate_group_settings', {
      gitlab: this.instanceUrl,
      group: this.groupId,
      token
    });
    const { credentialsAreValid } = result;
    if (!credentialsAreValid) {
      if (this.getAvailable()) {
        await this.setUnavailable();
      }
      return this.homey.__('group.pair.noAccess');
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
    this.log('GitLab group was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('GitLab group has been deleted');
  }
}

module.exports = GitLabGroupDevice;
