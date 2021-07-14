/* eslint-disable node/no-unsupported-features/es-syntax */
export interface GroupConnection {
  gitlab: string;
  token: string;
  group: number;
}

export interface GroupConnector {
  connect(
    data: GroupConnection
  ): Promise<{ credentialsAreValid: boolean; name?: string; id?: string }>;
}
