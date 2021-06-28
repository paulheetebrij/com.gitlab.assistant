/* eslint-disable */
import { Driver } from 'homey';
import fetch from 'node-fetch';

class GitLabUserDriver extends Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Driver GitLab User has been initialized');
    this.addListener('new_todo', async (args) => {
      try {
        const { device, id, project, state, type, title, link, author, body } = args;
        this.log(
          `New task ${JSON.stringify({
            id,
            project,
            state,
            type,
            title,
            link,
            author,
            body
          })}`
        );
        await this.homey.flow
          .getDeviceTriggerCard('new-activity')
          .trigger(device, { id, project, state, type, title, link, author, body });
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionSetStatus = this.homey.flow.getActionCard('set-status');
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

    const cardActionMarkToDoAsDone = this.homey.flow.getActionCard('mark-todo-as-done');
    cardActionMarkToDoAsDone.registerRunListener(async (args: any) => {
      const { device, id } = args;
      try {
        await device.markTodosAsDone(id);
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionMarkAllToDosAsDone = this.homey.flow.getActionCard('mark-all-todos-as-done');
    cardActionMarkAllToDosAsDone.registerRunListener(async (args: any) => {
      const { device } = args;
      try {
        await device.markTodosAsDone();
      } catch (err) {
        this.error(err);
      }
    });
  }

  async onPair(session: any) {
    session.setHandler(
      'validate_user_settings',
      async (data: {
        gitlab: string;
        token: string;
      }): Promise<{ credentialsAreValid: boolean; id?: number; name?: string }> => {
        const { gitlab, token } = data;
        let headers: any = { Authorization: `Bearer ${token}` };
        const response = await fetch(`${gitlab}/api/v4/user`, { headers });
        if (!response.ok) {
          this.log(`Response not ok: ${JSON.stringify(response)}`);
          return { credentialsAreValid: false };
        }
        const { id, name } = await response.json();
        return { credentialsAreValid: true, id, name };
      }
    );
  }
}

module.exports = GitLabUserDriver;
