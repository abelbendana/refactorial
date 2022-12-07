// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {urlContains: 'app.factorialhr.com/attendance/clock-in'},
      })],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});

// chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
//   if(changeInfo.status == 'complete'){
//     if(tab.url.indexOf("app.factorialhr.com/attendance/clock-in?doPost=1") != -1){
//       main(1, tab);
//     }
//   }
// })
