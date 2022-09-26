const { AFTER_INSTALL_URL } = require("./config");
const afterInstallOrUpdate = (install = true) => {
  chrome.storage.sync.get(["commands"], function (result) {
    if (typeof result.commands === "undefined") {
      chrome.storage.sync.set({
        commands: [
          {
            id: 0,
            name: "/sign",
            label: "Sign on page",
            description: "Add a signature to a notion page.",
            image: chrome.runtime.getURL("assets/marked-off.svg"),
            content: "",
            type: "script",
            visibility: "Visible",
          },
        ],
        signatureRequests: [],
      });
    }
  });
  chrome.storage.sync.get(["idnum"], function (result) {
    if (typeof result.idnum === "undefined") {
      chrome.storage.sync.set({
        idnum: 2,
      });
    }
  });

  chrome.storage.sync.get(["signatureRequests"], function (result) {
    if (typeof result.signatureRequests === "undefined") {
      chrome.storage.sync.set({
        signatureRequests: [],
      });
    }
  });

  if (install === true) {
    chrome.tabs.create({
      url: AFTER_INSTALL_URL,
    });
  }
};
chrome.runtime.onInstalled.addListener(function (details) {
  switch (details.reason) {
    case "install":
      console.log("install");
      afterInstallOrUpdate();
      break;
    case "update":
      console.log("update");
      afterInstallOrUpdate(false);
      break;
    default:
      console.log("listener", details.reason);
  }
});
