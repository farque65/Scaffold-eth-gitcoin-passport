import React, { useContext, useEffect, useReducer } from "react";

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
  enabled: false,
  active: false,
  verified: false,
  doVerify: false,
  doScore: false,
  score: 0,
  scored: null,
  approved: false,
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

// This is the central reducer for passport state
function updatePassport(state, action) {
  const { type, data } = action;

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
      return setPassport({ ...state, ...data, enabled: true, active: true });
    case "initVerify":
      return setPassport({ ...state, doVerify: true });
    case "initScore":
      return setPassport({ ...state, doScore: true });
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
function usePassportInternal(address, scoreComputer) {
  const [passport, dispatch] = useReducer(updatePassport, undefined, resetPassport);
  const { doVerify, enabled, doScore, stamps } = passport;

  const enable = () => dispatch({ type: "enable" });
  const disable = () => dispatch({ type: "disable" });
  const toggle = () => dispatch({ type: "toggle" });
  const initVerify = () => dispatch({ type: "initVerify" });
  const initScore = () => dispatch({ type: "initScore" });

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

  useEffect(() => {
    const verifyPassport = async () => {
      if (doVerify) {
        const PassportVerifier = (await import("@gitcoinco/passport-sdk-verifier")).PassportVerifier;
        const verifier = new PassportVerifier("https://ceramic.passport-iam.gitcoin.co", "1");

        const data = await verifier.verifyPassport(address);
        console.log("verify data", data);

        const failedStamps = data.stamps.filter(stamp => !stamp.verified);

        if (failedStamps.length)
          dispatch({
            type: "error",
            data: "Failed to verify stamp(s): " + JSON.stringify(failedStamps),
          });
        else dispatch({ type: "update", data: { verified: true, ...data } });
      }
    };

    verifyPassport();
  }, [address, doVerify]);

  useEffect(() => {
    const scorePassport = async () => {
      if (doScore) {
        if (!stamps) return console.log("Must enable or verify before scoring");
        const { score, approved } = await scoreComputer.compute(address, stamps);
        dispatch({ type: "update", data: { doScore: false, verified: true, scored: true, score, approved } });
      }
    };

    scorePassport();
  }, [address, stamps, doScore, scoreComputer]);

  return { initVerify, initScore, enable, disable, toggle, ...passport };
}

function PassportProvider({ address, providerWeightMap, defaultWeight, approvalThreshold, children }) {
  const scoreComputer = new ScoreComputer(providerWeightMap, defaultWeight, approvalThreshold);
  const value = usePassportInternal(address, scoreComputer);

  return <Passport.Provider value={value}>{children}</Passport.Provider>;
}

const usePassport = () => useContext(Passport);

export { PassportProvider, usePassport, usePassportInternal, ScoreComputer };
