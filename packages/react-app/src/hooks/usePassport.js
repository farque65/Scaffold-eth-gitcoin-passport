import React, { useCallback, useContext, useReducer } from "react";

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
  active: false,
  pending: null,
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
      return setPassport({ ...state, ...data, pending: null, active: true });
    case "pending":
      return setPassport({ ...state, pending: data });
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

  const reportMissingPassport = () =>
    dispatch({ type: "error", data: "Unable to retrieve passport, you may need to create one" });

  const read = useCallback(async address => {
    const reader = new PassportReader("https://ceramic.passport-iam.gitcoin.co", "1");
    const data = await reader.getPassport(address);
    if (!data) return reportMissingPassport();
    console.log("Passport Data", data);
    dispatch({ type: "activate", data });

    return true;
  }, []);

  const getVerificationData = useCallback(async address => {
    const PassportVerifier = (await import("@gitcoinco/passport-sdk-verifier")).PassportVerifier;
    const verifier = new PassportVerifier("https://ceramic.passport-iam.gitcoin.co", "1");

    const data = await verifier.verifyPassport(address);
    console.log("verify data", data);

    return data;
  }, []);

  const getFailedStampsFromData = data => data.stamps.filter(stamp => !stamp.verified);

  const reportFailedStamps = useCallback(failedStamps => {
    dispatch({
      type: "error",
      data: "Failed to verify stamp(s): " + JSON.stringify(failedStamps),
    });
  }, []);

  const verify = useCallback(
    async address => {
      const data = await getVerificationData(address);
      if (!data) return reportMissingPassport();

      const failedStamps = getFailedStampsFromData(data);

      if (failedStamps.length) return reportFailedStamps(failedStamps);
      else dispatch({ type: "activate", data: { verified: "true", ...data } });
    },
    [getVerificationData, reportFailedStamps],
  );

  const score = useCallback(
    async (address, defaultWeight, approvalThreshold, providerWeightMap) => {
      if (!defaultWeight || !approvalThreshold)
        return dispatch({
          type: "error",
          data: "Passport scoring requires defaultWeight and approvalThreshold, and optionally a providerWeightMap of {providerName => weight}",
        });

      const data = await getVerificationData(address);
      if (!data) return reportMissingPassport();

      const failedStamps = getFailedStampsFromData(data);

      if (failedStamps.length) return reportFailedStamps(failedStamps);

      const scoreComputer = new ScoreComputer(providerWeightMap, defaultWeight, approvalThreshold);
      const { score, approved } = await scoreComputer.compute(address, data.stamps);
      dispatch({
        type: "activate",
        data: { ...data, verified: true, scored: true, score, approved },
      });

      return approved;
    },
    [getVerificationData, reportFailedStamps],
  );

  const setPendingStatus = useCallback(status => dispatch({ type: "pending", data: status }), []);

  const activate = useCallback(
    async ({ address, mode, providerWeightMap, defaultWeight, approvalThreshold }) => {
      if (!address) return dispatch({ type: "error", data: "Address required to interact with a passport" });

      let approved = false;
      switch (mode) {
        case "read":
          setPendingStatus("read");
          await read(address);
          break;
        case "verify":
          setPendingStatus("verify");
          await verify(address);
          break;
        case "score":
        default:
          setPendingStatus("score");
          approved = await score(address, defaultWeight, approvalThreshold, providerWeightMap);
          break;
      }

      return approved;
    },
    [read, verify, score, setPendingStatus],
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
