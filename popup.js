var fields;
var actionBtn;
// When the page resources are loaded get the plugin options.
document.addEventListener('DOMContentLoaded', () => {
	getOptions(initPage);
});
// Intialize the page according to the saved options.
function initPage(init) {
	console.log("Initializing page: options =>");
	console.log(init.options);
	// Get the form fields.
	fields = [
		document.getElementById("autorun"),
		document.getElementById("county"),
		document.getElementById("tests"),
		document.getElementById("cases"),
		document.getElementById("cumulativePercentPositivity"),
		document.getElementById("cumulativeCases"),
		document.getElementById("alert_map"),
		document.getElementById("alert_map_format"),
		document.getElementById("casesGraph"),
		document.getElementById("casesGraphFormat"),
		document.getElementById("recoveredCasesGraph"),
		document.getElementById("recoveredCasesGraphFormat"),
		document.getElementById("dailyPercentPositiveGraph"),
		document.getElementById("dailyPercentPositiveGraphFormat"),
		document.getElementById("cumulativePercentPositivityGraph"),
		document.getElementById("cumulativePercentPositivityGraphFormat")
	];
	// Set the form field values and event handlers.
	fields.forEach((field) => {
		var initOption = init.options[field.id]
		if (field.tagName === "SELECT") {
			field.value = initOption;
		} else if (field.tagName === "INPUT" && field.type === "checkbox") {
			field.checked = initOption;
		}
		field.dataset.init = initOption;
		field.addEventListener("change", () => {
			fieldChange(field)
		});
	});
	// Render child fields.
	renderChildField("alert_map", "alert_map_format");
	renderChildField("casesGraph", "casesGraphFormat");
	renderChildField("recoveredCasesGraph", "recoveredCasesGraphFormat");
	renderChildField("dailyPercentPositiveGraph", "dailyPercentPositiveGraphFormat");
	renderChildField("cumulativePercentPositivityGraph", "cumulativePercentPositivityGraphFormat");
	// Get the action button and add an event handler.
	actionBtn = document.getElementById("action-btn");
	actionBtn.addEventListener("click", processAction);
	pollStatus();
	// Display the fields
	document.getElementById("loading").style.display = "none";
	document.getElementById("loaded").style.display = "block";
}
// If the options have been changed update the button action.
function fieldChange(field) {
	if (isDirty()) {
		actionBtn.innerText = "Save";
		actionBtn.value = "Save";
	} else {
		actionBtn.innerText = "Run";
		actionBtn.value = "Run";
	}
	// Toggle display of dependent child fields.
	if (field.id == "alert_map") {
		renderChildField("alert_map", "alert_map_format");
	} else if (field.id == "casesGraph") {
		renderChildField("casesGraph", "casesGraphFormat");
	} else if (field.id == "recoveredCasesGraph") {
		renderChildField("recoveredCasesGraph", "recoveredCasesGraphFormat");
	} else if (field.id == "dailyPercentPositiveGraph") {
		renderChildField("dailyPercentPositiveGraph", "dailyPercentPositiveGraphFormat");
	} else if (field.id == "cumulativePercentPositivityGraph") {
		renderChildField("cumulativePercentPositivityGraph", "cumulativePercentPositivityGraphFormat");
	}
}
// Renders the image format field, if the alert map is selected.
function renderChildField(parentSelector, childSelector) {
	let mapField = document.getElementById(parentSelector);
	let formatField = document.getElementById(childSelector);
	formatField.style.display = mapField.checked ? "inline" : "none";
}
// Check if any of the field options are different than the initial values.
function isDirty() {
	return typeof(fields.find((field) => {
		let val;
		if (field.tagName === "SELECT") {
			val = field.value.toString();
		} else if (field.tagName === "INPUT" && field.type === "checkbox") {
			val = field.checked.toString();
		}
		return field.dataset.init != val
	})) !== 'undefined';
}
// Determine if we are running the plugin or saving the options
function processAction() {
	switch (actionBtn.value) {
		case "Run":
			chrome.runtime.sendMessage({
				action: "run"
			});
			break;
		case "Save":
			SaveOptions();
			break;
		default:
			break;
	}
}
// Save the form options to storage
function SaveOptions() {
	disableForm(true)
	getOptions((o) => {
		o.options.autorun = fields.find(field => field.id == "autorun").checked;
		o.options.county = fields.find(field => field.id == "county").checked;
		o.options.tests = fields.find(field => field.id == "tests").checked;
		o.options.cases = fields.find(field => field.id == "cases").checked;
		o.options.cumulativePercentPositivity = fields.find(field => field.id == "cumulativePercentPositivity").checked;
		o.options.cumulativeCases = fields.find(field => field.id == "cumulativeCases").checked;
		o.options.alert_map = fields.find(field => field.id == "alert_map").checked;
		o.options.alert_map_format = fields.find(field => field.id == "alert_map_format").value;
		o.options.casesGraph = fields.find(field => field.id == "casesGraph").checked;
		o.options.casesGraphFormat = fields.find(field => field.id == "casesGraphFormat").value;
		o.options.recoveredCasesGraph = fields.find(field => field.id == "recoveredCasesGraph").checked;
		o.options.recoveredCasesGraphFormat = fields.find(field => field.id == "recoveredCasesGraphFormat").value;
		o.options.dailyPercentPositiveGraph = fields.find(field => field.id == "dailyPercentPositiveGraph").checked;
		o.options.dailyPercentPositiveGraphFormat = fields.find(field => field.id == "dailyPercentPositiveGraphFormat").value;
		o.options.cumulativePercentPositivityGraph = fields.find(field => field.id == "cumulativePercentPositivityGraph").checked;
		o.options.cumulativePercentPositivityGraphFormat = fields.find(field => field.id == "cumulativePercentPositivityGraphFormat").value;
		chrome.storage.sync.set({
			options: o.options
		}, () => {
			console.log("new setting applied.");
			location.reload();
		});
		chrome.runtime.sendMessage({
			action: 'updateIcon'
		});
	});
}
// Get the options from storage
function getOptions(callback) {
	chrome.storage.sync.get("options", callback);
}
// Poll the status of the plugin
function pollStatus() {
	getOptions((o) => {
		// If the plugin is running disable the form.
		disableForm(o.options.status != "stopped");
		setTimeout(pollStatus, 500);
	});
}
// Enables or Disables the form fields and buttons
function disableForm(val) {
	fields.forEach(field => field.disabled = val);
	actionBtn.disabled = val;
}