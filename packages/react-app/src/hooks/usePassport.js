import { useEffect, useReducer } from "react";

// -- passport modules
import { PassportReader } from "@gitcoinco/passport-sdk-reader";
/*
  Explore Passport SDKs on npm
  https://github.com/gitcoinco/passport-sdk
  - @gitcoinco/passport-sdk-reader
  - @gitcoinco/passport-sdk-scorer
  - @gitcoinco/passport-sdk-verifier
  - @gitcoinco/passport-sdk-writer
*/

// TODO
// 1. Direct to passport if none exist yet
// 2. Add stamp creation
// 3. Move to a top-level context and let this be sourced throughout app

const defaults = {
  enabled: false,
  active: false,
  verified: false,
  verifier: undefined,
  doVerify: undefined,
};

function resetPassport() {
  return defaults;
}

function setPassport(data) {
  return { ...defaults, ...data };
}

function errorPassport(data) {
  return { ...defaults, error: data };
}

function updatePassport(state, action) {
  const { type, data, verifier } = action;
  switch (type) {
    case "reset":
      return resetPassport();
    case "enable":
      return setPassport({ ...state, enabled: true });
    case "disable":
      return setPassport({ ...state, enabled: false });
    case "toggle":
      return setPassport({ ...state, enabled: !state.enabled });
    case "update":
      return setPassport({ ...state, ...data, active: true });
    case "setVerifier":
      return setPassport({ ...state, verifier });
    case "initVerify":
      return setPassport({ ...state, doVerify: true });
    case "verify":
      return setPassport({ ...state, ...data, verified: true });
    case "error":
      return errorPassport(data);
    default:
      return errorPassport("Invalid passport update");
  }
}

export default function usePassport(address) {
  const [passport, dispatch] = useReducer(updatePassport, undefined, resetPassport);
  const { doVerify, verifier, enabled } = passport;

  const enable = () => dispatch({ type: "enable" });
  const disable = () => dispatch({ type: "disable" });
  const toggle = () => dispatch({ type: "toggle" });
  const verify = () => dispatch({ type: "initVerify" });

  useEffect(() => {
    const initVerifier = async () => {
      if (doVerify) {
        // Dynamically load @gitcoinco/passport-sdk-verifier
        // Required for WASM
        const PassportVerifier = (await import("@gitcoinco/passport-sdk-verifier")).PassportVerifier;
        dispatch({
          type: "setVerifier",
          verifier: new PassportVerifier("https://ceramic.passport-iam.gitcoin.co", "1"),
        });
      }
    };

    initVerifier();
  }, [doVerify]);

  useEffect(() => {
    const verifyPassport = async () => {
      if (verifier && address && enabled && doVerify) {
        const data = await verifier.verifyPassport(address);
        console.log("verify data", data);

        const failedStamps = data.stamps.filter(stamp => !stamp.verified);

        if (failedStamps.length)
          dispatch({
            type: "error",
            data: "Failed to verify stamp(s): " + JSON.stringify(failedStamps),
          });
        else dispatch({ type: "verify", data });
      }
    };

    verifyPassport();
  }, [verifier, address, enabled, doVerify]);

  useEffect(() => {
    const connectOrDisconnect = async () => {
      if (address && enabled) {
        const reader = new PassportReader("https://ceramic.passport-iam.gitcoin.co", "1");
        const data = await reader.getPassport(address);
        console.log("Passport Data", data);
        dispatch({ type: "update", data });
      } else {
        dispatch({ type: "reset" });
      }
    };

    connectOrDisconnect();
  }, [address, enabled]);

  return { verify, enable, disable, toggle, ...passport };
}
