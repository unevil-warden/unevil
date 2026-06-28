import { getSettings } from '../shared/storage'

chrome.runtime.onInstalled.addListener(() => {
  console.log('[BetterAsk] Extension installed')
})

// Open options page on first install
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options/index.html') })
  }
})

// Relay improve/audit requests from content scripts (keeps API key off content script context)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_SETTINGS') {
    getSettings().then(sendResponse)
    return true
  }

  if (msg.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') })
    sendResponse({ ok: true })
    return true
  }

  return false
})
