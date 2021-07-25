/* eslint-disable */
import { Device } from 'homey';
import fetch from 'node-fetch';
import moment from 'moment';
import { Issue, IssueStatistics } from '../../gitlabLib/interfaces';
import { GroupConnectRequest, GroupConnector } from './interfaces';

const pollerEvent = 'nextPoll';
/**
 * @class
 * @extends Device
 */
// @ts-check
class GitLabGroupDevice extends Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('GitLab group has been initialized');
    this.addListener(pollerEvent, async () => {
      await this.handleIssues().catch(this.error);
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

  /** @private */
  private get instanceUrl(): string {
    return this.getStoreValue('instanceUrl');
  }

  /** @private */
  private get groupId(): number {
    return this.getStoreValue('group');
  }

  /** @private */
  private get myApiUrl(): string {
    return `${this.instanceUrl}api/v4/groups/${this.groupId}/`;
  }

  /** @private */
  private get token(): string {
    return this.getSetting('token');
  }

  /** @private */
  private get checkInterval(): number {
    return (this.getSetting('checkInterval') || 3) * 60000;
  }

  /** @private */
  private get lastDateTimeIssueCheck(): string {
    return this.getStoreValue('lastDateTimeIssueCheck');
  }

  /** @private */
  private set lastDateTimeIssueCheck(value: string) {
    this.setStoreValue('lastDateTimeIssueCheck', value);
  }

  /** @private */
  private async getIssues(updated_after: string): Promise<Issue[]> {
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

  /** @private */
  private async getIssueStatistics(): Promise<IssueStatistics> {
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
        await this.setUnavailable(response.statusText);
      } else if (err.status === 404) {
        await this.setUnavailable(response.statusText);
      }
      this.log(`Url: ${url}, Response: ${JSON.stringify(response)}`);
      this.error(err);
      throw err;
    }
  }

  /** @private */
  private async notifyIssueChanges(issues: Issue[]): Promise<void> {
    await issues.forEach(async (i: Issue) => {
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
          this.log(`My group issue ${iid} created`);
          await this.driver.emit('myGroupIssueCreated', parameters);
        } else if (i.closed_at) {
          this.log(`My group issue ${iid} closed`);
          await this.driver.emit('myGroupIssueClosed', parameters);
        } else {
          this.log(`My group issue ${iid} updated`);
          await this.driver.emit('myGroupIssueUpdated', parameters);
        }
      } catch (err) {
        this.error(err);
      }
    });
  }

  /** @private */
  private async poller(): Promise<void> {
    if (this.getCapabilityValue('paused') === false) {
      this.emit(pollerEvent);
    }

    setTimeout(() => this.poller().catch(this.error), this.checkInterval);
  }

  /** @private */
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

  /** @private */
  private async handleIssueStatistics(): Promise<void> {
    const issueStatistics = await this.getIssueStatistics();
    const { opened } = issueStatistics.statistics.counts;
    await this.setCapabilityValue('open_issues', opened).catch(this.error);
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
    changedKeys: string[];
  }): Promise<string | void> {
    const { oldSettings, newSettings, changedKeys } = parameters;
    this.log(`These GitLab group settings were changed: ${JSON.stringify(changedKeys)}`);
    try {
      if (changedKeys.includes('token')) {
        const { token } = newSettings as any;
        const connection: GroupConnectRequest = {
          gitlab: this.instanceUrl,
          group: this.groupId,
          token
        };
        const myDriver: GroupConnector = this.driver as any;
        const { credentialsAreValid } = await myDriver.connect(connection);
        if (!credentialsAreValid) {
          if (this.getAvailable()) {
            await this.setUnavailable();
          }
          return this.homey.__('user.pair.noAccess');
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
