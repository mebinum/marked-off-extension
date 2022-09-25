$ = require("jquery");
const helloSignKey =
  "cdaa322c1a759e56dbecd070f097f4837259ac8ab93172aed3c254a91e51db1a";
const HelloSign = require("hellosign-embedded");
const helloSignClient = new HelloSign({
  clientId: "e8bef94dd5a2e23cf4e32bfd9de4fd4a",
  debug: true,
  allowCancel: true,
  hideHeader: true,
});

$(function () {
  var lastelement;
  var lastcommand;
  var cursorpos;
  var saving = false;

  const extensionId = "notion-marked-button";
  const sidebarActiveClass = "marked-button-active";
  const signButtonClass = "notion-sign-button";
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
  <div class="notion-command-sidebar-body"></div>`;

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

  function sendSignatureRequest() {
    console.log("send signature request");
  }

  function signNotionPage({ requestingEmail }) {
    helloSignClient.open(
      "https://app.hellosign.com/editor/embeddedSign?signature_id=2f08917d63f6aaf7841a281a3f276015&token=9ab556762baaae7bea5697d7f91ac25c",
      {
        testMode: true,
        requestingEmail,
        skipDomainVerification: true,
      }
    );
  }

  function showSigningForm() {
    console.log("start signDocument");
    $("#signing-form-wrap").addClass("notion-show-form");
    $("#signing-form-wrap input").val("");
    $("#signing-form-wrap textarea").val("");
    $("#send-signature-btn").attr("data-edit", "false");
    $(".notion-form-error").removeClass("notion-form-error");
    $(".notion-form-body").scrollTop(0);
  }

  function hideSigningForm() {
    $("#signing-form-wrap").removeClass("notion-show-form");
  }

  // setup buttons
  $(document).on("click", `#${extensionId}`, toggleSidebar);
  $(document).on("click", `.${signButtonClass}`, showSigningForm);
  $(document).on("click", "#notion-form-close", hideSigningForm);
  $(document).on("click", "#send-signature-btn", sendSignatureRequest);

  //initialize extension
  injectContent();
});
