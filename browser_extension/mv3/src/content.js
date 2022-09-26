$ = require("jquery");
const HelloSign = require("hellosign-embedded");
const {
  MARKED_SERVER_URL,
  HELLO_SIGN_KEY,
  HELLO_SIGN_CLIENTID,
} = require("./config");

const helloSignClient = new HelloSign({
  clientId: HELLO_SIGN_CLIENTID,
  debug: true,
  allowCancel: true,
  hideHeader: true,
});

$(function () {
  var lastelement;
  var lastcommand;
  let commands;
  let signatureRequests;
  var cursorpos;
  var saving = false;

  const extensionId = "notion-marked-button";
  const sidebarActiveClass = "marked-button-active";
  const signButtonClass = "notion-sign-button";
  const signFormId = "send-signature-form";
  const commandbutton = `<div id="${extensionId}">
        <img src="${chrome.runtime.getURL("assets/pen.svg")}"></div>`;
  //   const commandsidebar = `<div id="notion-marked-off-sidebar" class="notion-marked-sidebar-thing">
  //     <div class="notion-sidebar-head">
  //         <div class="notion-sidebar-title">Commands</div>
  //         <div class="notion-sidebar-button">Sign Document</div>
  //     </div><div class="notion-marked-sidebar-body"></div>`;
  const commandsidebar = `<div id="notion-marked-off-sidebar" class="notion-marked-sidebar-thing">
      <div class="notion-sidebar-head">
      <div class="notion-sidebar-title">Documents</div>
      <div class="${signButtonClass}">Sign Document</div>
  </div>
  <div id="notion-mark-sidebar-body" class="notion-command-sidebar-body"></div>`;

  function fixReact() {
    var s = document.createElement("script");
    s.src = chrome.runtime.getURL("force.js");
    s.onload = function () {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(s);
  }

  function injectContent() {
    fixReact();
    $("body").append(
      "<div id='tooltip-thing'>Sign a notion document.</div><div class='notion-marked-tooltip'>View Signatures</div>"
    );
    $.ajax({
      url: chrome.runtime.getURL("content.html"),
      success: function (data) {
        chrome.storage.sync.get(["commands"], function (result) {
          commands = result.commands;
        });
        $("body").append(data);
        $("body").append($(".notion-form-wrap"));

        waitForElm(".notion-topbar-share-menu").then(() => {
          $(".notion-topbar-share-menu").after(commandbutton);
        });

        const signatureForm = document.querySelector(`#${signFormId}`);
        signatureForm.addEventListener("submit", (e) => {
          e.preventDefault();
        });
      },
    });
  }

  function waitForElm(selector) {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }

      const observer = new MutationObserver((mutations) => {
        if (document.querySelector(selector)) {
          resolve(document.querySelector(selector));
          observer.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }

  function hideCommandTooltip() {
    $(".notion-marked-tooltip").removeClass("tooltip-show-me");
  }

  function toggleSidebar() {
    hideCommandTooltip();
    if ($(`#${extensionId}`).hasClass(sidebarActiveClass)) {
      console.log(sidebarActiveClass, "active");
      $(`#${extensionId}`).removeClass(sidebarActiveClass);
      // check if notion comments header is active
      if ($(".notion-update-sidebar-tab-comments-header").length) {
        $(".notion-topbar-comments-button").trigger("click");
        $(".notion-update-sidebar-tab-comments-header").parent().show();
      }
      if ($(".notion-update-sidebar-tab-updates-header").length) {
        $(".notion-topbar-updates-button").trigger("click");
        $(".notion-update-sidebar-tab-updates-header").parent().show();
      } else if ($("#notion-command-button").length) {
      }
      $(".notion-topbar-comments-button").removeClass("css-override");
      $(".notion-topbar-updates-button").removeClass("css-override");
    } else {
      console.log(sidebarActiveClass, "not active");
      if ($(".notion-update-sidebar").length) {
        $("div[class|='notion-update-sidebar-tab']").each((index) => {
          const element = $("div[class|='notion-update-sidebar-tab']")[index];
          console.log("element", element);
          if ($(element).length) {
            console.log("adding command sidebar");
            $(element).parent().after(commandsidebar);
            $(element).parent().hide();
          }
        });
        $("div[class|='notion-update-sidebar-tab']").addClass("css-override");
        $(".notion-sidebar-thing").hide();
        // if ($(".notion-update-sidebar-tab-comments-header").length) {
        //   $(".notion-update-sidebar-tab-comments-header")
        //     .parent()
        //     .after(commandsidebar);
        //   $(".notion-update-sidebar-tab-comments-header").parent().hide();
        // } else {
        //   $(".notion-update-sidebar-tab-updates-header")
        //     .parent()
        //     .after(commandsidebar);
        //   $(".notion-update-sidebar-tab-updates-header").parent().hide();
        // }
        // $(".notion-topbar-comments-button").addClass("css-override");
        // $(".notion-topbar-updates-button").addClass("css-override");
        $(`#${extensionId}`).addClass(sidebarActiveClass);
      } else {
        $(".notion-topbar-comments-button").trigger("click");
        $(".notion-topbar-comments-button").addClass("css-override");
        $(".notion-topbar-updates-button").addClass("css-override");
        $(`#${extensionId}`).addClass(sidebarActiveClass);
        window.setTimeout(function () {
          $(".notion-update-sidebar-tab-comments-header")
            .parent()
            .after(commandsidebar);
          $(".notion-update-sidebar-tab-comments-header").parent().hide();
        }, 50);
      }
    }
  }

  async function getSigningUrl(pageId, data) {
    let result;

    try {
      result = await $.ajax({
        type: "POST",
        url: `${MARKED_SERVER_URL}/markoff/${pageId}`,
        data,
        beforeSend: () => {
          $(".notion-form-spinner-wrap").show();
        },
      });

      return result;
    } catch (responseError) {
      const {
        responseJSON: { error },
      } = responseError;
      console.log(error);
      const errorParagraph = document.querySelector("#form-errors");
      errorParagraph.setHTML(error.message);
      $("#notion-form-errors").show();
    } finally {
      $(".notion-form-spinner-wrap").hide();
    }
  }

  async function sendSignatureRequest() {
    console.log("send signature request");
    const form = document.querySelector(`#${signFormId}`);
    const formData = new FormData(form);

    const data = {
      requesterName: formData.get("notion-form-requester-name"),
      requesterEmail: formData.get("notion-form-requester-email"),
      signerName: formData.get("notion-form-signer-name"),
      signerEmail: formData.get("notion-form-signer-email"),
      requesterMessage: formData.get("notion-form-requester-message"),
    };
    //if form is invalid
    if (form.checkValidity() === false) {
      $("#notion-form-errors").show();
      return false;
    }
    $("#notion-form-errors").hide();

    const currentPath = window.location.pathname;
    const notionPageId = currentPath.split("-").slice(-1)[0];
    const result = await getSigningUrl(notionPageId, data);
    console.log("getSigningUrl result", result);
    const { signingPdfUrl, signatureRequest } = result;
    //     {
    //     "unclaimed_draft": {
    //         "claim_url": "https://embedded.hellosign.com/prep-and-send/embedded-request?cached_params_token=9756dbc7c624b1c8127dc6a739c95ef3",
    //         "signing_redirect_url": null,
    //         "test_mode": true,
    //         "expires_at": 1664215990,
    //         "signature_request_id": "54d54d31d555f0b8f37d38896093214298856cdb",
    //         "requesting_redirect_url": null
    //     }
    // }
    hideSigningForm();
    signNotionPage(signingPdfUrl, signatureRequest);
    saveSignatureRequest(signatureRequest);
    showPopup();
  }

  function signNotionPage(signingPdfUrl, signatureRequest) {
    return helloSignClient.open(signingPdfUrl, {
      testMode: true,
      requestingEmail: signatureRequest.requester_email_address,
      skipDomainVerification: true,
    });
  }

  function saveSignatureRequest(signatureRequest) {
    chrome.storage.sync.get(["signatureRequests"], function (result) {
      if (typeof result === "undefined") {
        console.log("ERROR");
      } else {
        signatureRequests = result.signatureRequests.concat({
          id: signatureRequest.client_id,
          label: signatureRequest.title,
          ...signatureRequest,
        });
        chrome.storage.sync.set({
          signatureRequests: signatureRequests,
        });
        renderItems();
      }
    });
  }

  function renderItems() {
    $("#notion-mark-sidebar-body").html("");
    var gettingItem = chrome.storage.sync.get("signatureRequests");
    gettingItem.then((res) => {
      if (typeof res === "undefined") {
        console.log("ERROR");
      } else {
        res.signatureRequests.forEach(function (sigRequest) {
          renderCommandItem(sigRequest);
        });
      }
    });
  }

  function renderCommandItem(sigRequest) {
    const name = sigRequest.label;
    if (sigRequest.id == 0 || sigRequest.id == 1) {
      $(".notion-command-sidebar-body").append(
        `<div class='notion-command-sidebar-item' data-id='${sigRequest.id}'>
          <div class='notion-command-sidebar-item-info'>
            <div class='notion-command-sidebar-item-title'>${name}</div>
          </div>
        </div>`
      );
    } else {
      $(".notion-command-sidebar-body").append(
        `<div class='notion-command-sidebar-item' data-id='${sigRequest.id}'>
          <div class='notion-command-sidebar-item-info'>
            <div class='notion-command-sidebar-item-title'>${name}</div>
          </div>
          <div class='notion-command-sidebar-hover'><span>View</span></div>
        </div>`
      );
    }
  }

  function showSigningForm() {
    $("#signing-form-wrap").addClass("notion-show-form");
    const signatureForm = document.querySelector(`#${signFormId}`);
    signatureForm.reset();
    // $("#signing-form-wrap input").val("");
    // $("#signing-form-wrap textarea").val("");
    //$("#send-signature-btn").attr("data-edit", "false");
    $(".notion-form-error").removeClass("notion-form-error");
    $(".notion-form-body").scrollTop(0);
  }

  function hideSigningForm() {
    $("#signing-form-wrap").removeClass("notion-show-form");
  }

  function closePopup() {
    $("#notion-sign-popup").removeClass("notion-confirm-show");
  }

  function showPopup() {
    $("#notion-sign-popup").addClass("notion-confirm-show");
  }
  // setup buttons
  $(document).on("click", `#${extensionId}`, toggleSidebar);
  $(document).on("click", `.${signButtonClass}`, showSigningForm);
  $(document).on("click", "#notion-form-close", hideSigningForm);
  $(document).on("click", "#notion-popup-close", closePopup);
  $(document).on("click", "#send-signature-btn", sendSignatureRequest);
  $(document).on("click", ".notion-form-back", hideSigningForm);
  $(document).on("click", ".notion-form-cancel", hideSigningForm);

  //initialize extension
  injectContent();
});
