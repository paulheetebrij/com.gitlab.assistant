/**
 * @module user driver
 */
// @ts-check
/* eslint-disable */
import { Driver } from 'homey';
import fetch from 'node-fetch';
import { UserConnectRequest, UserConnector, UserConnectResponse } from './interfaces';
import { v4 as uuid } from 'uuid';
import { Availability, SetStatus } from '../../gitlabLib/interfaces';

// @public
/**
 * @class
 * @extends Homey.Driver
 * @implements {UserConnector}
 */
export class GitLabUserDriver extends Driver implements UserConnector {
  // export only needed for auto-documentation

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Driver GitLab User has been initialized');

    this.addListener('newTodo', async (args) => {
      try {
        const { device, id, project, action, state, type, title, link, author, body } = args;
        this.log(
          `New todo ${JSON.stringify({
            id,
            project,
            action,
            state,
            type,
            title,
            link,
            author,
            body
          })}`
        );
        await this.homey.flow.getDeviceTriggerCard('user-new-todo').trigger(device, {
          id,
          project,
          action,
          state,
          type,
          title,
          author,
          body,
          link
        });
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionClearStatus = this.homey.flow.getActionCard('user-clear-status');
    cardActionClearStatus.registerRunListener(async (args: any) => {
      const { device } = args;
      try {
        let status: Partial<SetStatus> = {};
        await device.setStatus(status);
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionMarkAsBusy = this.homey.flow.getActionCard('user-mark-as-busy');
    cardActionMarkAsBusy.registerRunListener(async (args: any) => {
      const { device, message, clear } = args;
      try {
        let status: Partial<SetStatus> = { message, availability: Availability.Busy };
        if (clear !== 'no') {
          status.clear_status_after = clear.replace('-', '_');
        }
        await device.setStatus(status);
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionSetStatus = this.homey.flow.getActionCard('user-set-status');
    cardActionSetStatus.registerRunListener(async (args: any) => {
      const { device, message, clear } = args;
      try {
        let status: Partial<SetStatus> = { message };
        if (clear !== 'no') {
          status.clear_status_after = clear.replace('-', '_');
        }
        await device.setStatus(status);
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionMarkToDoAsDone = this.homey.flow.getActionCard('user-mark-done');
    cardActionMarkToDoAsDone.registerRunListener(async (args: any) => {
      const { device, id } = args;
      try {
        await device.markTodosAsDone(id);
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionMarkAllToDosAsDone = this.homey.flow.getActionCard('user-mark-all-done');
    cardActionMarkAllToDosAsDone.registerRunListener(async (args: any) => {
      const { device } = args;
      try {
        await device.markTodosAsDone();
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionEnableUserPoller = this.homey.flow.getActionCard('enable-user-poller');
    cardActionEnableUserPoller.registerRunListener(async (args: any) => {
      const { device } = args;
      try {
        await device.enablePoller();
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionDisableUserPoller = this.homey.flow.getActionCard('disable-user-poller');
    cardActionDisableUserPoller.registerRunListener(async (args: any) => {
      const { device } = args;
      try {
        await device.disablePoller();
      } catch (err) {
        this.error(err);
      }
    });

    const cardSetGlobalNotificationLevel = this.homey.flow.getActionCard(
      'set-user-nofification-level'
    );
    cardSetGlobalNotificationLevel.registerRunListener(async (args: any) => {
      const { device, level } = args;
      try {
        await device.setNotificationLevel(level);
      } catch (err) {
        this.error(err);
      }
    });
  }

  /**
   * Tests credentials and validity of user settings by api call.
   * @param {UserConnectRequest} data
   * @returns {UserConnectResponse}
   */
  public async connect(data: UserConnectRequest): Promise<UserConnectResponse> {
    try {
      const { gitlab, token } = data;
      let headers: any = { Authorization: `Bearer ${token}` };
      const response = await fetch(`${gitlab}/api/v4/user`, { headers });
      if (!response.ok) {
        this.log(`Response not ok: ${JSON.stringify(response)}`);
        return { credentialsAreValid: false };
      }
      const { id: userId, name } = await response.json();
      const id = uuid(); // `${userId}`;
      return { credentialsAreValid: true, id, userId, name };
    } catch (err) {
      this.error(err);
      throw err;
    }
  }

  private get appDefaults(): { instance: string; key: string } {
    const instance = this.homey.settings.get('instance');
    const key = this.homey.settings.get('key');
    return { instance, key };
  }

  async onPair(session: any) {
    session.setHandler('get_defaults', () => this.appDefaults);
    session.setHandler('validate_user_settings', async (data: UserConnectRequest) =>
      this.connect(data)
    );
  }
}

module.exports = GitLabUserDriver;
