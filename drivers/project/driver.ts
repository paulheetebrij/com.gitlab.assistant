/* eslint-disable */
import Homey from 'homey';
import fetch from 'node-fetch';

interface IGitLabProject {
  id: string;
  description: string;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  created_at: string;
  default_branch: string;
  _links: {
    self: string;
    issues: string;
    merge_requests: string;
    repo_branches: string;
    labels: string;
    events: string;
    members: string;
  };
}
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
        await this.homey.flow.getDeviceTriggerCard('pipeline-status-changed').trigger(device, {
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
        await this.homey.flow.getDeviceTriggerCard('new-project-commit').trigger(device, {
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
        const { device, iid, title, link, created_at } = args;
        this.log(
          `Project issue closed ${JSON.stringify({
            iid,
            title,
            link,
            created_at
          })}`
        );
        await this.homey.flow.getDeviceTriggerCard('project-issue-closed').trigger(device, {
          iid,
          title,
          created: created_at,
          url: link
        });
      } catch (err) {
        this.error(err);
      }
    });

    this.addListener('project_issue_created', async (args) => {
      try {
        const { device, iid, title, link, created_at } = args;
        this.log(
          `Project issue created ${JSON.stringify({
            iid,
            title,
            link,
            created_at
          })}`
        );
        await this.homey.flow.getDeviceTriggerCard('project-issue-created').trigger(device, {
          iid,
          title,
          created: created_at,
          url: link
        });
      } catch (err) {
        this.error(err);
      }
    });

    this.addListener('project_issue_updated', async (args) => {
      try {
        const { device, iid, title, link, created_at } = args;
        this.log(
          `Project issue updated ${JSON.stringify({
            iid,
            title,
            link,
            created_at
          })}`
        );
        await this.homey.flow.getDeviceTriggerCard('project-issue-updated').trigger(device, {
          iid,
          title,
          created: created_at,
          url: link
        });
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionAddProjectIssue = this.homey.flow.getActionCard('add-project-issue');
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
