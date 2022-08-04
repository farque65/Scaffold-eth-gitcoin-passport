import React, { useState } from "react";
import GitcoinLogo from "../assets/GitcoinLogoWhite.svg";
import usePassport from "../hooks/usePassport";

export default function SigninPassport({ address }) {
  const [passportEnabled, setPassportEnabled] = useState(false);
  const passport = usePassport(address, passportEnabled);

  return (
    <div className="p-10">
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div className="border-2 border-solid border-gray-600 mx-auto w-1/2 bg-blue-darkblue text-white p-10">
        <h2 className="text-white text-xl">Sign in with Passport</h2>
        <div className="mt-10 mb-4 flex items-center font-medium text-gray-900 md:mb-0">
          <img src={GitcoinLogo} alt="Gitcoin Logo White" />
          <span className="font-miriam-libre ml-3 text-4xl text-white">Passport</span>
        </div>
        <div className="mt-4 mb-4">
          {address && (
            <button
              data-testid="connectWalletButton"
              className="rounded-sm rounded bg-purple-connectPurple py-2 px-10 text-white"
              onClick={() => setPassportEnabled(!passportEnabled)}
            >
              {passport.active ? "Disconnect Wallet" : `Connect${passportEnabled ? "ing..." : " Wallet"}`}
            </button>
          )}
        </div>

        {passport.active && (
          <div className="border-2 p-10 mt-20">
            <h1 className="text-white text-3xl">Passport Data</h1>
            {passport?.expiryDate && (
              <p>
                Expiry Date:{" "}
                {
                  // @ts-ignore
                  passport?.expiryDate
                }
              </p>
            )}
            {passport?.issuanceDate && (
              <p>
                Issuance Date:{" "}
                {
                  // @ts-ignore
                  passport?.issuanceDate
                }
              </p>
            )}

            {passport?.stamps?.length > 0 && (
              <div>
                Stamps:{" "}
                <ul className="list-disc ml-10">
                  {
                    // @ts-ignore
                    passport?.stamps?.map(item => {
                      return (
                        <li key={item.provider} className="text-white">
                          {item.provider}
                        </li>
                      );
                    })
                  }
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
