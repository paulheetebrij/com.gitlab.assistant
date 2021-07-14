/* eslint-disable node/no-unsupported-features/es-syntax */
export interface ProjectConnection {
  gitlab: string;
  token: string;
  project: number;
}

export interface ProjectConnector {
  connect(
    data: ProjectConnection
  ): Promise<{ credentialsAreValid: boolean; name?: string; id?: string }>;
}
