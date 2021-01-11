/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { randomBytes } from "crypto";

import type { BaseApiConfig } from "./api-config";
import type { Context } from "./context";
import { decode, encode } from "./encode-decode";
import { Fatal } from "./error";
import { executeRequest } from "./execute";
import { has } from "./utils";

export function apiTestWrapper<T extends BaseApiConfig>(api: T): T {
  const wrappedApi = new (api.constructor as any)();

  for (const functionName of Object.keys(api.astJson.functionTable)) {
    wrappedApi.fn[functionName] = async (ctx: Partial<Context>, args: any) => {
      const encodedArgs = encode(api.astJson.typeTable, `fn.${functionName}.args`, (api.astJson.functionTable as any)[functionName].args, args);

      ctx.request = {
        args: encodedArgs,
        deviceInfo: ctx.request?.deviceInfo ?? {
          fingerprint: null,
          id: randomBytes(16).toString("hex"),
          language: null,
          platform: null,
          timezone: null,
          type: "test",
          version: null,
        },
        extra: ctx.request?.extra ?? {},
        files: ctx.request?.files ?? [],
        headers: ctx.request?.headers ?? {},
        id: ctx.request?.id ?? randomBytes(16).toString("hex"),
        ip: ctx.request?.ip ?? "0.0.0.0",
        name: functionName,
        version: 3,
      };

      const reply = await executeRequest(ctx as Context, api);

      if (reply.error) {
        throw reply.error;
      } else {
        const decodedRet = decode(
          api.astJson.typeTable,
          `fn.${functionName}.ret`,
          (api.astJson.functionTable as any)[functionName].ret,
          JSON.parse(JSON.stringify(reply.result)),
        );

        return decodedRet;
      }
    };
  }

  return wrappedApi;
}
