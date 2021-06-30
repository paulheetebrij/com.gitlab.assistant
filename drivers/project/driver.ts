/* eslint-disable */
import Homey from 'homey';
import fetch from 'node-fetch';

class GitLabProjectDriver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.addListener('new_pipeline_status', async (args) => {
      try {
        const { device, id, project_id, project, ref, status, link, created_at, updated_at } = args;
        this.log(
          `New pipeline status ${JSON.stringify({
            id,
            project_id,
            project,
            ref,
            status,
            link,
            created_at,
            updated_at
          })}`
        );
        await this.homey.flow
          .getDeviceTriggerCard('project-pipeline-status-changed')
          .trigger(device, {
            ref,
            status,
            updated: updated_at > created_at ? updated_at : created_at,
            url: link
          });
      } catch (err) {
        this.error(err);
      }
    });

    this.addListener('new_commit', async (args) => {
      try {
        const { device, id, title, message, link, created_at } = args;
        this.log(
          `New commit ${JSON.stringify({
            id,
            title,
            message,
            link,
            created_at
          })}`
        );
        await this.homey.flow.getDeviceTriggerCard('project-new-commit').trigger(device, {
          title,
          message,
          updated: created_at,
          url: link
        });
      } catch (err) {
        this.error(err);
      }
    });

    this.addListener('project_issue_closed', async (args) => {
      try {
        const { device, iid, title, url, created } = args;
        this.log(
          `Project issue closed ${JSON.stringify({
            iid,
            title,
            url,
            created
          })}`
        );
        await this.homey.flow.getDeviceTriggerCard('project-my-issue-closed').trigger(device, {
          iid,
          title,
          url,
          created
        });
      } catch (err) {
        this.error(err);
      }
    });

    this.addListener('project_issue_created', async (args) => {
      try {
        const { device, iid, title, url, created } = args;
        this.log(
          `Project issue created ${JSON.stringify({
            iid,
            title,
            url,
            created
          })}`
        );
        await this.homey.flow.getDeviceTriggerCard('project-my-issue-created').trigger(device, {
          iid,
          title,
          url,
          created
        });
      } catch (err) {
        this.error(err);
      }
    });

    this.addListener('project_issue_updated', async (args) => {
      try {
        const { device, iid, title, url, created } = args;
        this.log(
          `Project issue updated ${JSON.stringify({
            iid,
            title,
            url,
            created
          })}`
        );
        await this.homey.flow.getDeviceTriggerCard('project-my-issue-updated').trigger(device, {
          iid,
          title,
          url,
          created
        });
      } catch (err) {
        this.error(err);
      }
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

    this.log('GitLab Project driver has been initialized');
  }

  async onPair(session: any) {
    session.setHandler(
      'validate_project_settings',
      async (data: {
        gitlab: string;
        project: string;
        token: string;
      }): Promise<{ credentialsAreValid: boolean; name?: string }> => {
        const { gitlab, project, token } = data;
        let headers: any = { Authorization: `Bearer ${token}` };
        const response = await fetch(`${gitlab}/api/v4/projects/${project}`, { headers });
        if (!response.ok) {
          this.log(`Response not ok: ${JSON.stringify(response)}`);
          return { credentialsAreValid: false };
        }
        const currentProject: any = await response.json();
        return { credentialsAreValid: true, name: currentProject.name };
      }
    );
  }
}

module.exports = GitLabProjectDriver;
