import React, { useCallback, useContext, useEffect, useReducer } from "react";

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
// 1. Direct to passport creation if none exist
// 2. Add stamp creation (somewhat on hold)
// 3. x - Move to a top-level context and let this be sourced throughout app
// 4. Move weight and threshold setting to contract
// 5. Set weight and threshold in contract from the frontend
// 6. Simplify the form code so that it reads more like a spec of usePassport

const Passport = React.createContext({});

// By default, each provider contributes
// towards the score with a weight of 1
// Adjust here

// Default weight for any unlisted provider

// Minimum score to be considered "approved"

class ScoreComputer {
  constructor(providerWeightMap, defaultWeight, approvalThreshold) {
    this.providerWeightMap = providerWeightMap;
    this.defaultWeight = defaultWeight;
    this.approvalThreshold = approvalThreshold;
  }

  async compute(address, stamps) {
    const scorer = await this.loadScorer(stamps);

    const score = await scorer.getScore(address);

    const approved = score >= this.approvalThreshold;

    return { score, approved };
  }

  async loadScorer(stamps) {
    // Dynamically load @gitcoinco/passport-sdk-scorer
    // Required for WASM
    const PassportScorer = (await import("@gitcoinco/passport-sdk-scorer")).PassportScorer;
    const stampsArg = this.formatStampsArg(stamps);
    return new PassportScorer(stampsArg);
  }

  formatStampsArg(stamps) {
    return stamps.map(stamp => ({
      provider: stamp.provider,
      issuer: stamp.credential.issuer,
      score: this.providerWeightMap[stamp.provider] || this.defaultWeight,
    }));
  }
}

// This object and set of functions allow
// for consistent state management
const defaults = {
  busy: false,
  active: false,
  verified: false,
  score: 0,
  scored: false,
  approved: false,
  error: null,
};

function resetPassport() {
  return defaults;
}

function setPassport(data) {
  return { ...defaults, ...data };
}

function errorPassport(data) {
  console.log("usePassport error:", data);
  return { ...defaults, error: data };
}

// This is the central reducer for passport state
function updatePassport(state, action) {
  const { type, data } = action;

  switch (type) {
    case "reset":
      return resetPassport();
    case "activate":
      return setPassport({ ...state, ...data, busy: false, active: true });
    case "busy":
      return setPassport({ ...state, busy: true });
    case "error":
      return errorPassport(data);
    default:
      return errorPassport("Invalid passport update");
  }
}

// Main logic for the passport
// Intended to be used internally by the context,
// but can certainly be called directly to use
// outside of the context
function usePassportManager() {
  const [passport, dispatch] = useReducer(updatePassport, undefined, resetPassport);

  const read = useCallback(async address => {
    const reader = new PassportReader("https://ceramic.passport-iam.gitcoin.co", "1");
    const data = await reader.getPassport(address);
    console.log("Passport Data", data);
    dispatch({ type: "activate", data });
  }, []);

  const verify = useCallback(async address => {
    const PassportVerifier = (await import("@gitcoinco/passport-sdk-verifier")).PassportVerifier;
    const verifier = new PassportVerifier("https://ceramic.passport-iam.gitcoin.co", "1");

    const data = await verifier.verifyPassport(address);
    console.log("verify data", data);

    const failedStamps = data.stamps.filter(stamp => !stamp.verified);

    if (failedStamps.length)
      return dispatch({
        type: "error",
        data: "Failed to verify stamp(s): " + JSON.stringify(failedStamps),
      });
    else dispatch({ type: "activate", data: { verified: true, ...data } });

    return data;
  }, []);

  const score = useCallback(
    async (address, defaultWeight, approvalThreshold, providerWeightMap) => {
      if (!defaultWeight || !approvalThreshold)
        return dispatch({
          type: "error",
          data: "Passport scoring requires defaultWeight and approvalThreshold, and optionally a providerWeightMap of {providerName => weight}",
        });
      const data = await verify(address);
      const scoreComputer = new ScoreComputer(providerWeightMap, defaultWeight, approvalThreshold);
      const { score, approved } = await scoreComputer.compute(address, data.stamps);
      return dispatch({ type: "activate", data: { ...data, scored: true, verified: true, score, approved } });
    },
    [verify],
  );

  const activate = useCallback(
    async ({ address, mode, providerWeightMap, defaultWeight, approvalThreshold }) => {
      dispatch({ type: "busy" });
      if (!address) return dispatch({ type: "error", data: "Address required to interact with a passport" });

      let passportData;
      switch (mode) {
        case "read":
          passportData = await read(address);
          break;
        case "verify":
          passportData = await verify(address);
          break;
        case "score":
        default:
          passportData = await score(address, defaultWeight, approvalThreshold, providerWeightMap);
          break;
      }

      return passportData;
    },
    [read, verify, score],
  );

  const disconnect = useCallback(() => dispatch({ type: "reset" }), []);

  return { activate, disconnect, ...passport };
}

function PassportProvider({ children }) {
  const value = usePassportManager();

  return <Passport.Provider value={value}>{children}</Passport.Provider>;
}

const usePassport = () => useContext(Passport);

export { PassportProvider, usePassport, usePassportManager };
