/* eslint-disable node/no-unsupported-features/es-syntax */
export interface UserConnection {
  gitlab: string;
  token: string;
}

export interface UserConnector {
  connect(data: UserConnection): Promise<{
    credentialsAreValid: boolean;
    userId?: number;
    name?: string;
    id?: string;
  }>;
}
