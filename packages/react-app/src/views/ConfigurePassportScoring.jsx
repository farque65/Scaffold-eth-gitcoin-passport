import React, { useState, useEffect } from "react";
import { Button, Input } from "antd";
import GitcoinLogo from "../assets/GitcoinLogoWhite.svg";
import { useContractReader } from "eth-hooks";

export default function ConfigurePassportScoring({
  defaultWeight,
  approvalThreshold,
  providerWeightMap,
  setDefaultWeight,
  setApprovalThreshold,
  setProviderWeightMap,
}) {
  const [newDefaultWeight, setNewDefaultWeight] = useState(defaultWeight);
  const [newApprovalThreshold, setNewApprovalThreshold] = useState(approvalThreshold);
  const [newProvider, setNewProvider] = useState("");
  const [newWeight, setNewWeight] = useState("");

  const clearNewEntry = () => {
    setNewWeight("");
    setNewProvider("");
  };

  return (
    <div className="p-10">
      <div className="border-2 pb-28 border-solid border-gray-600 mx-auto w-3/4 bg-blue-darkblue text-white p-10">
        <h2 className="text-white text-xl">Configure Passport Scoring</h2>
        <div className="mt-10 mb-4 flex items-center font-medium text-gray-900 md:mb-0">
          <img src={GitcoinLogo} alt="Gitcoin Logo White" />
          <span className="font-miriam-libre ml-3 text-4xl text-white">Settings</span>
        </div>
        <div className="mt-4 mb-4">
          <h4 className="text-white">Default Weight: {defaultWeight}</h4>
          <div className="text-xs text-white">Weight to use for any stamp not explicitly included in the mapping</div>
          <div style={{ margin: 8, maxWidth: "20em" }}>
            <Input onChange={e => setNewDefaultWeight(e.target.value)} value={newDefaultWeight} />
            <Button style={{ marginTop: 8 }} onClick={() => setDefaultWeight(parseFloat(newDefaultWeight))}>
              Set
            </Button>
          </div>
        </div>
        <div className="mt-4 mb-4">
          <h4 className="text-white">Approval Threshold: {approvalThreshold}</h4>
          <div className="text-xs text-white">Threshold of total stamp weight at which user is approved</div>
          <div style={{ margin: 8, maxWidth: "20em" }}>
            <Input onChange={e => setNewApprovalThreshold(e.target.value)} value={newApprovalThreshold} />
            <Button style={{ marginTop: 8 }} onClick={() => setApprovalThreshold(parseFloat(newApprovalThreshold))}>
              Set
            </Button>
          </div>
        </div>
        <div className="mt-4 mb-4">
          <h4 className="text-white">Provider Weight Map</h4>
          <div className="text-xs text-white">Explicitly configured weight for each stamp provider</div>
          <div style={{ margin: 8, maxWidth: "20em" }}>
            <>
              <table>
                {Object.keys(providerWeightMap).map(provider => (
                  <tr key={provider}>
                    <td>Provider: {provider}</td> <td className="pl-6">Weight: {providerWeightMap[provider]}</td>
                  </tr>
                ))}
              </table>
            </>
            <h5 className="text-white mt-4">Add New Provider Weight</h5>
            <div className="flex flex-row">
              <div className="pr-2 flex flex-row flex-nowrap">Provider:</div>
              <Input onChange={e => setNewProvider(e.target.value)} value={newProvider} />
            </div>
            <div className="flex flex-row mt-2">
              <div className="pr-2 flex flex-row flex-nowrap">Weight:</div>
              <Input onChange={e => setNewWeight(e.target.value)} value={newWeight} />
            </div>
            <Button
              style={{ marginTop: 8 }}
              onClick={() => {
                setProviderWeightMap(providerWeightMap => ({
                  ...providerWeightMap,
                  [newProvider]: parseFloat(newWeight),
                }));
                clearNewEntry();
              }}
            >
              Add New
            </Button>
            <br />
            <Button
              style={{ marginTop: 8 }}
              onClick={() => {
                setProviderWeightMap({});
                clearNewEntry();
              }}
            >
              Clear Map
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
