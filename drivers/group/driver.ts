/* eslint-disable */
import Homey from 'homey';
import fetch from 'node-fetch';

class GitLabGroupDriver extends Homey.Driver {
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
  }

  async onPair(session: any) {
    session.setHandler(
      'validate_group_settings',
      async (data: {
        gitlab: string;
        group: string;
        token: string;
      }): Promise<{ credentialsAreValid: boolean; name?: string }> => {
        const { gitlab, group, token } = data;
        let headers: any = { Authorization: `Bearer ${token}` };
        const response = await fetch(`${gitlab}/api/v4/groups/${group}`, { headers });
        if (!response.ok) {
          this.log(`Response not ok: ${JSON.stringify(response)}`);
          return { credentialsAreValid: false };
        }
        const currentGroup: any = await response.json();
        return { credentialsAreValid: true, name: currentGroup.name };
      }
    );

    const cardActionAddGroupIssue = this.homey.flow.getActionCard('group-create-issue');
    cardActionAddGroupIssue.registerRunListener(async (args: any) => {
      const { device, title } = args;
      try {
        await device.addIssue(title);
      } catch (err) {
        this.error(err);
      }
    });
  }
}

module.exports = GitLabGroupDriver;
