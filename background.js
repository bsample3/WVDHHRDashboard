const DHHR_COVID_URL = "https://dhhr.wv.gov/COVID-19/Pages/default.aspx";
const BI_DASHBOARD_URL = "https://app.powerbigov.us/"
const imageFormat = {
	SVG: "svg",
	PNG: "png",
	JPG: "jpg",
	BMP: "bmp"
}
var dashTabId;
var options = {
	autorun: false,
	county: true,
	tests: true,
	cases: true,
	cumulativePercentPositivity: true,
	cumulativeCases: true,
	alert_map: false,
	alert_map_format: imageFormat.PNG,
	casesGraph: false,
	casesGraphFormat: imageFormat.PNG,
	recoveredCasesGraph: false,
	recoveredCasesGraphFormat: imageFormat.PNG,
	dailyPercentPositiveGraph: false,
	dailyPercentPositiveGraphFormat: imageFormat.PNG,
	cumulativePercentPositivityGraph: false,
	cumulativePercentPositivityGraphFormat: imageFormat.PNG,
	status: "stopped"
};
// Set the default plugin options when installed.
chrome.runtime.onInstalled.addListener(() => {
	setOptions(options);
});
// Set the options when starting up.
chrome.runtime.onStartup.addListener(() => {
	getOptions((o) => {
		o.options.status = "stopped";
		setOptions(o.options);
	});
});
// Listen for command or status messages from the popup or content page.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.log("message received: " + request.action);
	// Command to Run received
	if (request.action == "run") {
		action.run();
	} else if (request.action == "updateIcon") {
		action.updateIcon();
	}
});
let action = {
	run: () => {
		setStatus("launching");
		let dashTab, dhhrTab;
		chrome.tabs.query({}, (tabs) => {
			dashTab = tabs.find(tab => tab.url.startsWith(BI_DASHBOARD_URL))
			dhhrTab = tabs.find(tab => tab.url === DHHR_COVID_URL)
			if (dashTab) {
				dashTabId = dashTab.id;
				setTimeout(() => {
					if (!dashTab.active) {
						chrome.tabs.update(dashTab.id, {
							active: true
						}, () => {
							ProcessDashboard(dashTab);
						});
					} else {
						ProcessDashboard(dashTab);
					}
					pollTabs();
				}, 3000);
			} else if (dhhrTab) {
				dhhrTabId = dhhrTab.id;
				LaunchDashboard(dhhrTab);
				setTimeout(() => {
					action.run();
				}, 2000);
			} else {
				LaunchDhhr();
				setTimeout(() => {
					action.run();
				}, 2000);
			}
		});
	},
	updateIcon: () => {
		getOptions((o) => {
			if (o.options.status == "running" || o.options.status == "launching") {
				chrome.browserAction.setIcon({
					path: "/logo-running128.png"
				});
			} else if (o.options.status == "stopped" && o.options.autorun) {
				chrome.browserAction.setIcon({
					path: "/logo-autorun128.png"
				});
			} else {
				chrome.browserAction.setIcon({
					path: "/logo128.png"
				});
			}
		});
	}
}
// Open the DHHR page.
function LaunchDhhr() {
	chrome.tabs.create({
		url: DHHR_COVID_URL,
		active: false
	});
}
// Open the dashboard in its own tab.
function LaunchDashboard(tab) {
	chrome.webNavigation.getAllFrames({
		tabId: tab.id
	}, (framesInfo) => {
		for (frameInfo of framesInfo) {
			if (frameInfo.url.startsWith(BI_DASHBOARD_URL)) {
				chrome.tabs.create({
					url: frameInfo.url,
					active: true
				});
			}
		}
	});
}
// Send a message to the dashboard tab to start processing.
function ProcessDashboard(tab) {
	setStatus("running");
	console.log("background: processing dashboard with tab id (" + tab.id + ")");
	chrome.tabs.sendMessage(tab.id, {
		action: "process_dashboard"
	});
}
// Set the options in storage.
function setOptions(o) {
	console.log("background setting options: =>");
	console.log(o);
	chrome.storage.sync.set({
		options: o
	}, () => {
		console.log("options applied.");
	});
	action.updateIcon();
}
// Get the options from storage
function getOptions(callback) {
	chrome.storage.sync.get("options", callback);
}
// Updates the status of the plugin in storage.
function setStatus(s) {
	getOptions((o) => {
		o.options.status = s;
		setOptions(o.options);
	});
}
// Poll the tabs, if they are closed while running or launching, update the status of the plugin.
function pollTabs() {
	console.log("Background: polling tabs");
	// Get the options
	let options;
	getOptions((o) => {
		options = o.options;
		// Get the tabs
		let dashTab
		chrome.tabs.query({}, (tabs) => {
			dashTab = tabs.find(tab => (tab.url.startsWith(BI_DASHBOARD_URL) && tab.id == dashTabId));
			console.log("TotalTabs=" + tabs.length + " :: Status=" + options.status + " :: dashTabId=" + dashTabId + " foundTabWithId=" + (dashTab != null));
			// Verify the tabs are still open if the plugin is running.
			if (options.status == "running" && !dashTab) {
				setStatus("stopped");
			} else if (options.status != "stopped") {
				setTimeout(pollTabs, 1000);
			}
		});
	});
}