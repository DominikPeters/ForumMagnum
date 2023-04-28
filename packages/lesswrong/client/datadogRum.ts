import { datadogRum } from '@datadog/browser-rum';
import { getDatadogUser } from '../lib/collections/users/helpers';
import { forumTypeSetting } from '../lib/instanceSettings';
import { ddRumSampleRate, ddSessionReplaySampleRate, ddTracingSampleRate } from '../lib/publicSettings';
import { getCookiePreferences } from '../lib/cookies/utils';

let datadogInitialized = false;

export async function initDatadog() {
  const { cookiePreferences } = await getCookiePreferences();

  const analyticsCookiesAllowed = cookiePreferences.includes("analytics");

  if (forumTypeSetting.get() !== 'EAForum') return
  if (!analyticsCookiesAllowed) {
    // eslint-disable-next-line no-console
    console.warn("Not initializing datadog because analytics cookies are not allowed")
    return
  }
  // TODO remove
  console.log("Initializing datadog")

  datadogRum.init({
    applicationId: '2e902643-baff-466d-8882-db60acbdf13b',
    clientToken: 'puba413e9fd2759b4b17c1909d396ba122a',
    site: 'datadoghq.com',
    service:'eaforum-client',
    env: ddEnv,
    // version: '1.0.0',
    tracingSampleRate: ddTracingSampleRate.get(),
    sampleRate: ddRumSampleRate.get(),
    sessionReplaySampleRate: ddSessionReplaySampleRate.get(),
    trackInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel:'mask-user-input',
    allowedTracingOrigins: [
      "http://localhost:3000",
      "https://forum.effectivealtruism.org",
      "https://forum-staging.effectivealtruism.org"
      // TODO add LW domains here if they want to use datadog
    ]
  });
  datadogInitialized = true;
}

export function configureDatadogRum(user: UsersCurrent | UsersEdit | DbUser | null) {
  if (forumTypeSetting.get() !== 'EAForum' || !datadogInitialized) return

  // Set the user which will appear in traces
  datadogRum.setUser(user ? getDatadogUser(user) : {});

  if (user && !user.allowDatadogSessionReplay) {
    // eslint-disable-next-line no-console
    console.log("Session Replay disabled")
    datadogRum.stopSessionReplayRecording();
  } else {
    // eslint-disable-next-line no-console
    console.log("Session Replay enabled")
    datadogRum.startSessionReplayRecording();
  }
}

export default datadogRum;
