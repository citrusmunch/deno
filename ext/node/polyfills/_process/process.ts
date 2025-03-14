// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// Copyright Joyent, Inc. and Node.js contributors. All rights reserved. MIT license.

// TODO(petamoriken): enable prefer-primordials for node polyfills
// deno-lint-ignore-file prefer-primordials

// The following are all the process APIs that don't depend on the stream module
// They have to be split this way to prevent a circular dependency

const core = globalThis.Deno.core;
import { nextTick as _nextTick } from "ext:deno_node/_next_tick.ts";
import { _exiting } from "ext:deno_node/_process/exiting.ts";
import * as fs from "ext:deno_fs/30_fs.js";

/** Returns the operating system CPU architecture for which the Deno binary was compiled */
export function arch(): string {
  if (core.build.arch == "x86_64") {
    return "x64";
  } else if (core.build.arch == "aarch64") {
    return "arm64";
  } else {
    throw Error("unreachable");
  }
}

/** https://nodejs.org/api/process.html#process_process_chdir_directory */
export const chdir = fs.chdir;

/** https://nodejs.org/api/process.html#process_process_cwd */
export const cwd = fs.cwd;

/** https://nodejs.org/api/process.html#process_process_nexttick_callback_args */
export const nextTick = _nextTick;

/** Wrapper of Deno.env.get, which doesn't throw type error when
 * the env name has "=" or "\0" in it. */
function denoEnvGet(name: string) {
  const perm =
    Deno.permissions.querySync?.({ name: "env", variable: name }).state ??
      "granted"; // for Deno Deploy
  // Returns undefined if the env permission is unavailable
  if (perm !== "granted") {
    return undefined;
  }
  try {
    return Deno.env.get(name);
  } catch (e) {
    if (e instanceof TypeError) {
      return undefined;
    }
    throw e;
  }
}

const OBJECT_PROTO_PROP_NAMES = Object.getOwnPropertyNames(Object.prototype);
/**
 * https://nodejs.org/api/process.html#process_process_env
 * Requires env permissions
 */
export const env: InstanceType<ObjectConstructor> & Record<string, string> =
  new Proxy(Object(), {
    get: (target, prop) => {
      if (typeof prop === "symbol") {
        return target[prop];
      }

      const envValue = denoEnvGet(prop);

      if (envValue) {
        return envValue;
      }

      if (OBJECT_PROTO_PROP_NAMES.includes(prop)) {
        return target[prop];
      }

      return envValue;
    },
    ownKeys: () => Reflect.ownKeys(Deno.env.toObject()),
    getOwnPropertyDescriptor: (_target, name) => {
      const value = denoEnvGet(String(name));
      if (value) {
        return {
          enumerable: true,
          configurable: true,
          value,
        };
      }
    },
    set(_target, prop, value) {
      Deno.env.set(String(prop), String(value));
      return true; // success
    },
    has: (_target, prop) => typeof denoEnvGet(String(prop)) === "string",
  });

/**
 * https://nodejs.org/api/process.html#process_process_version
 *
 * This value is hard coded to latest stable release of Node, as
 * some packages are checking it for compatibility. Previously
 * it pointed to Deno version, but that led to incompability
 * with some packages.
 */
export const version = "v18.18.0";

/**
 * https://nodejs.org/api/process.html#process_process_versions
 *
 * This value is hard coded to latest stable release of Node, as
 * some packages are checking it for compatibility. Previously
 * it contained only output of `Deno.version`, but that led to incompability
 * with some packages. Value of `v8` field is still taken from `Deno.version`.
 */
export const versions = {
  node: "18.17.1",
  uv: "1.43.0",
  zlib: "1.2.11",
  brotli: "1.0.9",
  ares: "1.18.1",
  modules: "108",
  nghttp2: "1.47.0",
  napi: "8",
  llhttp: "6.0.10",
  openssl: "3.0.7+quic",
  cldr: "41.0",
  icu: "71.1",
  tz: "2022b",
  unicode: "14.0",
  ngtcp2: "0.8.1",
  nghttp3: "0.7.0",
  // Will be filled when calling "__bootstrapNodeProcess()",
  deno: "",
  v8: "",
  typescript: "",
};
