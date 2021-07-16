/* eslint-disable */
import Homey from 'homey';
import fetch, { Response } from 'node-fetch';
import { ClearStatusAfter, IssueStatistics, ToDoItem } from '../../gitlabLib/interfaces';
import { UserConnectRequest, UserConnector } from './interfaces';

const pollerEvent = 'nextPoll';

/**
 * @class
 * @extends Homey.Device
 */
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
    if (this.hasCapability('paused') === false) {
      // You need to check if migration is needed
      // do not call addCapability on every init!
      await this.addCapability('paused');
    }
    this.registerCapabilityListener('paused', async (args) => {
      // eslint-disable-line @typescript-eslint/no-explicit-any
      this.log(`paused: ${JSON.stringify(args)}`);
    });

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
    return this.getStoreValue('id');
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
    let response: Response;
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
      response = await fetch(`${this.myApiUrl}status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        if (response.status === 401) {
          // const errMessage = await response.json();
          // response.statusText
          await this.setUnavailable(response.statusText);
        }
        throw new Error(this.homey.__('gitLabError'));
      }
    } catch (err) {
      if (err.status === 401) {
        await this.setUnavailable();
      }
      this.error(err);
    }
  }

  public async enablePoller(): Promise<void> {
    await this.setCapabilityValue('paused', false).catch(this.error);
  }

  public async disablePoller(): Promise<void> {
    await this.setCapabilityValue('paused', true).catch(this.error);
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
        if (response.status === 401) {
          // const errMessage = await response.json();
          // response.statusText
          await this.setUnavailable(response.statusText);
        }
        throw new Error(this.homey.__('gitLabError'));
      }
    } catch (err) {
      if (err.status === 401) {
        await this.setUnavailable();
      }
      this.error(err);
    }
  }

  private async getMyIssueStatistics(): Promise<IssueStatistics> {
    let response: Response; // eslint-disable-line;
    //GET /issues_statistics?author_id=5
    //GET / issues_statistics ? assignee_id = 5
    const url = `${this.myApiUrl}issues_statistics/?assignee_id=${this.id}&state=opened`;
    try {
      let headers: any = { Authorization: `Bearer ${this.token}` };
      response = await fetch(url, { headers });
      if (!response.ok) {
        if (response.status === 401) {
          // const errMessage = await response.json();
          // response.statusText
          await this.setUnavailable(response.statusText);
        }
        throw new Error(this.homey.__('gitLabError'));
      }
      return await response.json();
    } catch (err) {
      if (err.status === 401) {
        await this.setUnavailable();
      }
      this.log(`Error retrieving url: ${url}`);
      this.error(err);
      throw err;
    }
  }

  private async getTodos(): Promise<ToDoItem[]> {
    let response: Response; // eslint-disable-line;
    const url = `${this.myApiUrl}todos?state=pending`;
    try {
      let headers: any = { Authorization: `Bearer ${this.token}` };
      response = await fetch(url, { headers });
      if (!response.ok) {
        if (response.status === 401) {
          // const errMessage = await response.json();
          // response.statusText
          await this.setUnavailable(response.statusText);
        }
        throw new Error(this.homey.__('gitLabError'));
      }
      return await response.json();
    } catch (err) {
      if (err.status === 401) {
        await this.setUnavailable();
      }
      this.log(`Error retrieving url: ${url}`);
      this.error(err);
      throw err;
    }
  }

  private async notifyNewTodo(todos: ToDoItem[], threshold: string): Promise<void> {
    const notificationData = todos
      .map((todoItem: ToDoItem) => {
        const {
          id,
          project,
          target,
          action_name,
          target_type,
          author,
          body,
          state,
          created_at,
          updated_at
        } = todoItem;
        return {
          id,
          project: project.name,
          action: this.homey.__(action_name),
          type: this.homey.__(target_type),
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
        const { id, project, action, state, type, title, link, author, body } = args;
        this.driver.emit('newTodo', {
          device: this,
          id,
          project,
          action,
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
    if (this.getCapabilityValue('paused') === false) {
      this.emit(pollerEvent);
    } else {
      this.log(`User paused`);
    }

    setTimeout(() => this.poller().catch(this.error), this.checkInterval);
  }

  private async handleToDos(): Promise<void> {
    const todos = await this.getTodos();

    this.log(`Open todos: ${todos.length}`);
    await this.setCapabilityValue('open_tasks', todos.length).catch(this.error);

    if (todos.length !== 0) {
      const lastCreated = todos.map((t) => t.created_at).reduce((a, c) => (a > c ? a : c));
      const lastUpdated = todos.map((t) => t.updated_at).reduce((a, c) => (a > c ? a : c));
      const lastDate = lastCreated > lastUpdated ? lastCreated : lastUpdated;

      const storedLastDataTime = this.lastDataTimeTodoCheck;

      // First time no checks
      if (!!storedLastDataTime) {
        this.log(`Check todo items since ${storedLastDataTime}`);

        await this.notifyNewTodo(todos, storedLastDataTime);
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
    changedKeys: string[];
  }): Promise<string | void> {
    const { oldSettings, newSettings, changedKeys } = parameters;
    this.log(`These GitLab user settings were changed: ${JSON.stringify(changedKeys)}`);
    try {
      if (changedKeys.includes('token')) {
        const { token } = newSettings as any;
        const connection: UserConnectRequest = {
          gitlab: this.instanceUrl,
          token
        };
        const myDriver: UserConnector = this.driver as any;
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
