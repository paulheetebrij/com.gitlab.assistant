/* eslint-disable */
import Homey from 'homey';
import fetch from 'node-fetch';
import { GroupConnectRequest, GroupConnector, GroupConnectResponse } from './interfaces';

/**
 * @class
 * @extends Homey.Driver
 * @implements {GroupConnector}
 */
class GitLabGroupDriver extends Homey.Driver implements GroupConnector {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('GitLab group has been initialized');

    const cardTriggerIssueClosed = this.homey.flow.getDeviceTriggerCard('group-my-issue-closed');
    const cardTriggerIssueOpened = this.homey.flow.getDeviceTriggerCard('group-my-issue-created');
    const cardTriggerIssueChanged = this.homey.flow.getDeviceTriggerCard('group-my-issue-updated');
    this.addListener('myGroupIssueClosed', async (args) => {
      const { device, iid, title, url, created } = args;
      return cardTriggerIssueClosed.trigger(device, {
        iid,
        title,
        created,
        url
      });
    });

    this.addListener('myGroupIssueCreated', async (args) => {
      const { device, iid, title, url, created } = args;
      return cardTriggerIssueOpened.trigger(device, {
        iid,
        title,
        created,
        url
      });
    });

    this.addListener('myGroupIssueUpdated', async (args) => {
      const { device, iid, title, url, created } = args;
      return cardTriggerIssueChanged.trigger(device, {
        iid,
        title,
        created,
        url
      });
    });

    const cardActionAddGroupIssue = this.homey.flow.getActionCard('group-create-issue');
    cardActionAddGroupIssue.registerRunListener(async (args: any) => {
      const { device, title } = args;
      try {
        await device.addIssue(title);
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionEnableGroupPoller = this.homey.flow.getActionCard('enable-group-poller');
    cardActionEnableGroupPoller.registerRunListener(async (args: any) => {
      const { device } = args;
      try {
        await device.enablePoller();
      } catch (err) {
        this.error(err);
      }
    });

    const cardActionDisableGroupPoller = this.homey.flow.getActionCard('disable-group-poller');
    cardActionDisableGroupPoller.registerRunListener(async (args: any) => {
      const { device } = args;
      try {
        await device.disablePoller();
      } catch (err) {
        this.error(err);
      }
    });
  }

  /**
   * Tests credentials and validity of group settings by api call.
   * @param {GroupConnectRequest} data
   * @returns {GroupConnectResponse}
   */
  public async connect(data: GroupConnectRequest): Promise<GroupConnectResponse> {
    try {
      const { gitlab, group, token } = data;
      let headers: any = { Authorization: `Bearer ${token}` };
      const response = await fetch(`${gitlab}/api/v4/groups/${group}`, { headers });
      if (!response.ok) {
        this.log(`Response not ok: ${JSON.stringify(response)}`);
        return { credentialsAreValid: false };
      }
      const currentGroup: any = await response.json();
      const id = `${group}`;
      return { credentialsAreValid: true, name: currentGroup.name, id };
    } catch (err) {
      this.log(JSON.stringify(err));
      this.error(err);
      throw err;
    }
  }

  /**
   * initialize connection defaults from app defaults.
   * set handler for pair dialog
   */
  async onPair(session: any) {
    session.setHandler('get_defaults', () => {
      const instance = this.homey.settings.get('instance');
      const key = this.homey.settings.get('key');
      return { instance, key };
    });
    session.setHandler('validate_group_settings', async (data: GroupConnectRequest) =>
      this.connect(data)
    );
  }
}

module.exports = GitLabGroupDriver;
