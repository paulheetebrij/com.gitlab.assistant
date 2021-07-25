/* eslint-disable */
import Homey from 'homey';
import fetch from 'node-fetch';
import { ProjectConnectRequest, ProjectConnectResponse, ProjectConnector } from './interfaces';
import { v4 as uuid } from 'uuid';

/**
 * @class
 * @extends Homey.Driver
 * @implements {ProjectConnector}
 */
class GitLabProjectDriver extends Homey.Driver implements ProjectConnector {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('GitLab Project driver has been initialized');

    this.registerTriggerPipelineStatusChanged();
    this.registerTriggerNewCommit();
    this.registerTriggerIssueClosed();
    this.registerTriggerIssueOpened();
    this.registerTriggerIssueChanged();
    this.registerActionAddProjectIssue();
    this.registerActionEnableProjectPoller();
    this.registerActionDisableProjectPoller();
  }

  private registerTriggerPipelineStatusChanged(): void {
    const cardTriggerPipelineStatusChanged = this.homey.flow.getDeviceTriggerCard(
      'project-pipeline-status-changed'
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
  }

  private registerTriggerNewCommit(): void {
    const cardTriggerNewCommit = this.homey.flow.getDeviceTriggerCard('project-new-commit');
    this.addListener('newCommit', (args) => {
      const { device, title, message, link, created_at } = args;
      return cardTriggerNewCommit.trigger(device, {
        title,
        message,
        updated: created_at,
        url: link
      });
    });
  }

  private registerTriggerIssueClosed(): void {
    const cardTriggerIssueClosed = this.homey.flow.getDeviceTriggerCard('project-my-issue-closed');
    this.addListener('myProjectIssueClosed', (args) => {
      const { device, iid, title, url, created } = args;
      return cardTriggerIssueClosed.trigger(device, {
        iid,
        title,
        url,
        created
      });
    });
  }

  private registerTriggerIssueOpened(): void {
    const cardTriggerIssueOpened = this.homey.flow.getDeviceTriggerCard('project-my-issue-created');
    this.addListener('myProjectIssueCreated', (args) => {
      const { device, iid, title, url, created } = args;
      return cardTriggerIssueOpened.trigger(device, {
        iid,
        title,
        url,
        created
      });
    });
  }

  private registerTriggerIssueChanged(): void {
    const cardTriggerIssueChanged = this.homey.flow.getDeviceTriggerCard(
      'project-my-issue-updated'
    );
    this.addListener('myProjectIssueUpdated', (args) => {
      const { device, iid, title, url, created } = args;
      return cardTriggerIssueChanged.trigger(device, {
        iid,
        title,
        url,
        created
      });
    });
  }

  private registerActionAddProjectIssue(): void {
    const cardActionAddProjectIssue = this.homey.flow.getActionCard('project-create-issue');
    cardActionAddProjectIssue.registerRunListener(async (args: any) => {
      const { device, title } = args;
      try {
        await device.addIssue(title);
      } catch (err) {
        this.error(err);
      }
    });
  }

  private registerActionEnableProjectPoller(): void {
    const cardActionEnableProjectPoller = this.homey.flow.getActionCard('enable-project-poller');
    cardActionEnableProjectPoller.registerRunListener(async (args: any) => {
      const { device } = args;
      try {
        await device.enablePoller();
      } catch (err) {
        this.error(err);
      }
    });
  }

  private registerActionDisableProjectPoller(): void {
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

  /**
   * Tests credentials and validity of project settings by api call.
   * @param {ProjectConnectRequest} data
   * @returns {ProjectConnectResponse}
   */
  public async connect(data: ProjectConnectRequest): Promise<ProjectConnectResponse> {
    try {
      this.log(`validate_project_settings: ${JSON.stringify(data)}`);
      const { gitlab, project, token } = data;
      let headers: any = { Authorization: `Bearer ${token}` };
      const response = await fetch(`${gitlab}/api/v4/projects/${project}`, { headers });
      if (!response.ok) {
        this.log(`Response not ok: ${JSON.stringify(response)}`);
        return { credentialsAreValid: false };
      }
      const currentProject: any = await response.json();
      return { credentialsAreValid: true, name: currentProject.name };
    } catch (error) {
      this.error(error);
      throw error;
    }
  }

  private setId(response: ProjectConnectResponse): ProjectConnectResponse {
    if (response.credentialsAreValid) {
      response.id = uuid();
    }
    return response;
  }

  private get appDefaults(): { instance: string; key: string } {
    const instance = this.homey.settings.get('instance');
    const key = this.homey.settings.get('key');
    return { instance, key };
  }

  async onPair(session: any) {
    session.setHandler('get_defaults', () => this.appDefaults);
    session.setHandler('validate_project_settings', async (args: any) =>
      this.setId(await this.connect(args))
    );
  }
}

module.exports = GitLabProjectDriver;
