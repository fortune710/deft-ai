/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as contentAnalytics from "../contentAnalytics.js";
import type * as contentItems from "../contentItems.js";
import type * as contentProgress from "../contentProgress.js";
import type * as customObjects from "../customObjects.js";
import type * as fileStorage from "../fileStorage.js";
import type * as langgraphCheckpoints from "../langgraphCheckpoints.js";
import type * as scriptChatAttachments from "../scriptChatAttachments.js";
import type * as scriptChats from "../scriptChats.js";
import type * as triggerWorkers from "../triggerWorkers.js";
import type * as userContentProfiles from "../userContentProfiles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  contentAnalytics: typeof contentAnalytics;
  contentItems: typeof contentItems;
  contentProgress: typeof contentProgress;
  customObjects: typeof customObjects;
  fileStorage: typeof fileStorage;
  langgraphCheckpoints: typeof langgraphCheckpoints;
  scriptChatAttachments: typeof scriptChatAttachments;
  scriptChats: typeof scriptChats;
  triggerWorkers: typeof triggerWorkers;
  userContentProfiles: typeof userContentProfiles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
