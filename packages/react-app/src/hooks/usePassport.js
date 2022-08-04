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

function resetPassport() {
  return { active: false };
}

function updatePassport(state, action) {
  const { type, data } = action;
  switch (type) {
    case "disconnect":
      return resetPassport();
    case "connect":
      return { active: true, ...data };
    default:
      throw new Error("Invalid passport update");
  }
}

export default function usePassport(address, enabled) {
  const [properties, dispatch] = useReducer(updatePassport, undefined, resetPassport);

  useEffect(
    () =>
      (async () => {
        if (address && enabled) {
          const reader = new PassportReader("https://ceramic.passport-iam.gitcoin.co", "1");
          const data = await reader.getPassport(address);
          console.log("Passport Data", data);
          dispatch({ type: "connect", data });
        } else {
          dispatch({ type: "disconnect" });
        }
      })(),
    [address, enabled],
  );

  return { ...properties };
}
