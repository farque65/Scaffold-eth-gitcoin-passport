import React, { useState } from "react";
import GitcoinLogo from "../assets/GitcoinLogoWhite.svg";
import usePassport from "../hooks/usePassport";

export default function SigninPassport({ address }) {
  const passport = usePassport(address);

  return (
    <div className="p-10">
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
        */}
      <div className="border-2 border-solid border-gray-600 mx-auto w-3/4 bg-blue-darkblue text-white p-10">
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
              onClick={() => passport.toggle()}
            >
              {passport.active && passport.enabled
                ? "Disconnect Wallet"
                : `Connect${passport.enabled ? "ing..." : " Wallet"}`}
            </button>
          )}
          {passport.active && (
            <>
              <br />
              <button
                data-testid="verifyPassportButton"
                className="rounded-sm rounded bg-purple-connectPurple py-2 px-10 text-white mt-4"
                onClick={() => passport && passport.verify()}
              >
                Verif
                {passport.verified ? "ied" : passport.doVerify ? "ing..." : "y"}
              </button>
            </>
          )}
        </div>

        {(passport.active || passport.error) && (
          <div className="border-2 p-10 mt-10">
            <h1 className="text-white text-3xl mb-0">
              Passport {passport.active ? "Data" : "Error"}
              {passport.verified && " \u2705"}
              {passport.error && " \u274c"}
            </h1>
            {passport.error && passport.error}
            {passport.active && (
              <>
                {passport?.expiryDate && (
                  <p className="mt-4">
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
