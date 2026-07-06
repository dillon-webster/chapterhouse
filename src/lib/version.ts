import packageJson from "../../package.json";

export function formatVersion(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}

export const APP_VERSION = formatVersion(packageJson.version);
