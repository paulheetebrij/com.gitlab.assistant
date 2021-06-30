/* eslint-disable */
import Homey from 'homey';
import fetch from 'node-fetch';
import { IGitLabIssue, IGitLabIssueStatistics } from '../../gitlabLib/interfaces';

enum ClearStatusAfter {
  ClearAfter30Minutes = '30_minutes',
  ClearAfter3Hours = '3_hours',
  ClearAfter8Hours = '8_hours',
  ClearAfter1Day = '1_day',
  ClearAfter3Days = '3_days',
  ClearAfter7Days = '7_days',
  ClearAfter30Days = '7_days'
}
interface IGitLabProjectShort {
  id: number;
  description: string;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  created_at: string;
}
interface IGitLabUserShort {
  id: number;
  name: string;
  username: string;
  state: string;
  avatar_url: string;
  web_url: string;
}
interface IGitLabTargetShort {
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
interface IGitLabMergeRequestShort extends IGitLabTargetShort {
  target_branch: string;
  source_branch: string;
}
interface IGitLabIssueShort extends IGitLabTargetShort {}
enum GitLabToDoTargetType {
  Issue = 'Issue',
  MergeRequest = 'MergeRequest'
}
interface IGitLabToDoItem {
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
const pollerEvent = 'nextPoll';
class GitLabUserDevice extends Homey.Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('GitLab User has been initialized');

    if (this.hasCapability('open_issues') === false) {
      // You need to check if migration is needed
      // do not call addCapability on every init!
      await this.addCapability('open_issues');
    }

    this.addListener(pollerEvent, async () => {
      await this.handleToDos().catch(this.error);
    });
    this.addListener(pollerEvent, async () => {
      await this.handleMyIssues().catch(this.error);
    });
    await this.poller();
  }

  private get instanceUrl(): string {
    return this.getStoreValue('instanceUrl');
  }

  private get myApiUrl(): string {
    return `${this.instanceUrl}api/v4/`;
  }

  private get token(): string {
    return this.getSetting('token');
  }

  private get checkInterval(): number {
    return (this.getSetting('checkInterval') || 3) * 60000;
  }

  private get id(): number {
    return this.getData().id;
  }

  private get lastDataTimeTodoCheck(): string {
    return this.getStoreValue('lastDataTimeTodoCheck');
  }
  private set lastDataTimeTodoCheck(value: string) {
    this.setStoreValue('lastDataTimeTodoCheck', value);
  }

  public async setStatus(status: {
    emoji?: string;
    message?: string;
    clear_status_after?: ClearStatusAfter;
  }): Promise<void> {
    try {
      const { emoji, message, clear_status_after } = status;
      let headers: any = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      };
      let body: any = {};
      if (emoji) body.emoji = emoji;
      if (message) body.message = message;
      if (clear_status_after) body.clear_status_after = clear_status_after;
      const response = await fetch(`${this.myApiUrl}status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        throw new Error(this.homey.__('gitLabError'));
      }
    } catch (err) {
      if (err.status === 401) {
        await this.setUnavailable();
      }
      this.error(err);
    }
  }

  public async markTodosAsDone(id?: number): Promise<void> {
    const idBranch = id ? `/${id}` : '';
    try {
      let headers: any = { Authorization: `Bearer ${this.token}` };
      const response = await fetch(`${this.myApiUrl}todos${idBranch}/mark_as_done`, {
        method: 'POST',
        headers
      });
      if (!response.ok) {
        throw new Error(this.homey.__('gitLabError'));
      }
    } catch (err) {
      if (err.status === 401) {
        await this.setUnavailable();
      }
      this.error(err);
    }
  }

  private async getMyIssues(): Promise<IGitLabIssue[]> {
    let response: any; // eslint-disable-line;
    const url = `${this.myApiUrl}issues/?assignee_id=${this.id}&state=opened`;
    try {
      let headers: any = { Authorization: `Bearer ${this.token}` };
      response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(this.homey.__('gitLabError'));
      }
      return await response.json();
    } catch (err) {
      if (err.status === 401) {
        await this.setUnavailable();
      }
      this.log(`Error retrieving url: ${url}`);
      this.log(`Response: ${JSON.stringify(response)}`);
      this.error(err);
      throw err;
    }
  }

  private async getMyIssueStatistics(): Promise<IGitLabIssueStatistics> {
    let response: any; // eslint-disable-line;
    //GET /issues_statistics?author_id=5
    //GET / issues_statistics ? assignee_id = 5
    const url = `${this.myApiUrl}issues_statistics/?assignee_id=${this.id}&state=opened`;
    try {
      let headers: any = { Authorization: `Bearer ${this.token}` };
      response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(this.homey.__('gitLabError'));
      }
      return await response.json();
    } catch (err) {
      if (err.status === 401) {
        await this.setUnavailable();
      }
      this.log(`Error retrieving url: ${url}`);
      this.log(`Response: ${JSON.stringify(response)}`);
      this.error(err);
      throw err;
    }
  }

  private async getTodos(): Promise<IGitLabToDoItem[]> {
    let response: any; // eslint-disable-line;
    const url = `${this.myApiUrl}todos?state=pending`;
    try {
      let headers: any = { Authorization: `Bearer ${this.token}` };
      response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(this.homey.__('gitLabError'));
      }
      return await response.json();
    } catch (err) {
      if (err.status === 401) {
        await this.setUnavailable();
      }
      this.log(`Error retrieving url: ${url}`);
      this.log(`Response: ${JSON.stringify(response)}`);
      this.error(err);
      throw err;
    }
  }

  private async notifyNewTodo(tasks: IGitLabToDoItem[], threshold: string): Promise<void> {
    const notificationData = tasks
      .map((todoItem: IGitLabToDoItem) => {
        const { id, project, target, target_type, author, body, state, created_at, updated_at } =
          todoItem;
        return {
          id,
          project: project.name,
          type: target_type === GitLabToDoTargetType.Issue ? 'issue' : 'merge request',
          title: target.title,
          link: target.web_url,
          author: author.name,
          body,
          state,
          created_at,
          updated_at
        };
      })
      .filter(
        (td: any) =>
          td.created_at.substring(0, 19) > threshold ||
          (!!td.updated_at && td.updated_at.substring(0, 19) > threshold)
      );

    await notificationData.forEach(async (args: any) => {
      try {
        const { id, project, state, type, title, link, author, body } = args;
        this.driver.emit('newTodo', {
          device: this,
          id,
          project,
          state,
          type,
          title,
          link,
          author,
          body
        });
      } catch (err) {
        this.error(err);
      }
    });
  }

  private async poller(): Promise<void> {
    if (this.getAvailable()) {
      this.emit(pollerEvent);
    } else {
      this.log(`User unavailable`);
    }

    setTimeout(() => this.poller().catch(this.error), this.checkInterval);
  }

  private async handleToDos(): Promise<void> {
    const tasks = await this.getTodos();

    this.log(`Open tasks: ${tasks.length}`);
    await this.setCapabilityValue('open_tasks', tasks.length).catch(this.error);

    if (tasks.length !== 0) {
      const lastCreated = tasks.map((t) => t.created_at).reduce((a, c) => (a > c ? a : c));
      const lastUpdated = tasks.map((t) => t.updated_at).reduce((a, c) => (a > c ? a : c));
      const lastDate = lastCreated > lastUpdated ? lastCreated : lastUpdated;

      const storedLastDataTime = this.lastDataTimeTodoCheck;

      // First time no checks
      if (!!storedLastDataTime) {
        this.log(`Check todo items since ${storedLastDataTime}`);

        await this.notifyNewTodo(tasks, storedLastDataTime);
      }

      this.lastDataTimeTodoCheck = lastDate;
    }
  }

  private async handleMyIssues(): Promise<void> {
    // const tasks = await this.getMyIssues();
    try {
      const { statistics } = await this.getMyIssueStatistics();
      await this.setCapabilityValue('open_issues', statistics.counts.opened);
    } catch (err) {
      this.error(err);
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('GitLab User has been added');
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
    this.log('GitLab user settings were changed');
    const { newSettings } = parameters;
    const { token } = newSettings as any;
    const result: any = await this.driver.emit('validate_user_settings', {
      gitlab: this.instanceUrl,
      token
    });
    const { credentialsAreValid } = result;
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
    return;
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name: string) {
    this.log('GitLab User was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('GitLab User has been deleted');
  }
}

module.exports = GitLabUserDevice;
