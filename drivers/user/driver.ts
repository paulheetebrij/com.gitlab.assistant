/* eslint-disable */
import { Driver } from 'homey';
import fetch from 'node-fetch';

class GitLabUserDriver extends Driver {
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

    const cardActionSetStatus = this.homey.flow.getActionCard('user-set-status');
    cardActionSetStatus.registerRunListener(async (args: any) => {
      const { device, message, clear } = args;
      try {
        let status: any = { message };
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
  }

  async onPair(session: any) {
    session.setHandler('get_defaults', () => {
      const instance = this.homey.settings.get('instance');
      const key = this.homey.settings.get('key');
      return { instance, key };
    });
    session.setHandler(
      'validate_user_settings',
      async (data: {
        gitlab: string;
        token: string;
      }): Promise<{
        credentialsAreValid: boolean;
        userId?: number;
        name?: string;
        id?: string;
      }> => {
        try {
          const { gitlab, token } = data;
          let headers: any = { Authorization: `Bearer ${token}` };
          const response = await fetch(`${gitlab}/api/v4/user`, { headers });
          if (!response.ok) {
            this.log(`Response not ok: ${JSON.stringify(response)}`);
            return { credentialsAreValid: false };
          }
          const { id: userId, name } = await response.json();
          const id = `${userId}`;
          return { credentialsAreValid: true, id, userId, name };
        } catch (err) {
          this.error(err);
          throw err;
        }
      }
    );
  }
}

module.exports = GitLabUserDriver;
