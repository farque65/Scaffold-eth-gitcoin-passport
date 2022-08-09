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
// 1. Direct to passport creation if none exist
// 2. Add stamp creation
// 3. Move to a top-level context and let this be sourced throughout app
// 4. Move weight and threshold setting to contract
// 5. Set weight and threshold in contract from the frontend
// 6. Simplify the form code so that it reads more like a spec of usePassport

// By default, each provider contributes
// towards the score with a weight of 1
// Adjust here
const providerWeight = {
  Twitter: 1.5,
  Github: 0.8,
  Ens: 1.2,
  Discord: 0.3,
};

// Default weight for any unlisted provider
const defaultWeight = 1;

// Minimum score to be considered "approved"
const approvalThreshold = 3;

class ScoreComputer {
  async compute(address, stamps) {
    const scorer = await this.loadScorer(stamps);

    const score = await scorer.getScore(address);

    const approved = score >= approvalThreshold;

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
      score: providerWeight[stamp.provider] || defaultWeight,
    }));
  }
}

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

function updatePassport(state, action) {
  const { type, data, verifier, ScorerClass } = action;

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
    case "verify":
      return setPassport({ ...state, ...data, verified: true });
    case "initScore":
      return setPassport({ ...state, doScore: true });
    case "error":
      return errorPassport(data);
    default:
      return errorPassport("Invalid passport update");
  }
}

export default function usePassport(address) {
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
        const { score, approved } = await new ScoreComputer().compute(address, stamps);
        dispatch({ type: "update", data: { doScore: false, verified: true, scored: true, score, approved } });
      }
    };

    scorePassport();
  }, [address, stamps, doScore]);

  return { initVerify, initScore, enable, disable, toggle, ...passport };
}
