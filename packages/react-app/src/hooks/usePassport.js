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
// 2. on hold - Add stamp creation
// 3. x - Move to a top-level context and let this be sourced throughout app
// 4. x - Make weight and threshold dynamic
// 5. x - Set weight and threshold from the frontend
// 6. Simplify the form code so that it reads more like a spec of usePassport

const Passport = React.createContext({});

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
  missing: false,
};

function resetPassport() {
  return defaults;
}

function setPassport(data) {
  return { ...defaults, ...data, error: null };
}

function errorPassport(message, extraData) {
  console.log("usePassport error:", message, extraData);
  if (extraData) console.log(extraData);
  return { ...defaults, ...(extraData || {}), error: message };
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
    case "missing":
      return errorPassport(data, { missing: true });
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
    dispatch({ type: "missing", data: "Unable to retrieve passport, you may need to create one" });

  const read = useCallback(async address => {
    const reader = new PassportReader("https://ceramic.passport-iam.gitcoin.co", "1");
    const data = await reader.getPassport(address);
    if (!data) return reportMissingPassport();
    console.log("Passport Data", data);
    dispatch({ type: "activate", data });

    return true;
  }, []);

  // These 2 modules must be dynamically loaded
  // Required for WASM
  const loadVerifier = useCallback(async () => {
    const PassportVerifier = (await import("@gitcoinco/passport-sdk-verifier")).PassportVerifier;
    return new PassportVerifier("https://ceramic.passport-iam.gitcoin.co", "1");
  }, []);

  const loadScorer = useCallback(async stamps => {
    const PassportScorer = (await import("@gitcoinco/passport-sdk-scorer")).PassportScorer;
    return new PassportScorer(stamps);
  }, []);

  const verify = useCallback(
    async address => {
      const verifier = await loadVerifier();
      const data = await verifier.verifyPassport(address);
      console.log("verify data", data);

      if (!data) return reportMissingPassport();

      const failedStamps = data.stamps.filter(stamp => !stamp.verified);

      if (failedStamps.length)
        return dispatch({
          type: "error",
          data: "Failed to verify stamp(s): " + JSON.stringify(failedStamps),
        });
      else dispatch({ type: "activate", data: { verified: "true", ...data } });
    },
    [loadVerifier],
  );

  const score = useCallback(
    async (address, acceptedStamps, approvalThreshold) => {
      if (!approvalThreshold || !(acceptedStamps && acceptedStamps.length))
        return dispatch({
          type: "error",
          data: "Passport scoring requires non-zero approvalThreshold and an array of stamps in format [{provider, issuer, score}]",
        });

      const scorer = await loadScorer(acceptedStamps);
      const score = await scorer.getScore(address);

      const approved = score >= approvalThreshold;

      dispatch({
        type: "activate",
        data: { verified: true, scored: true, score, approved },
      });

      return approved;
    },
    [loadScorer],
  );

  const setPendingStatus = useCallback(status => dispatch({ type: "pending", data: status }), []);

  const activate = useCallback(
    async ({ address, mode, acceptedStamps, approvalThreshold }) => {
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
          approved = await score(address, acceptedStamps, approvalThreshold);
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
