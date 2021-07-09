/* eslint-disable */
import Homey from 'homey';
import fetch from 'node-fetch';

class GitLabProjectDriver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('GitLab Project driver has been initialized');

    const cardTriggerPipelineStatusChanged = this.homey.flow.getDeviceTriggerCard(
      'project-pipeline-status-changed'
    );
    const cardTriggerNewCommit = this.homey.flow.getDeviceTriggerCard('project-new-commit');
    const cardTriggerIssueClosed = this.homey.flow.getDeviceTriggerCard('project-my-issue-closed');
    const cardTriggerIssueOpened = this.homey.flow.getDeviceTriggerCard('project-my-issue-created');
    const cardTriggerIssueChanged = this.homey.flow.getDeviceTriggerCard(
      'project-my-issue-updated'
    );

    this.addListener('newPipelineStatus', (args) => {
      const { device, ref, status, link, created_at, updated_at } = args;
      return cardTriggerPipelineStatusChanged.trigger(device, {
        ref,
        status,
        updated: updated_at > created_at ? updated_at : created_at,
        url: link
      });
    });

    this.addListener('newCommit', (args) => {
      const { device, title, message, link, created_at } = args;
      return cardTriggerNewCommit.trigger(device, {
        title,
        message,
        updated: created_at,
        url: link
      });
    });

    this.addListener('myProjectIssueClosed', (args) => {
      const { device, iid, title, url, created } = args;
      return cardTriggerIssueClosed.trigger(device, {
        iid,
        title,
        url,
        created
      });
    });

    this.addListener('myProjectIssueCreated', (args) => {
      const { device, iid, title, url, created } = args;
      return cardTriggerIssueOpened.trigger(device, {
        iid,
        title,
        url,
        created
      });
    });

    this.addListener('myProjectIssueUpdated', (args) => {
      const { device, iid, title, url, created } = args;
      return cardTriggerIssueChanged.trigger(device, {
        iid,
        title,
        url,
        created
      });
    });

    const cardActionAddProjectIssue = this.homey.flow.getActionCard('project-create-issue');
    cardActionAddProjectIssue.registerRunListener(async (args: any) => {
      const { device, title } = args;
      try {
        await device.addIssue(title);
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionEnableProjectPoller = this.homey.flow.getActionCard('enable-project-poller');
    cardActionEnableProjectPoller.registerRunListener(async (args: any) => {
      const { device } = args;
      try {
        await device.enablePoller();
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionDisableProjectPoller = this.homey.flow.getActionCard('disable-project-poller');
    cardActionDisableProjectPoller.registerRunListener(async (args: any) => {
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
      'validate_project_settings',
      async (data: {
        gitlab: string;
        project: string;
        token: string;
      }): Promise<{ credentialsAreValid: boolean; name?: string; id?: string }> => {
        try {
          const { gitlab, project, token } = data;
          let headers: any = { Authorization: `Bearer ${token}` };
          const response = await fetch(`${gitlab}/api/v4/projects/${project}`, { headers });
          if (!response.ok) {
            this.log(`Response not ok: ${JSON.stringify(response)}`);
            return { credentialsAreValid: false };
          }
          const currentProject: any = await response.json();
          const id = `${project}`;
          return { credentialsAreValid: true, name: currentProject.name, id };
        } catch (error) {
          this.error(error);
          throw error;
        }
      }
    );
  }
}

module.exports = GitLabProjectDriver;
