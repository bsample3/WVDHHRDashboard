const DHHR_COVID_URL = "https://dhhr.wv.gov/COVID-19/Pages/default.aspx";
const BI_DASHBOARD_URL = "https://app.powerbigov.us/"
const imageFormat = {
	SVG: "svg",
	PNG: "png",
	JPG: "jpg",
	BMP: "bmp"
}
var options, fileNameDate, files = [];
// Self executing function when loaded.
(() => {
	if (window.location.href == DHHR_COVID_URL) {
		// Check if the plugin should run automatically.
		getOptions().then((o) => {
			if (o.options.autorun && o.options.status == "stopped") {
				chrome.runtime.sendMessage({
					action: "run"
				});
			}
		});
	} else if (window.location.href.startsWith(BI_DASHBOARD_URL)) {
		// Listen for messages to process the dashboard
		chrome.extension.onMessage.addListener((msg, sender, sendResponse) => {
			if (msg.action === "process_dashboard") {
				getOptions().then((o) => {
					options = o.options;
					processDashboard();
				});
			}
		});
	}
})();
// Get the options from storage
function getOptions() {
	return new Promise(function(resolve, reject) {
		chrome.storage.sync.get("options", (o) => {
			resolve(o);
		});
	});
}

// Set the options in storage.
function setOptions(o) {
	chrome.storage.sync.set({
		options: o
	});
}
// Updates the status of the plugin in storage.
function setStatus(s) {
	getOptions().then((o) => {
		o.options.status = s;
		setOptions(o.options);
		chrome.runtime.sendMessage({
			action: 'updateIcon'
		});
	});
}
// Emulate clicking buttons within the dashboard.
function processDashboard() {
	getModifiedDate()
		.then(getCumulativePercentPositivity)
		.then(getCumulativeCases)
		.then(getCountyNumbers)
		.then(getTestNumbers)
		.then(getCaseNumbers)
		.then(getDailyCasesGraph)
		.then(getCountyAlertMap)
		.then(getRecoveredCasesGraph)
		.then(getDailyPercentPositivityGraph)
		.then(getCumulativePercentPositivityGraph)
		.then(downloadFiles)
		.then(stop);
}
// Get the date the data was updated.
function getModifiedDate(isRecursive) {
	return new Promise((resolve, reject) => {
		if (!isRecursive) console.log("getting the data modified date.");
		if (!Array.from(document.querySelectorAll("svg")).find(el => el.getAttribute("aria-label") && el.getAttribute("aria-label").includes("Earliest Today"))) {
			console.log("date not found");
			setTimeout(() => {
				getModifiedDate(true).then(resolve);
			}, 250);
		} else {
			var dateText = Array.from(document.querySelectorAll("svg")).find(el => el.getAttribute("aria-label") && el.getAttribute("aria-label").includes("Earliest Today")).querySelector("tspan").textContent;
			console.log("found date => " + dateText);
			var fileDate = new Date(dateText);
			fileNameDate = "" + fileDate.getFullYear() + pad(fileDate.getMonth() + 1, 2) + pad(fileDate.getDate(), 2);
			resolve();
		}
	});
}
function getCumulativePercentPositivity(isRecursive) {
	return new Promise((resolve, reject) => {
		if (!options.cumulativePercentPositivity) {
			resolve();
			return;
		}
		if (!isRecursive) console.log("getting cumulative percent positivity.");
		if (!Array.from(document.querySelectorAll("svg")).find(el => el.getAttribute("aria-label") && el.getAttribute("aria-label").includes("Cumulative % Positive"))) {
			console.log("cumulative percent positivity not found.");
			setTimeout(() => {
				getCumulativePercentPositivity(true).then(resolve);
			}, 250);
		} else {
			let value = Array.from(document.querySelectorAll("svg")).find(el => el.getAttribute("aria-label") && el.getAttribute("aria-label").includes("Cumulative % Positive")).querySelector("tspan").textContent.slice(0, -1);
			console.log("found cumulative percent positivity: " + value);
			convertToCsv([value]).then((csvContent) => { 
				files.push({ download: downloadFile("cumulative_percent_positivity_" + fileNameDate + ".csv"), content: csvContent }); 
			});
			resolve();
		}
	});
}
function getCumulativeCases(isRecursive) {
	return new Promise((resolve, reject) => {
		if (!options.cumulativeCases) {
			resolve();
			return;
		}
		if (!isRecursive) console.log("getting cumulative daily cases.");
		if (!Array.from(document.querySelectorAll("svg")).find(el => el.getAttribute("aria-label") && el.getAttribute("aria-label").includes("Daily Case "))) {
			console.log("cumulative daily cases not found.");
			setTimeout(() => {
				getCumulativeCases(true).then(resolve);
			}, 250);
		} else {
			let value = Array.from(document.querySelectorAll("svg")).find(el => el.getAttribute("aria-label") && el.getAttribute("aria-label").includes("Daily Case ")).querySelector("tspan").textContent.slice(0).replace(",", "");
			console.log("found daily cumulative cases: " + value);
			convertToCsv([value]).then((csvContent) => { 
				files.push({ download: downloadFile("cumulative_daily_cases_" + fileNameDate + ".csv"), content: csvContent }); 
			});
			resolve();
		}
	});
}
// Navigate to and get the county numbers.
function getCountyNumbers() {
	return new Promise((resolve, reject) => {
		if (!options.county) {
			resolve();
			return;
		}
		console.log("getting county numbers.");
		buttons.summary()
			.then(buttons.summaryTable)
			.then(scrollTo.half)
			.then(wait(250))
			.then(get.countyNumbers)
			.then(buttons.backToSummary).then(resolve);
	});
}
// Navigate to and retrieve confirmatory testing data		
function getTestNumbers() {
	return new Promise((resolve, reject) => {
		if (!options.tests) {
			resolve();
			return;
		}
		console.log("getting test numbers.");
		buttons.otherTrends()
			.then(wait(2000))
			.then(buttons.caseLabTrends)
			.then(wait(1000))
			.then(contextMenu.ConfirmatoryLabTests)
			.then(buttons.showAsTable)
			.then(buttons.switchToVerticalLayout)
			.then(scrollTo.bottom)
			.then(wait(250))
			.then(get.confirmatoryTests)
			.then(buttons.backToReport)
			.then(resolve);
	});
}
// Navigate to and retrieve cumulative case numbers
function getCaseNumbers() {
	return new Promise((resolve, reject) => {
		if (!options.cases) {
			resolve();
			return;
		}
		console.log("getting case numbers.");
		buttons.otherTrends()
			.then(wait(1000))
			.then(buttons.caseLabTrends)
			.then(wait(1000))
			.then(contextMenu.CumulativeCases)
			.then(buttons.showAsTable)
			.then(buttons.switchToVerticalLayout)
			.then(scrollTo.bottom)
			.then(wait(250))
			.then(get.cumulativeCases)
			.then(buttons.backToReport)
			.then(resolve);
	});
}
// Get the daily cases graph from the table view.
function getDailyCasesGraph() {
	return new Promise((resolve, reject) => {
		if (!options.casesGraph) {
			resolve();
			return;
		}
		console.log("getting daily cases graph.");
		buttons.otherTrends()
			.then(wait(1000))
			.then(buttons.caseLabTrends)
			.then(wait(1000))
			.then(get.dailyCasesGraph)
			.then(resolve);
	});
}
// Navigate to and retrieve the county alert map.
function getCountyAlertMap() {
	return new Promise((resolve, reject) => {
		if (!options.alert_map) {
			resolve();
			return;
		}
		console.log("getting county alert map.");
		buttons.countyAlertSystem()
			.then(wait(1000))
			.then(get.countyAlertMap)
			.then(resolve);
	});
}
// Navigate to and retrieve the recovered and active cases graph from the table view.
function getRecoveredCasesGraph() {
	return new Promise((resolve, reject) => {
		if (!options.recoveredCasesGraph) {
			resolve();
			return;
		}
		console.log("getting recovered and active cases graph.");
		buttons.otherTrends()
		.then(wait(1000))
		.then(buttons.otherTrendsTwo)
		.then(get.recoveredAndActiveCasesGraph)
		.then(resolve);
	});
}
// Navigate to and retrieve the daily percent positivity graph from the table view.
function getDailyPercentPositivityGraph() {
	return new Promise((resolve, reject) => {
		if (!options.dailyPercentPositiveGraph) {
			resolve();
			return;
		}
		console.log("getting daily percent positivity graph.");
		buttons.otherTrends()
		.then(wait(1000))
		.then(buttons.otherTrendsTwo)
		.then(get.dailyPercentPositiveGraph)
		.then(resolve);
	});
}
// Navigate to and retrieve the daily percent positivity graph from the table view.
function getCumulativePercentPositivityGraph() {
	return new Promise((resolve, reject) => {
		if (!options.cumulativePercentPositivityGraph) {
			resolve();
			return;
		}
		console.log("getting cumulative percent positivity graph.");
		buttons.otherTrends()
		.then(wait(1000))
		.then(buttons.otherTrendsTwo)
		.then(get.cumulativePercentPositivityGraph)
		.then(resolve);
	});
}

function downloadFiles() {
	return new Promise((resolve, reject) => {
		files.forEach((file) => { 
			file.download(file.content); 
		});
		resolve();
	});
}

function stop() {
	options.status = "stopped";
	setStatus("stopped");
}
let buttons = {
	summary: () => {
		return getNewButton("div.content.text", "Cumulative Summary").click();
	},
	backToSummary: () => {
		return getNewButton("div.content.text", "Back to Cumulative Summary").click();
	},
	caseLabTrends: () => {
		return getNewButton("div.content.text", "Case and Lab Trends").click();
	},
	otherTrends: () => {
		return getNewButton("div.content.text", "Other Trends").click();
	},
	otherTrendsTwo: () => {
		return getsecondOTButton("div.content.text", "Other Trends").click();
	},
	vaccineSummary: () => {
		return getNewButton("div.content.text", "Vaccine Summary").click();
	},
	summaryTable: () => {
		return getNewButton("div.content.text", "Click Here to View in Table Format").click();
	},
	backToReport: () => {
		return getButton("button > span", "Back to report").click();
	},
	countyAlertSystem: () => {
		return getNewButton("div.content.text", "County Alert").click();
	},
	showAsTable: () => {
		return getButton("h6", "Show as a table").click();
	},
	switchToVerticalLayout: () => {
		return getButton("button[aria-label='Switch to vertical layout'] > i").click();
	},
	fullyVaccinated: () => {
		return getButton("div[aria-label='People Fully Vaccinated'] > div > span").click();
	}
};

function getButton(selector, innerText, depth = 0) {
	var el = queryInnerTextSelector(document.querySelectorAll(selector), innerText);
	if (el.length > 0) {
		el[0].parentElement.click = () => {
			return new Promise((resolve, reject) => {
				simulateClick(el[0].parentElement);
				resolve();
			});
		};
	} else {
		depth++;
		console.log("getButton depth: " + depth);
		if (depth > 45) {
			console.log("couldn't find element: '" + selector + "' : '" + innerText + "'");
			return;
		}
		setTimeout(() => {
			getButton(selector, innerText, depth)
		}, 250);
	}
	return el[0].parentElement;
}
function getNewButton(selector, innerText, depth = 0) {
	var el = queryInnerTextSelector(document.querySelectorAll(selector), innerText);
	if (el.length > 0) {
		el[0].parentElement.parentElement.parentElement.parentElement.parentElement.querySelector("path.fill").click = () => {
			return new Promise((resolve, reject) => {
				simulateClick(el[0].parentElement.parentElement.parentElement.parentElement.parentElement.querySelector("path.fill"));
				resolve();
			});
		};
	} else {
		depth++;
		console.log("getButton depth: " + depth);
		if (depth > 45) {
			console.log("couldn't find element: '" + selector + "' : '" + innerText + "'");
			return;
		}
		setTimeout(() => {
			getButton(selector, innerText, depth)
		}, 250);
	}
	return el[0].parentElement.parentElement.parentElement.parentElement.parentElement.querySelector("path.fill");
}
function getsecondOTButton(selector, innerText, depth = 0) {
	var el = queryInnerTextSelector(document.querySelectorAll(selector), innerText);
	if (el.length > 0) {
		el[0].parentElement.parentElement.parentElement.parentElement.parentElement.querySelector("g > path.fill").click = () => {
			return new Promise((resolve, reject) => {
				simulateClick(el[1].parentElement.parentElement.parentElement.parentElement.parentElement.querySelector("g > path.fill"));
				resolve();
			});
		};
	} else {
		depth++;
		console.log("getButton depth: " + depth);
		if (depth > 30) {
			console.log("couldn't find element: '" + selector + "' : '" + innerText + "'");
			return;
		}
		setTimeout(() => {
			getButton(selector, innerText, depth)
		}, 250);
	}
	return el[0].parentElement.parentElement.parentElement.parentElement.parentElement.querySelector("g > path.fill");
}
let scrollTo = {
	half: () => {
		return scrollPosition(".tableExContainer > .tableEx > .innerContainer > .bodyCells", 4);
	},
	halfCases: () => {
		return scrollPosition("div.bodyCells", 4);
	},
	bottom: () => {
		return scrollPosition("div.bodyCells", 1);
	},
	bottomVaccine: () => {
		return scrollPosition(".pivotTable > .innerContainer > .bodyCells", 4);
	}
};
// scroll the to specified height of the selected element.
function scrollPosition(selector, position, depth = 0, oldHeight = 0) {
	return new Promise((resolve, reject) => {
		var el = document.querySelector(selector);
		var currentHeight;
		if (el) {
			currentHeight = el.scrollHeight;
			if (currentHeight == oldHeight) {
				console.log("scrolling [oldHeight= " + oldHeight + "] [currentHeight=" + currentHeight + "]");
				el.scrollTop = el.scrollHeight / position;
				resolve();
			} else {
				console.log("scrolling [oldHeight= " + oldHeight + "] [currentHeight=" + el.scrollHeight + "]");
				setTimeout(() => {
					scrollPosition(selector, position, 0, currentHeight).then(resolve);
				}, 500);
			}
		} else {
			depth++;
			console.log('scroll depth: ' + depth);
			if (depth > 10) {
				console.log("couldn't find element: '" + selector + "'");
				reject("couldn't find element: '" + selector + "'");
			}
			setTimeout(() => {
				scrollPosition(selector, position, depth).then(resolve);
			}, 250);
		}
	});
}
let get = {
	countyNumbers: () => {
		return getActiveData(7)
			.then(convertToCsv)
			.then((csvContent) => {
				files.push({ download: downloadFile("county_numbers_" + fileNameDate + ".csv"), content: csvContent }); 
			});
	},
	confirmatoryTests: () => {
		return getDataWithRowHeaders(3)
			.then(convertToCsv)
			.then((csvContent) => {
				files.push({ download: downloadFile("confirmatory_tests_" + fileNameDate + ".csv"), content: csvContent });
			});
	},
	countyAlertMap: () => {
		return getAlertMapFromSvg();
	},
	cumulativeCases: () => {
		return getDataWithRowHeaders(3)
			.then(convertToCsv)
			.then((csvContent) => {
				files.push({ download: downloadFile("cumulative_cases_" + fileNameDate + ".csv"), content: csvContent });
			});
	},
	cumulativePercentPositivityGraph: () => {
		return new Promise((resolve, reject) => {
			let node = document.querySelectorAll("div.visual.visual-lineChart.allow-deferred-rendering")[2];
			if (node && node.querySelector("path.line")) {
				DownloadAsImage(node, options.cumulativePercentPositivityGraphFormat, "cumulative_percent_positivity_graph_" + fileNameDate).then(resolve);
			} else {
				setTimeout(() => { get.cumulativePercentPositivityGraph().then(resolve); }, 250);
			}
		});
	},
	cumulativeVaccines: () => {
		return getVaccineDataWithRowHeaders(3)
			.then(convertToCsv)
			.then((csvContent) => {
				files.push({ download: downloadFile("cumulative_single_dose_vaccines_by_county_" + fileNameDate + ".csv"), content: csvContent });
			});
	},
	cumulativeFullVaccines: () => {
		return getVaccineDataWithRowHeaders(3)
			.then(convertToCsv)
			.then((csvContent) => {
				files.push({ download: downloadFile("cumulative_fully_vaxed_by_county_" + fileNameDate + ".csv"), content: csvContent });
			});
	},
	dailyCasesGraph: () => {
		return new Promise((resolve, reject) => {
			let node = document.querySelectorAll("div.visual.visual-areaChart.allow-deferred-rendering")[0];
			if (node && node.hasAttribute("initialized")) {
				DownloadAsImage(node, options.casesGraphFormat, "daily_cases_graph_" + fileNameDate).then(resolve);
			} else {
				setTimeout(() => { get.dailyCasesGraph().then(resolve); }, 250);
			}
		});
	},
	dailyPercentPositiveGraph: () => {
		return new Promise((resolve, reject) => {
			let node = document.querySelectorAll("div.visual.visual-lineChart.allow-deferred-rendering")[1];
			if (node && node.querySelector("path.line")) {
				DownloadAsImage(node, options.dailyPercentPositiveGraphFormat, "daily_percent_positivity_graph_" + fileNameDate).then(resolve);
			} else {
				setTimeout(() => { get.dailyPercentPositiveGraph().then(resolve); }, 250);
			}
		});
	},
	recoveredAndActiveCasesGraph: () => {
		return new Promise((resolve, reject) => {
			let node = document.querySelectorAll("div.visual.visual-lineChart.allow-deferred-rendering")[0];
			if (node && node.querySelector("path.line")) {
				DownloadAsImage(node, options.recoveredCasesGraphFormat, "recovered_and_active_cases_graph_" + fileNameDate).then(resolve);
			} else {
				setTimeout(() => { get.recoveredAndActiveCasesGraph().then(resolve); }, 250);
			}			
		});
	}
}

function wait(duration) {
	return () => {
		return new Promise((resolve, reject) => {
			setTimeout(resolve, duration);
		});
	}
}

function getActiveData(column_count) {
	console.log("getting active data.");
	return new Promise((resolve, reject) => {
		// Check if the elements are loaded.
		let el = document.querySelectorAll(".tableExContainer > .tableEx > .innerContainer > .columnHeaders div[title]")
		if (!el.length) {
			console.log("data not loaded.");
			setTimeout(() => {
				getActiveData(column_count).then(resolve)
			}, 250);
		} else {
			// Setup an multi-dimensional array and working variables to store the data.
			let data_arr = [];
			let i;
			for (i = 0; i < column_count; i++) {
				data_arr.push([]);
			}
			var base_row_index = 0;
			var curr_row_index = base_row_index;
			var col_index = 0;
			// Get the header values.
			document.querySelectorAll(".tableExContainer > .tableEx > .innerContainer > .columnHeaders div[title]").forEach(function(header) {
				var headerValue = header.getAttribute("title");
				data_arr[col_index][curr_row_index] = headerValue.replace(",", "");
				col_index++;
			});
			base_row_index++;
			// Parse the table and save data into array.	
			// The data is split into groups because of deferred rendering.
			// Iterate over the groups of data.
			document.querySelectorAll(".tableExContainer > .tableEx > .innerContainer > .bodyCells > div > div").forEach(function(group) {
				// Iterate over the columns.
				col_index = 0;
				var columns = [].slice.call(group.children);
				columns.forEach(function(col) {
					// Iterate over the cells in the column.
					curr_row_index = base_row_index;
					var cells = [].slice.call(col.children);
					cells.forEach(function(cell) {
						var cellValue = cell.getAttribute("Title");
						data_arr[col_index][curr_row_index] = cellValue.replace(",", "");
						console.info("[" + col_index + "]" + "][" + curr_row_index + "]" + " =" + data_arr[col_index][curr_row_index]);
						curr_row_index++;
					});
					col_index++;
				});
				base_row_index = curr_row_index;
			});
			resolve(data_arr);
		}
	});
}

function getDataWithRowHeaders(column_count, ) {
	return new Promise((resolve, reject) => {
		// Check if the elements are loaded.
		let el = document.querySelector("div.detailVisual div.corner > div > div")
		if (!el) {
			setTimeout(() => {
				getDataWithRowHeaders(column_count).then(resolve)
			}, 250);
		} else {
			// Setup a multi-dimensional array and working variables to store the data.
			let data_arr = [];
			let i;
			for (i = 0; i < column_count; i++) data_arr.push([]);
			let base_row_index = 0;
			let curr_row_index = base_row_index;
			let base_col_index = 0;
			let curr_col_index = base_col_index;
			// The first column is not a column, but rather row headers; must process differently than the other columns.
			data_arr[curr_col_index][curr_row_index++] = document.querySelector("div.detailVisual div.corner > div > div").textContent.trim();
			let row_headers = document.querySelectorAll("div.detailVisual div.rowHeaders > div > div");
			row_headers.forEach(function(header) {
				console.info("row header: " + header.textContent.trim());
				let cellValue = new Date(header.textContent.trim()).toLocaleDateString('en-US', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
				});
				data_arr[curr_col_index][curr_row_index++] = cellValue;
				console.info("[" + curr_col_index + "]" + "][" + (curr_row_index - 1) + "]" + " =" + data_arr[curr_col_index][curr_row_index - 1]);
			});
			base_col_index++;
			curr_col_index = base_col_index;
			curr_row_index = base_row_index;
			// Get the column header values.
			document.querySelectorAll("div.detailVisual div.columnHeaders > div > div").forEach(function(header) {
				let headerValue = header.textContent.trim();
				console.info("column header value: " + headerValue);
				data_arr[curr_col_index][curr_row_index] = headerValue
				curr_col_index++;
			});
			base_row_index++;
			max_row_index = data_arr[0].length - 1;
			// Parse the table and save data into array.	
			// The data is split into groups because of deferred rendering.
			// Iterate over the groups of data backwards.
			var groups = document.querySelectorAll("div.detailVisual div.bodyCells > div > div");
			for (var gi = groups.length - 1; gi >= 0; gi--) {
				// Iterate over the columns.
				curr_col_index = base_col_index;
				let columns = [].slice.call(groups[gi].children);
				columns.forEach(function(col) {
					// Iterate over the cells in the column.
					curr_row_index = max_row_index;
					let cells = [].slice.call(col.children);
					for (var ci = cells.length - 1; ci >= 0 && curr_row_index >= base_row_index; ci--) {
						let cellValue = cells[ci].textContent.trim();
						cellValue = cellValue.replace(",", "");
						data_arr[curr_col_index][curr_row_index] = cellValue.split(",").join("");
						console.info("[" + curr_col_index + "]" + "][" + curr_row_index + "]" + " =" + data_arr[curr_col_index][curr_row_index]);
						curr_row_index--;
					}
					curr_col_index++;
				});
				max_row_index = curr_row_index;
			}
			resolve(data_arr);
		}
	});
}
function getVaccineDataWithRowHeaders(column_count, ) {
	return new Promise((resolve, reject) => {
		// Check if the elements are loaded.
		let el = document.querySelector("div.detailVisual div.corner > div > div")
		if (!el) {
			setTimeout(() => {
				getDataWithRowHeaders(column_count).then(resolve)
			}, 250);
		} else {
			// Setup a multi-dimensional array and working variables to store the data.
			let data_arr = [];
			let i;
			for (i = 0; i < column_count; i++) data_arr.push([]);
			let base_row_index = 0;
			let curr_row_index = base_row_index;
			let base_col_index = 0;
			let curr_col_index = base_col_index;
			// The first column is not a column, but rather row headers; must process differently than the other columns.
			data_arr[curr_col_index][curr_row_index++] = document.querySelector("div.detailVisual div.corner > div > div").textContent.trim();
			let row_headers = document.querySelectorAll("div.detailVisual div.rowHeaders > div > div");
			row_headers.forEach(function(header) {
				console.info("row header: " + header.textContent.trim());
				let cellValue = new Date(header.textContent.trim()).toLocaleDateString('en-US', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
				});
				if (cellValue = "Invalid Date") {
					cellValue = header.textContent.trim();
				};
				data_arr[curr_col_index][curr_row_index++] = cellValue;
				console.info("[" + curr_col_index + "]" + "][" + (curr_row_index - 1) + "]" + " =" + data_arr[curr_col_index][curr_row_index - 1]);
			});
			base_col_index++;
			curr_col_index = base_col_index;
			curr_row_index = base_row_index;
			// Get the column header values.
			document.querySelectorAll("div.detailVisual div.columnHeaders > div > div").forEach(function(header) {
				let headerValue = header.textContent.trim();
				console.info("column header value: " + headerValue);
				data_arr[curr_col_index][curr_row_index] = headerValue.replace(",", "");
				curr_col_index++;
			});
			base_row_index++;
			max_row_index = data_arr[0].length - 1;
			// Parse the table and save data into array.	
			// The data is split into groups because of deferred rendering.
			// Iterate over the groups of data backwards.
			var groups = document.querySelectorAll("div.detailVisual div.bodyCells > div > div");
			for (var gi = groups.length - 1; gi >= 0; gi--) {
				// Iterate over the columns.
				curr_col_index = base_col_index;
				let columns = [].slice.call(groups[gi].children);
				columns.forEach(function(col) {
					// Iterate over the cells in the column.
					curr_row_index = max_row_index;
					let cells = [].slice.call(col.children);
					for (var ci = cells.length - 1; ci >= 0 && curr_row_index >= base_row_index; ci--) {
						let cellValue = cells[ci].textContent.trim();
						cellValue = cellValue.replace(",", "");
						data_arr[curr_col_index][curr_row_index] = cellValue.split(",").join("");
						console.info("[" + curr_col_index + "]" + "][" + curr_row_index + "]" + " =" + data_arr[curr_col_index][curr_row_index]);
						curr_row_index--;
					}
					curr_col_index++;
				});
				max_row_index = curr_row_index;
			}
			resolve(data_arr);
		}
	});
}
// Convert an array into CSV content  
function convertToCsv(arr) {
	return new Promise((resolve, reject) => {
		let csvContent = "data:text/csv;charset=utf-8,";
		transpose(arr).forEach((row_arr) => {
			let row = Array.isArray(row_arr) ? row_arr.join(",") : row_arr;
			csvContent += row + "\r\n";
		});
		return resolve(csvContent);
	});
}
// Tranpose a matrix
function transpose(matrix) {
	return (Array.isArray(matrix) && Array.isArray(matrix[0])) ? matrix[0].map((col, i) => matrix.map(row => row[i])) : matrix;
}
// Converts a DOM node into an image and downloads it.
function DownloadAsImage(node, format, filename) {
	return new Promise((resolve, reject) => {
		filename = filename + "." + format;
		if (node) {
			if (format == imageFormat.PNG) {
				domtoimage.toPng(node).then((dataUrl) => {
					files.push({ download: downloadFile(filename), content: dataUrl });
					resolve();
				});
			} else if (format == imageFormat.JPG) {
				domtoimage.toJpeg(node).then((dataUrl) => {
					files.push({ download: downloadFile(filename), content: dataUrl });
					resolve();
				});
			} else if (format == imageFormat.SVG) {
				domtoimage.toSvg(node).then((dataUrl) => {
					files.push({ download: downloadFile(filename), content: dataUrl });
					resolve();
				});
			} else if (format == imageFormat.BMP) {
				domtoimage.toBmp(node).then((dataUrl) => {
					files.push({ download: downloadFile(filename), content: dataUrl });
					resolve();
				});
			}
		}
	});
}
// Auto-download a file.
function downloadFile(file_name) {
	return (file_content) => {
		return new Promise((resolve, reject) => {
			console.log("DownloadFile(" + file_name + ")");
			var encodedUri = encodeURI(file_content);
			var a = document.createElement("a");
			a.setAttribute("href", encodedUri);
			a.style.display = 'hidden';
			a.setAttribute("download", file_name);
			a.innerHTML = "Click Here to download";
			document.body.appendChild(a); // Required for FF
			a.click();
			document.body.removeChild(a);
			resolve();
		});
	}
}
let contextMenu = {
	ConfirmatoryLabTests: () => {
		return openContextMenu(queryInnerTextSelector(document.querySelectorAll("title"), "Confirmatory Lab Test")[0].parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement);
	},
	CumulativeCases: () => {
		return openContextMenu(queryInnerTextSelector(document.querySelectorAll("title"), "Cases")[0].parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement);
	},
	DailyCases: () => {
		return openContextMenu(queryInnerTextSelector(document.querySelectorAll("div.visualTitle > div > div"), "Daily Cases")[0].parentElement.parentElement.parentElement.parentElement.parentElement);
	},
	DailyVaccinesAdministered: () => {
		return openContextMenu(document.querySelectorAll("div[aria-label='Shape map']")[0]);
	}
};
// Open the context menu for the PowerBi graphs
function openContextMenu(el) {
	return new Promise((resolve, reject) => {
		// Create event to trigger context menu
		var ev2 = new Event("contextmenu");
		// Add the x & y coordinates
		var offset = getOffset(el);
		ev2.pageX = offset.left;
		ev2.pageY = offset.top;
		// Fire event
		el.dispatchEvent(ev2);
		resolve();
	});
}
// Get the offset of an element.
function getOffset(el) {
	let rect = el.getBoundingClientRect();
	return {
		left: rect.left + window.scrollX,
		top: rect.top + window.scrollY
	};
}
// Searches a list of elements and return the ones that contain the search text.
function queryInnerTextSelector(items, searchText) {
	if (searchText) {
		var matches = [];
		for (var i = 0; i < items.length; i++) {
			if (items[i].textContent == searchText) {
				matches.push(items[i]);
			}
		}
		return matches;
	} else {
		return items;
	}
}
// Simulate a click event.
var simulateClick = (elem) => {
	// Create our event (with options)
	var evt = new MouseEvent('click', {
		bubbles: true,
		cancelable: true,
		view: window
	});
	// If cancelled, don't dispatch our event
	var canceled = !elem.dispatchEvent(evt);
};

function pad(num, size) {
	num = num.toString();
	while (num.length < size) num = "0" + num;
	return num;
}
// Get the SVG element (county map)
function getAlertMapFromSvg() {
	return new Promise((resolve, reject) => {
		// Add a white background; it is currently transparent which exports as black.
		let svg = document.querySelector("svg.shapeMap");
		svg.style.fill = "transparent";
		// Create an image element the dimensions of the SVG.
		let svgUrl = SvgToDataUrl(svg)
		let svgDimensions = svg.getBBox();
		let image = new Image(svgDimensions.width, svgDimensions.height);
		image.onload = () => {
			let canvas = document.createElement('canvas');
			canvas.width = image.width;
			canvas.height = image.height;
			let context = canvas.getContext('2d');
			context.drawImage(image, 0, 0, canvas.width, canvas.height);
			let dataUrl;
			switch (options.alert_map_format) {
				case imageFormat.JPG:
					dataUrl = canvas.toDataURL('image/jpg');
					break;
				case imageFormat.BMP:
					dataUrl = canvas.toDataURL('image/bmp');
					break;
				case imageFormat.SVG:
					dataUrl = svgUrl;
					break;
				default:
					dataUrl = canvas.toDataURL('image/png');
					break;
			}
			files.push({ download: downloadFile("county_map_" + fileNameDate + "." + options.alert_map_format), content: dataUrl });
			resolve();
		};
		image.src = svgUrl;
	});
}

function SvgToDataUrl(svgElement) {
	var serializer = new XMLSerializer();
	var source = serializer.serializeToString(svgElement);
	return "data:image/svg+xml;charset=utf-8, " + source;
}